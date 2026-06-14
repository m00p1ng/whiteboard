# Real-Time Shape Creation Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create rectangles, ellipses, lines, and text with pointer gestures, show live previews for every creation tool, and preview pending connectors without writing drafts to editor history or persistence.

**Architecture:** Keep transient pointer state in `Canvas` and isolate deterministic coordinate/default-shape logic in a new `creationGeometry` utility. Render drafts through a non-interactive `CreationPreview` component. Migrate persisted circles to ellipse radii at board-store load time, then update rendering and geometry consumers to use `radiusX` and `radiusY`.

**Tech Stack:** React 19, TypeScript 6, Zustand 5, React-Konva/Konva 10, Vitest 4, Testing Library.

---

## File Structure

```text
src/
├── components/
│   ├── Canvas.tsx                         # Own pointer lifecycle, local drafts, cancellation, and commits
│   ├── Canvas.test.tsx                    # Exercise creation and connector workflows through a mocked Stage
│   ├── CreationPreview.tsx                # Render non-interactive dashed preview geometry
│   ├── CreationPreview.test.tsx           # Verify preview primitive props
│   ├── ShapeRenderer.tsx                  # Render and transform ellipses
│   └── ShapeRenderer.test.tsx             # Verify ellipse rendering and transformed radii
├── store/
│   ├── boardStore.ts                      # Normalize legacy circles while loading persisted boards
│   └── boardStore.test.ts                 # Cover legacy/default/already-migrated ellipse data
├── types/
│   └── shape.ts                           # Replace circle radius with radiusX/radiusY
└── utils/
    ├── creationGeometry.ts                # Convert pointers and derive draft/default shapes
    ├── creationGeometry.test.ts           # Cover normalization, defaults, threshold, and finite guards
    ├── geometry.ts                        # Use ellipse radii for bounds and connector anchors
    └── geometry.test.ts                   # Cover non-circular ellipse bounds and anchors
```

`Minimap.tsx` needs no direct change because it already draws the bounds returned
by `getShapeBounds`. Its ellipse behavior is covered through geometry tests and
the existing minimap contract.

### Task 1: Migrate the Circle Model to Ellipse Radii

**Files:**
- Modify: `src/types/shape.ts:25-28`
- Modify: `src/store/boardStore.ts:1-35`
- Modify: `src/store/boardStore.test.ts:61-76`
- Modify: `src/pages/BoardPage.test.tsx:74-81`
- Modify: `src/utils/geometry.test.ts:25-72`
- Modify: `src/utils/geometry.ts:33-39,98-109`

- [ ] **Step 1: Write failing persistence and geometry tests**

Add these cases to `src/store/boardStore.test.ts`:

```ts
it('normalizes legacy circle radii on load', async () => {
  localStorage.setItem(
    'whiteboard:boards',
    JSON.stringify([
      {
        id: 'legacy-board',
        name: 'Legacy',
        createdAt: 1,
        updatedAt: 2,
        shapes: {
          circle: {
            id: 'circle',
            type: 'circle',
            x: 20,
            y: 30,
            radius: 25,
          },
        },
      },
    ])
  );

  vi.resetModules();
  const { useBoardStore: fresh } = await import('./boardStore');

  expect(fresh.getState().boards[0].shapes.circle).toMatchObject({
    type: 'circle',
    radiusX: 25,
    radiusY: 25,
  });
  expect(fresh.getState().boards[0].shapes.circle).not.toHaveProperty('radius');
});

it('keeps migrated ellipse radii on load', async () => {
  localStorage.setItem(
    'whiteboard:boards',
    JSON.stringify([
      {
        id: 'ellipse-board',
        name: 'Ellipse',
        createdAt: 1,
        updatedAt: 2,
        shapes: {
          ellipse: {
            id: 'ellipse',
            type: 'circle',
            x: 20,
            y: 30,
            radiusX: 50,
            radiusY: 20,
          },
        },
      },
    ])
  );

  vi.resetModules();
  const { useBoardStore: fresh } = await import('./boardStore');

  expect(fresh.getState().boards[0].shapes.ellipse).toMatchObject({
    radiusX: 50,
    radiusY: 20,
  });
});

it('uses default radii for invalid persisted circles', async () => {
  localStorage.setItem(
    'whiteboard:boards',
    JSON.stringify([
      {
        id: 'invalid-board',
        name: 'Invalid',
        createdAt: 1,
        updatedAt: 2,
        shapes: {
          circle: {
            id: 'circle',
            type: 'circle',
            x: 20,
            y: 30,
            radius: null,
          },
        },
      },
    ])
  );

  vi.resetModules();
  const { useBoardStore: fresh } = await import('./boardStore');

  expect(fresh.getState().boards[0].shapes.circle).toMatchObject({
    radiusX: 40,
    radiusY: 40,
  });
});
```

Replace the circle cases in `src/utils/geometry.test.ts` with:

```ts
it('uses the matching ellipse radius for each anchor', () => {
  const ellipse: CircleShape = {
    id: 'ellipse',
    type: 'circle',
    x: 100,
    y: 80,
    radiusX: 30,
    radiusY: 15,
  };

  expect(getAnchorPoint(ellipse, 'top')).toEqual({ x: 100, y: 65 });
  expect(getAnchorPoint(ellipse, 'right')).toEqual({ x: 130, y: 80 });
  expect(getAnchorPoint(ellipse, 'bottom')).toEqual({ x: 100, y: 95 });
  expect(getAnchorPoint(ellipse, 'left')).toEqual({ x: 70, y: 80 });
});

it('returns ellipse bounds from its center and radii', () => {
  const shape: CircleShape = {
    id: 'ellipse',
    type: 'circle',
    x: 50,
    y: 70,
    radiusX: 30,
    radiusY: 20,
  };

  expect(getShapeBounds(shape)).toEqual({
    x: 20,
    y: 50,
    width: 60,
    height: 40,
  });
});
```

Update the circle fixture in `src/pages/BoardPage.test.tsx`:

```ts
useEditorStore.getState().addShape({
  id: 'new-shape',
  type: 'circle',
  x: 30,
  y: 40,
  radiusX: 20,
  radiusY: 20,
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```bash
rtk npm test -- src/store/boardStore.test.ts src/utils/geometry.test.ts src/pages/BoardPage.test.tsx
```

Expected: FAIL because `CircleShape` still requires `radius`, persisted circles
are returned unchanged, and geometry reads the old property.

- [ ] **Step 3: Implement the ellipse type and load-time normalization**

Replace `CircleShape` in `src/types/shape.ts`:

```ts
export interface CircleShape extends BaseShape {
  type: 'circle';
  radiusX: number;
  radiusY: number;
}
```

Add these helpers above `loadBoards` in `src/store/boardStore.ts`:

```ts
const DEFAULT_CIRCLE_RADIUS = 40;

function validRadius(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function normalizeShape(shape: unknown): Shape {
  const candidate = shape as Shape & {
    radius?: unknown;
    radiusX?: unknown;
    radiusY?: unknown;
  };

  if (candidate?.type !== 'circle') return candidate;

  const legacyRadius = validRadius(candidate.radius)
    ? candidate.radius
    : DEFAULT_CIRCLE_RADIUS;
  const radiusX = validRadius(candidate.radiusX)
    ? candidate.radiusX
    : legacyRadius;
  const radiusY = validRadius(candidate.radiusY)
    ? candidate.radiusY
    : legacyRadius;
  const normalized = { ...candidate, radiusX, radiusY };
  delete normalized.radius;

  return normalized as Shape;
}

function normalizeBoard(board: Board): Board {
  return {
    ...board,
    shapes: Object.fromEntries(
      Object.entries(board.shapes ?? {}).map(([id, shape]) => [
        id,
        normalizeShape(shape),
      ])
    ),
  };
}
```

Change the successful return in `loadBoards`:

```ts
return (parsed as Board[]).map(normalizeBoard);
```

Update the circle branches in `src/utils/geometry.ts`:

```ts
case 'circle':
  return {
    x: shape.x - shape.radiusX,
    y: shape.y - shape.radiusY,
    width: shape.radiusX * 2,
    height: shape.radiusY * 2,
  };
```

```ts
case 'circle':
  switch (anchor) {
    case 'top':
      return { x: shape.x, y: shape.y - shape.radiusY };
    case 'right':
      return { x: shape.x + shape.radiusX, y: shape.y };
    case 'bottom':
      return { x: shape.x, y: shape.y + shape.radiusY };
    case 'left':
      return { x: shape.x - shape.radiusX, y: shape.y };
    default:
      return { x: shape.x, y: shape.y };
  }
```

- [ ] **Step 4: Run the focused tests and type-check**

Run:

```bash
rtk npm test -- src/store/boardStore.test.ts src/utils/geometry.test.ts src/pages/BoardPage.test.tsx
rtk npm run build
```

Expected: focused tests PASS. Build still FAILS only at remaining production
uses of `radius` in `Canvas.tsx` and `ShapeRenderer.tsx`; those are handled in
the next task.

- [ ] **Step 5: Commit the model and migration**

```bash
rtk git add src/types/shape.ts src/store/boardStore.ts src/store/boardStore.test.ts src/utils/geometry.ts src/utils/geometry.test.ts src/pages/BoardPage.test.tsx
rtk git commit -m "feat: migrate circles to ellipse radii"
```

### Task 2: Render and Transform Ellipses

**Files:**
- Create: `src/components/ShapeRenderer.test.tsx`
- Modify: `src/components/ShapeRenderer.tsx:1-74`

- [ ] **Step 1: Write failing renderer tests**

Create `src/components/ShapeRenderer.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CircleShape } from '@/types/shape';
import { ShapeRenderer } from './ShapeRenderer';

vi.mock('react-konva', () => ({
  Rect: () => null,
  Circle: () => null,
  Line: () => null,
  Text: () => null,
  Ellipse: ({
    radiusX,
    radiusY,
    onTransformEnd,
  }: {
    radiusX: number;
    radiusY: number;
    onTransformEnd: (event: { target: unknown }) => void;
  }) => (
    <button
      type="button"
      aria-label="ellipse"
      data-radius-x={radiusX}
      data-radius-y={radiusY}
      onClick={() => {
        let scaleX = 2;
        let scaleY = 3;
        const scaleXAccessor = vi.fn((value?: number) => {
          if (value !== undefined) scaleX = value;
          return scaleX;
        });
        const scaleYAccessor = vi.fn((value?: number) => {
          if (value !== undefined) scaleY = value;
          return scaleY;
        });
        onTransformEnd({
          target: {
            x: () => 30,
            y: () => 40,
            rotation: () => 15,
            scaleX: scaleXAccessor,
            scaleY: scaleYAccessor,
          },
        });
      }}
    />
  ),
}));

vi.mock('./Connector', () => ({
  Connector: () => null,
}));

const ellipse: CircleShape = {
  id: 'ellipse',
  type: 'circle',
  x: 10,
  y: 20,
  radiusX: 25,
  radiusY: 10,
};

describe('ShapeRenderer ellipse', () => {
  it('renders independent ellipse radii', () => {
    render(
      <ShapeRenderer
        shape={ellipse}
        isSelected={false}
        onSelect={() => undefined}
      />
    );

    expect(screen.getByRole('button', { name: 'ellipse' })).toHaveAttribute(
      'data-radius-x',
      '25'
    );
    expect(screen.getByRole('button', { name: 'ellipse' })).toHaveAttribute(
      'data-radius-y',
      '10'
    );
  });

  it('stores each scaled radius after a transform', () => {
    const onChange = vi.fn();
    render(
      <ShapeRenderer
        shape={ellipse}
        isSelected
        onSelect={() => undefined}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'ellipse' }));

    expect(onChange).toHaveBeenCalledWith({
      x: 30,
      y: 40,
      rotation: 15,
      radiusX: 50,
      radiusY: 30,
    });
  });
});
```

- [ ] **Step 2: Run the renderer test and verify it fails**

Run:

```bash
rtk npm test -- src/components/ShapeRenderer.test.tsx
```

Expected: FAIL because `ShapeRenderer` imports `Circle`, not `Ellipse`, and
still computes one radius.

- [ ] **Step 3: Implement ellipse rendering and transform persistence**

Change the import and circle transform branch in `src/components/ShapeRenderer.tsx`:

```tsx
import { Rect, Ellipse, Line, Text } from 'react-konva';
```

```ts
...(shape.type === 'circle'
  ? {
      radiusX: shape.radiusX * node.scaleX(),
      radiusY: shape.radiusY * node.scaleY(),
    }
  : {}),
```

Replace the circle render case:

```tsx
case 'circle':
  return (
    <Ellipse
      {...common}
      radiusX={shape.radiusX}
      radiusY={shape.radiusY}
    />
  );
```

Remove the now-unused `Konva` import and `Konva.Circle` cast.

- [ ] **Step 4: Run the renderer test and build**

Run:

```bash
rtk npm test -- src/components/ShapeRenderer.test.tsx
rtk npm run build
```

Expected: renderer tests PASS. Build FAILS only at the old circle creation in
`Canvas.tsx`.

- [ ] **Step 5: Commit ellipse rendering**

```bash
rtk git add src/components/ShapeRenderer.tsx src/components/ShapeRenderer.test.tsx
rtk git commit -m "feat: render resizable ellipses"
```

### Task 3: Add Deterministic Creation Geometry

**Files:**
- Create: `src/utils/creationGeometry.ts`
- Create: `src/utils/creationGeometry.test.ts`

- [ ] **Step 1: Write failing geometry tests**

Create `src/utils/creationGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  createShapeFromGesture,
  isClickGesture,
  normalizeDragBounds,
  screenToWorld,
} from './creationGeometry';

describe('creation geometry', () => {
  it('converts screen coordinates through the viewport', () => {
    expect(
      screenToWorld(
        { x: 250, y: 170 },
        { scale: 2, offsetX: 50, offsetY: 10 }
      )
    ).toEqual({ x: 100, y: 80 });
  });

  it('normalizes a drag in any direction', () => {
    expect(normalizeDragBounds({ x: 90, y: 80 }, { x: 30, y: 20 })).toEqual({
      x: 30,
      y: 20,
      width: 60,
      height: 60,
    });
  });

  it('uses a five screen-pixel click threshold', () => {
    expect(isClickGesture({ x: 10, y: 10 }, { x: 13, y: 14 })).toBe(true);
    expect(isClickGesture({ x: 10, y: 10 }, { x: 16, y: 10 })).toBe(false);
  });

  it('creates a dragged rectangle', () => {
    expect(
      createShapeFromGesture({
        id: 'rect',
        tool: 'rect',
        startWorld: { x: 90, y: 80 },
        currentWorld: { x: 30, y: 20 },
        clicked: false,
      })
    ).toMatchObject({
      type: 'rect',
      x: 30,
      y: 20,
      width: 60,
      height: 60,
    });
  });

  it('creates a dragged ellipse from its bounding box', () => {
    expect(
      createShapeFromGesture({
        id: 'ellipse',
        tool: 'circle',
        startWorld: { x: 20, y: 30 },
        currentWorld: { x: 120, y: 70 },
        clicked: false,
      })
    ).toMatchObject({
      type: 'circle',
      x: 70,
      y: 50,
      radiusX: 50,
      radiusY: 20,
    });
  });

  it('creates a dragged line and fixed-position text', () => {
    expect(
      createShapeFromGesture({
        id: 'line',
        tool: 'line',
        startWorld: { x: 10, y: 20 },
        currentWorld: { x: 70, y: 90 },
        clicked: false,
      })
    ).toMatchObject({
      type: 'line',
      points: [10, 20, 70, 90],
    });

    expect(
      createShapeFromGesture({
        id: 'text',
        tool: 'text',
        startWorld: { x: 10, y: 20 },
        currentWorld: { x: 70, y: 90 },
        clicked: false,
      })
    ).toMatchObject({
      type: 'text',
      x: 10,
      y: 20,
      text: 'Text',
      fontSize: 18,
    });
  });

  it.each([
    ['rect', { width: 100, height: 60 }],
    ['circle', { radiusX: 40, radiusY: 40 }],
    ['line', { points: [10, 20, 90, 20] }],
    ['text', { text: 'Text', fontSize: 18 }],
  ] as const)('creates the default %s on click', (tool, expected) => {
    expect(
      createShapeFromGesture({
        id: tool,
        tool,
        startWorld: { x: 10, y: 20 },
        currentWorld: { x: 10, y: 20 },
        clicked: true,
      })
    ).toMatchObject(expected);
  });

  it('rejects non-finite coordinates', () => {
    expect(
      createShapeFromGesture({
        id: 'rect',
        tool: 'rect',
        startWorld: { x: Number.NaN, y: 0 },
        currentWorld: { x: 20, y: 20 },
        clicked: false,
      })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
rtk npm test -- src/utils/creationGeometry.test.ts
```

Expected: FAIL because `creationGeometry.ts` does not exist.

- [ ] **Step 3: Implement creation geometry**

Create `src/utils/creationGeometry.ts`:

```ts
import type { Tool } from '@/store/editorStore';
import type { Point, ViewportTransform } from './geometry';
import type { Shape } from '@/types/shape';

export type CreationTool = Extract<Tool, 'rect' | 'circle' | 'line' | 'text'>;

export interface ShapeDraft {
  tool: CreationTool;
  startWorld: Point;
  currentWorld: Point;
  startScreen: Point;
  currentScreen: Point;
}

interface CreateShapeInput {
  id: string;
  tool: CreationTool;
  startWorld: Point;
  currentWorld: Point;
  clicked: boolean;
}

const CLICK_THRESHOLD = 5;

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function screenToWorld(
  point: Point,
  viewport: ViewportTransform
): Point {
  return {
    x: (point.x - viewport.offsetX) / viewport.scale,
    y: (point.y - viewport.offsetY) / viewport.scale,
  };
}

export function normalizeDragBounds(start: Point, current: Point) {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };
}

export function isClickGesture(start: Point, current: Point): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) <= CLICK_THRESHOLD;
}

export function createShapeFromGesture({
  id,
  tool,
  startWorld,
  currentWorld,
  clicked,
}: CreateShapeInput): Shape | null {
  if (!isFinitePoint(startWorld) || !isFinitePoint(currentWorld)) return null;

  if (tool === 'rect') {
    if (clicked) {
      return {
        id,
        type: 'rect',
        x: startWorld.x,
        y: startWorld.y,
        width: 100,
        height: 60,
        fill: '#fff',
      };
    }
    return {
      id,
      type: 'rect',
      ...normalizeDragBounds(startWorld, currentWorld),
      fill: '#fff',
    };
  }

  if (tool === 'circle') {
    if (clicked) {
      return {
        id,
        type: 'circle',
        x: startWorld.x,
        y: startWorld.y,
        radiusX: 40,
        radiusY: 40,
        fill: '#fff',
      };
    }
    const bounds = normalizeDragBounds(startWorld, currentWorld);
    return {
      id,
      type: 'circle',
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      radiusX: bounds.width / 2,
      radiusY: bounds.height / 2,
      fill: '#fff',
    };
  }

  if (tool === 'line') {
    return {
      id,
      type: 'line',
      x: 0,
      y: 0,
      points: clicked
        ? [startWorld.x, startWorld.y, startWorld.x + 80, startWorld.y]
        : [startWorld.x, startWorld.y, currentWorld.x, currentWorld.y],
    };
  }

  return {
    id,
    type: 'text',
    x: startWorld.x,
    y: startWorld.y,
    text: 'Text',
    fontSize: 18,
  };
}
```

- [ ] **Step 4: Run the utility tests**

Run:

```bash
rtk npm test -- src/utils/creationGeometry.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the creation geometry**

```bash
rtk git add src/utils/creationGeometry.ts src/utils/creationGeometry.test.ts
rtk git commit -m "feat: add shape creation geometry"
```

### Task 4: Render Non-Interactive Creation Previews

**Files:**
- Create: `src/components/CreationPreview.tsx`
- Create: `src/components/CreationPreview.test.tsx`

- [ ] **Step 1: Write failing preview tests**

Create `src/components/CreationPreview.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CreationPreview } from './CreationPreview';

vi.mock('react-konva', () => ({
  Rect: (props: Record<string, unknown>) => (
    <div data-testid="preview-rect" data-props={JSON.stringify(props)} />
  ),
  Ellipse: (props: Record<string, unknown>) => (
    <div data-testid="preview-ellipse" data-props={JSON.stringify(props)} />
  ),
  Line: (props: Record<string, unknown>) => (
    <div data-testid="preview-line" data-props={JSON.stringify(props)} />
  ),
  Text: (props: Record<string, unknown>) => (
    <div data-testid="preview-text" data-props={JSON.stringify(props)} />
  ),
  Circle: (props: Record<string, unknown>) => (
    <div data-testid="preview-endpoint" data-props={JSON.stringify(props)} />
  ),
}));

describe('CreationPreview', () => {
  it('renders a dashed translucent rectangle without listening', () => {
    render(
      <CreationPreview
        shape={{
          id: 'preview',
          type: 'rect',
          x: 10,
          y: 20,
          width: 80,
          height: 50,
        }}
      />
    );

    const props = JSON.parse(
      screen.getByTestId('preview-rect').getAttribute('data-props')!
    );
    expect(props).toMatchObject({
      x: 10,
      y: 20,
      width: 80,
      height: 50,
      stroke: '#2563eb',
      fill: 'rgba(37, 99, 235, 0.15)',
      listening: false,
    });
    expect(props.dash).toEqual([8, 6]);
  });

  it('renders ellipse radii and line endpoints', () => {
    const { rerender } = render(
      <CreationPreview
        shape={{
          id: 'preview',
          type: 'circle',
          x: 50,
          y: 40,
          radiusX: 30,
          radiusY: 10,
        }}
      />
    );
    expect(screen.getByTestId('preview-ellipse')).toBeInTheDocument();

    rerender(
      <CreationPreview
        shape={{
          id: 'preview',
          type: 'line',
          x: 0,
          y: 0,
          points: [10, 20, 80, 90],
        }}
      />
    );
    expect(screen.getByTestId('preview-line')).toBeInTheDocument();
    expect(screen.getAllByTestId('preview-endpoint')).toHaveLength(2);
  });

  it('renders a pending connector path', () => {
    render(
      <CreationPreview
        connectorPoints={[10, 20, 80, 90]}
      />
    );

    const props = JSON.parse(
      screen.getByTestId('preview-line').getAttribute('data-props')!
    );
    expect(props).toMatchObject({
      points: [10, 20, 80, 90],
      stroke: '#2563eb',
      listening: false,
    });
  });
});
```

- [ ] **Step 2: Run the preview tests and verify they fail**

Run:

```bash
rtk npm test -- src/components/CreationPreview.test.tsx
```

Expected: FAIL because `CreationPreview.tsx` does not exist.

- [ ] **Step 3: Implement the preview component**

Create `src/components/CreationPreview.tsx`:

```tsx
import { Circle, Ellipse, Line, Rect, Text } from 'react-konva';
import type { Shape } from '@/types/shape';

interface CreationPreviewProps {
  shape?: Shape | null;
  connectorPoints?: [number, number, number, number] | null;
}

const common = {
  stroke: '#2563eb',
  strokeWidth: 2,
  dash: [8, 6],
  listening: false,
};

function PreviewEndpoints({
  points,
}: {
  points: [number, number, number, number];
}) {
  return (
    <>
      <Circle
        x={points[0]}
        y={points[1]}
        radius={4}
        fill="#2563eb"
        listening={false}
      />
      <Circle
        x={points[2]}
        y={points[3]}
        radius={4}
        fill="#fff"
        stroke="#2563eb"
        strokeWidth={2}
        listening={false}
      />
    </>
  );
}

export function CreationPreview({
  shape,
  connectorPoints,
}: CreationPreviewProps) {
  if (connectorPoints) {
    return (
      <>
        <Line {...common} points={connectorPoints} />
        <PreviewEndpoints points={connectorPoints} />
      </>
    );
  }

  if (!shape) return null;

  switch (shape.type) {
    case 'rect':
      return (
        <Rect
          {...common}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill="rgba(37, 99, 235, 0.15)"
        />
      );
    case 'circle':
      return (
        <Ellipse
          {...common}
          x={shape.x}
          y={shape.y}
          radiusX={shape.radiusX}
          radiusY={shape.radiusY}
          fill="rgba(37, 99, 235, 0.15)"
        />
      );
    case 'line':
      return (
        <>
          <Line {...common} points={shape.points} />
          <PreviewEndpoints points={shape.points} />
        </>
      );
    case 'text':
      return (
        <Text
          {...common}
          x={shape.x}
          y={shape.y}
          text={shape.text}
          fontSize={shape.fontSize}
          fill="#2563eb"
        />
      );
    default:
      return null;
  }
}
```

- [ ] **Step 4: Run the preview tests**

Run:

```bash
rtk npm test -- src/components/CreationPreview.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit preview rendering**

```bash
rtk git add src/components/CreationPreview.tsx src/components/CreationPreview.test.tsx
rtk git commit -m "feat: render live creation previews"
```

### Task 5: Replace Click Creation with Pointer Gestures

**Files:**
- Modify: `src/components/Canvas.tsx:1-184`
- Modify: `src/components/Canvas.test.tsx:1-140`

- [ ] **Step 1: Replace the Stage mock with pointer-event support**

In `src/components/Canvas.test.tsx`, extend `konvaMock` and replace the `Stage`
mock:

```tsx
const konvaMock = vi.hoisted(() => ({
  pointer: { x: 120, y: 80 },
  shapeSelect: null as null | ((id: string) => void),
}));

vi.mock('react-konva', () => ({
  Stage: ({
    children,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  }: PropsWithChildren<{
    onPointerDown: (event: { target: unknown; evt: PointerEvent }) => void;
    onPointerMove: (event: { target: unknown; evt: PointerEvent }) => void;
    onPointerUp: (event: { target: unknown; evt: PointerEvent }) => void;
    onPointerCancel: (event: { target: unknown; evt: PointerEvent }) => void;
  }>) => {
    const container = {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      hasPointerCapture: () => true,
    };
    const stage = {
      getStage: () => stage,
      getPointerPosition: () => konvaMock.pointer,
      container: () => container,
    };
    const event = () => ({
      target: stage,
      evt: { pointerId: 1 } as PointerEvent,
    });

    return (
      <div>
        <button
          type="button"
          aria-label="pointer down"
          onClick={() => onPointerDown(event())}
        />
        <button
          type="button"
          aria-label="pointer move"
          onClick={() => onPointerMove(event())}
        />
        <button
          type="button"
          aria-label="pointer up"
          onClick={() => onPointerUp(event())}
        />
        <button
          type="button"
          aria-label="pointer cancel"
          onClick={() => onPointerCancel(event())}
        />
        {children}
      </div>
    );
  },
  Layer: ({ children }: PropsWithChildren) => <>{children}</>,
  Transformer: () => <div data-testid="selection-transformer" />,
}));

vi.mock('./ShapeRenderer', () => ({
  ShapeRenderer: ({
    shape,
    onSelect,
  }: {
    shape: { id: string };
    onSelect: () => void;
  }) => (
    <button
      type="button"
      data-testid={`shape-${shape.id}`}
      onClick={onSelect}
    />
  ),
}));

vi.mock('./CreationPreview', () => ({
  CreationPreview: ({
    shape,
    connectorPoints,
  }: {
    shape?: { type: string; [key: string]: unknown } | null;
    connectorPoints?: number[] | null;
  }) => (
    <div
      data-testid="creation-preview"
      data-shape={shape ? JSON.stringify(shape) : ''}
      data-connector={connectorPoints ? JSON.stringify(connectorPoints) : ''}
    />
  ),
}));
```

- [ ] **Step 2: Write failing gesture and cancellation tests**

Replace the current creation tests in `src/components/Canvas.test.tsx` with:

```tsx
function gesture(
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  konvaMock.pointer = start;
  fireEvent.click(screen.getByRole('button', { name: 'pointer down' }));
  konvaMock.pointer = end;
  fireEvent.click(screen.getByRole('button', { name: 'pointer move' }));
}

it.each([
  [
    'rect',
    { x: 20, y: 30 },
    { x: 120, y: 90 },
    { type: 'rect', x: 20, y: 30, width: 100, height: 60 },
  ],
  [
    'circle',
    { x: 20, y: 30 },
    { x: 120, y: 70 },
    { type: 'circle', x: 70, y: 50, radiusX: 50, radiusY: 20 },
  ],
  [
    'line',
    { x: 20, y: 30 },
    { x: 120, y: 70 },
    { type: 'line', points: [20, 30, 120, 70] },
  ],
] as const)(
  'previews and commits a dragged %s once',
  (tool, start, end, expected) => {
    useEditorStore.getState().setTool(tool);
    render(<Canvas />);

    gesture(start, end);

    const preview = JSON.parse(
      screen.getByTestId('creation-preview').getAttribute('data-shape')!
    );
    expect(preview).toMatchObject(expected);
    expect(useEditorStore.getState().shapes).toEqual({
      existing: existingShape,
    });
    expect(useEditorStore.getState().selectedId).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'pointer up' }));

    const state = useEditorStore.getState();
    expect(state.shapes['00000000-0000-4000-8000-000000000001'])
      .toMatchObject(expected);
    expect(state.undoStack).toHaveLength(1);
    expect(state.selectedId).toBe('00000000-0000-4000-8000-000000000001');
    expect(state.tool).toBe('select');
  }
);

it('places text at the drag start without sizing it', () => {
  useEditorStore.getState().setTool('text');
  render(<Canvas />);

  gesture({ x: 20, y: 30 }, { x: 120, y: 90 });
  fireEvent.click(screen.getByRole('button', { name: 'pointer up' }));

  expect(
    useEditorStore.getState().shapes[
      '00000000-0000-4000-8000-000000000001'
    ]
  ).toMatchObject({
    type: 'text',
    x: 20,
    y: 30,
    text: 'Text',
    fontSize: 18,
  });
});

it.each([
  ['rect', { width: 100, height: 60 }],
  ['circle', { radiusX: 40, radiusY: 40 }],
  ['line', { points: [20, 30, 100, 30] }],
  ['text', { text: 'Text', fontSize: 18 }],
] as const)('creates the default %s for a click gesture', (tool, expected) => {
  useEditorStore.getState().setTool(tool);
  render(<Canvas />);

  gesture({ x: 20, y: 30 }, { x: 23, y: 34 });
  fireEvent.click(screen.getByRole('button', { name: 'pointer up' }));

  expect(
    useEditorStore.getState().shapes[
      '00000000-0000-4000-8000-000000000001'
    ]
  ).toMatchObject(expected);
});

it('converts preview and committed coordinates through the viewport', () => {
  useEditorStore.setState({
    tool: 'rect',
    viewport: { scale: 2, offsetX: 40, offsetY: 20 },
  });
  render(<Canvas />);

  gesture({ x: 60, y: 40 }, { x: 260, y: 160 });
  fireEvent.click(screen.getByRole('button', { name: 'pointer up' }));

  expect(
    useEditorStore.getState().shapes[
      '00000000-0000-4000-8000-000000000001'
    ]
  ).toMatchObject({
    x: 10,
    y: 10,
    width: 100,
    height: 60,
  });
});

it('cancels a draft with Escape and keeps the tool active', () => {
  useEditorStore.getState().setTool('rect');
  render(<Canvas />);

  gesture({ x: 20, y: 30 }, { x: 120, y: 90 });
  fireEvent.keyDown(window, { key: 'Escape' });

  expect(
    screen.getByTestId('creation-preview').getAttribute('data-shape')
  ).toBe('');
  expect(useEditorStore.getState().tool).toBe('rect');
  expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['existing']);
});

it('cancels a draft on pointer cancellation', () => {
  useEditorStore.getState().setTool('line');
  render(<Canvas />);

  gesture({ x: 20, y: 30 }, { x: 120, y: 90 });
  fireEvent.click(screen.getByRole('button', { name: 'pointer cancel' }));

  expect(
    screen.getByTestId('creation-preview').getAttribute('data-shape')
  ).toBe('');
  expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['existing']);
});

it('clears a draft when the active tool changes', () => {
  useEditorStore.getState().setTool('rect');
  render(<Canvas />);
  gesture({ x: 20, y: 30 }, { x: 120, y: 90 });

  useEditorStore.getState().setTool('line');

  expect(
    screen.getByTestId('creation-preview').getAttribute('data-shape')
  ).toBe('');
});
```

- [ ] **Step 3: Run the Canvas tests and verify they fail**

Run:

```bash
rtk npm test -- src/components/Canvas.test.tsx
```

Expected: FAIL because Canvas still uses click creation and has no
`CreationPreview`.

- [ ] **Step 4: Implement pointer-driven shape drafts in Canvas**

Update the imports in `src/components/Canvas.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Point } from '@/utils/geometry';
import {
  createShapeFromGesture,
  isClickGesture,
  screenToWorld,
  type CreationTool,
  type ShapeDraft,
} from '@/utils/creationGeometry';
import { CreationPreview } from './CreationPreview';
```

Replace `lineStart` with:

```ts
const [shapeDraft, setShapeDraft] = useState<ShapeDraft | null>(null);
const draftToolRef = useRef<CreationTool | null>(null);
```

Add these helpers:

```ts
const isCreationTool = (value: typeof tool): value is CreationTool =>
  value === 'rect' ||
  value === 'circle' ||
  value === 'line' ||
  value === 'text';

const getScreenPointer = (stage: StageType): Point | null => {
  const pointer = stage.getPointerPosition();
  return pointer ? { x: pointer.x, y: pointer.y } : null;
};

const clearShapeDraft = () => {
  setShapeDraft(null);
  draftToolRef.current = null;
};
```

Add draft cleanup:

```ts
useEffect(() => {
  if (shapeDraft && tool !== draftToolRef.current) {
    setShapeDraft(null);
    draftToolRef.current = null;
  }
}, [tool, shapeDraft]);
```

Extend the keyboard effect's keydown handler:

```ts
if (e.key === 'Escape') {
  setShapeDraft(null);
  draftToolRef.current = null;
  setConnectorSource(null);
  setSelectedId(null);
}
```

Keep `setSelectedId` in that keyboard effect's dependency array.

Replace `handleStageClick` with pointer handlers:

```ts
const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
  const stage = e.target.getStage();
  if (
    !stage ||
    e.target !== stage ||
    !isCreationTool(tool) ||
    spacePressed
  ) {
    return;
  }
  const screen = getScreenPointer(stage);
  if (!screen) return;
  const world = screenToWorld(screen, viewport);
  if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) return;

  setSelectedId(null);
  draftToolRef.current = tool;
  setShapeDraft({
    tool,
    startWorld: world,
    currentWorld: world,
    startScreen: screen,
    currentScreen: screen,
  });
  stage.container().setPointerCapture(e.evt.pointerId);
};

const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
  const stage = e.target.getStage();
  if (!stage) return;
  const screen = getScreenPointer(stage);
  if (!screen) return;
  const world = screenToWorld(screen, viewport);

  if (shapeDraft) {
    setShapeDraft((draft) =>
      draft
        ? { ...draft, currentWorld: world, currentScreen: screen }
        : null
    );
  }
};

const handlePointerUp = (e: KonvaEventObject<PointerEvent>) => {
  const stage = e.target.getStage();
  if (!stage || !shapeDraft) return;
  const screen = getScreenPointer(stage) ?? shapeDraft.currentScreen;
  const world = screenToWorld(screen, viewport);
  const container = stage.container();
  if (container.hasPointerCapture(e.evt.pointerId)) {
    container.releasePointerCapture(e.evt.pointerId);
  }

  const shape = createShapeFromGesture({
    id: crypto.randomUUID(),
    tool: shapeDraft.tool,
    startWorld: shapeDraft.startWorld,
    currentWorld: world,
    clicked: isClickGesture(
      shapeDraft.startScreen,
      screen
    ),
  });
  clearShapeDraft();
  if (!shape) return;

  addShape(shape);
  setSelectedId(shape.id);
  setTool('select');
};

const handlePointerCancel = (e: KonvaEventObject<PointerEvent>) => {
  const stage = e.target.getStage();
  if (stage?.container().hasPointerCapture(e.evt.pointerId)) {
    stage.container().releasePointerCapture(e.evt.pointerId);
  }
  clearShapeDraft();
};
```

Derive the preview shape without committing:

```ts
const previewShape = useMemo(() => {
  if (!shapeDraft) return null;
  return createShapeFromGesture({
    id: 'creation-preview',
    tool: shapeDraft.tool,
    startWorld: shapeDraft.startWorld,
    currentWorld: shapeDraft.currentWorld,
    clicked: false,
  });
}, [shapeDraft]);
```

Change Stage props:

```tsx
draggable={(tool === 'select' || spacePressed) && !shapeDraft}
onPointerDown={handlePointerDown}
onPointerMove={handlePointerMove}
onPointerUp={handlePointerUp}
onPointerCancel={handlePointerCancel}
```

Remove `onClick={handleStageClick}` and render before the transformer:

```tsx
<CreationPreview shape={previewShape} />
<SelectionTransformer selectedShape={selectedShape} />
```

- [ ] **Step 5: Run Canvas tests and build**

Run:

```bash
rtk npm test -- src/components/Canvas.test.tsx
rtk npm run build
```

Expected: Canvas tests PASS and build PASS.

- [ ] **Step 6: Commit pointer-driven shape creation**

```bash
rtk git add src/components/Canvas.tsx src/components/Canvas.test.tsx
rtk git commit -m "feat: create shapes with pointer drags"
```

### Task 6: Add Live Connector Preview and Complete Cancellation

**Files:**
- Modify: `src/components/Canvas.tsx`
- Modify: `src/components/Canvas.test.tsx`

- [ ] **Step 1: Write failing connector preview tests**

Add to `src/components/Canvas.test.tsx`:

```tsx
it('previews a connector from the source center to the pointer', () => {
  useEditorStore.getState().setTool('connector');
  render(<Canvas />);

  fireEvent.click(screen.getByTestId('shape-existing'));
  konvaMock.pointer = { x: 200, y: 150 };
  fireEvent.click(screen.getByRole('button', { name: 'pointer move' }));

  expect(
    JSON.parse(
      screen.getByTestId('creation-preview').getAttribute('data-connector')!
    )
  ).toEqual([60, 50, 200, 150]);
  expect(useEditorStore.getState().tool).toBe('connector');
});

it('commits a connector only to a different existing shape', () => {
  useEditorStore.setState({
    shapes: {
      existing: existingShape,
      target: {
        id: 'target',
        type: 'circle',
        x: 200,
        y: 150,
        radiusX: 30,
        radiusY: 20,
      },
    },
  });
  useEditorStore.getState().setTool('connector');
  render(<Canvas />);

  fireEvent.click(screen.getByTestId('shape-existing'));
  fireEvent.click(screen.getByTestId('shape-existing'));
  expect(Object.keys(useEditorStore.getState().shapes)).toHaveLength(2);

  fireEvent.click(screen.getByTestId('shape-target'));
  expect(
    useEditorStore.getState().shapes[
      '00000000-0000-4000-8000-000000000001'
    ]
  ).toMatchObject({
    type: 'connector',
    fromId: 'existing',
    toId: 'target',
  });
});

it('keeps a connector pending after an empty-stage click', () => {
  useEditorStore.getState().setTool('connector');
  render(<Canvas />);

  fireEvent.click(screen.getByTestId('shape-existing'));
  konvaMock.pointer = { x: 200, y: 150 };
  fireEvent.click(screen.getByRole('button', { name: 'pointer down' }));
  fireEvent.click(screen.getByRole('button', { name: 'pointer move' }));

  expect(
    screen.getByTestId('creation-preview').getAttribute('data-connector')
  ).not.toBe('');
});

it('cancels a pending connector with Escape and preserves the tool', () => {
  useEditorStore.getState().setTool('connector');
  render(<Canvas />);

  fireEvent.click(screen.getByTestId('shape-existing'));
  konvaMock.pointer = { x: 200, y: 150 };
  fireEvent.click(screen.getByRole('button', { name: 'pointer move' }));
  fireEvent.keyDown(window, { key: 'Escape' });

  expect(
    screen.getByTestId('creation-preview').getAttribute('data-connector')
  ).toBe('');
  expect(useEditorStore.getState().tool).toBe('connector');
  expect(useEditorStore.getState().selectedId).toBeNull();
});
```

- [ ] **Step 2: Run connector tests and verify they fail**

Run:

```bash
rtk npm test -- src/components/Canvas.test.tsx
```

Expected: FAIL because Canvas does not store a connector pointer or pass
connector points to `CreationPreview`.

- [ ] **Step 3: Implement connector pointer state and preview**

Add state:

```ts
const [connectorPointer, setConnectorPointer] = useState<Point | null>(null);
```

Extend `handlePointerMove` after screen/world conversion:

```ts
if (tool === 'connector' && connectorSource) {
  setConnectorPointer(world);
}
```

Clear connector state together:

```ts
const clearConnectorDraft = () => {
  setConnectorSource(null);
  setConnectorPointer(null);
  setSelectedId(null);
};
```

Use `clearConnectorDraft()` in the Escape branch and after connector commit.
Keep an empty-stage pointer-down inert for the Connector tool.

Update `handleShapeClick`:

```ts
if (tool === 'connector') {
  if (!shapes[shapeId]) return;
  if (!connectorSource) {
    setConnectorSource(shapeId);
    setConnectorPointer(getAnchorPoint(shapes[shapeId], 'center'));
    setSelectedId(shapeId);
    return;
  }
  if (connectorSource === shapeId) return;

  addShape({
    id: crypto.randomUUID(),
    type: 'connector',
    x: 0,
    y: 0,
    fromId: connectorSource,
    toId: shapeId,
  });
  clearConnectorDraft();
  return;
}
```

Import `getAnchorPoint` and derive connector points:

```ts
const connectorPoints = useMemo(() => {
  if (!connectorSource || !connectorPointer) return null;
  const source = shapes[connectorSource];
  if (!source) return null;
  const start = getAnchorPoint(source, 'center');
  return [
    start.x,
    start.y,
    connectorPointer.x,
    connectorPointer.y,
  ] as [number, number, number, number];
}, [connectorPointer, connectorSource, shapes]);
```

Pass both previews:

```tsx
<CreationPreview
  shape={previewShape}
  connectorPoints={connectorPoints}
/>
```

Add tool-change cleanup that does not affect normal selection:

```ts
useEffect(() => {
  if (tool !== 'connector' && connectorSource) {
    setConnectorSource(null);
    setConnectorPointer(null);
    setSelectedId(null);
  }
}, [connectorSource, setSelectedId, tool]);
```

- [ ] **Step 4: Run Canvas tests**

Run:

```bash
rtk npm test -- src/components/Canvas.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit connector preview behavior**

```bash
rtk git add src/components/Canvas.tsx src/components/Canvas.test.tsx
rtk git commit -m "feat: preview pending connectors"
```

### Task 7: Full Verification and Browser Interaction Check

**Files:**
- Modify only files required by failures found in this task

- [ ] **Step 1: Run the complete automated test suite**

Run:

```bash
rtk npm test
```

Expected: all Vitest tests PASS.

- [ ] **Step 2: Run lint and production build**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Expected: both commands exit successfully with no TypeScript or ESLint errors.

- [ ] **Step 3: Start the app and verify interactions in the in-app browser**

Run:

```bash
rtk npm run dev -- --host 127.0.0.1
```

Use the Browser plugin to open the printed localhost URL and verify:

1. Dragging each Rectangle, Circle, and Line shows the dashed blue preview and
   commits matching geometry on release.
2. Dragging Text shows a preview at the start and commits the fixed label there.
3. Clicking without dragging creates the documented defaults.
4. Dragging left/up creates positive rectangle and ellipse dimensions.
5. Starting creation while another shape is selected immediately begins the
   new shape.
6. Escape cancels shape and connector drafts while preserving the tool.
7. Connector preview follows the pointer from the source center and commits on
   a different target.
8. Pan/zoom does not offset preview geometry from the committed result.
9. Reloading a board preserves non-circular ellipses.

- [ ] **Step 4: Run a final clean verification after any fixes**

Run:

```bash
rtk npm test
rtk npm run lint
rtk npm run build
rtk git status --short
```

Expected: tests, lint, and build PASS; status contains only intentional feature
changes.

- [ ] **Step 5: Commit verification fixes if needed**

If Step 3 or Step 4 required code changes:

```bash
rtk git add src/components src/store src/types src/utils src/pages/BoardPage.test.tsx
rtk git commit -m "fix: polish shape creation previews"
```

If no fixes were required, do not create an empty commit.
