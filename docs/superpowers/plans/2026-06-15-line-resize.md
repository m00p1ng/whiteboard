# Line Endpoint Resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users resize a selected `line` shape by dragging either endpoint.

**Architecture:** A pure helper `computeResizedLinePoints` (in `src/utils/geometry.ts`) computes the new `points` array for a dragged endpoint, enforcing a minimum line length. A new `LineEndpointHandles` component renders two draggable `Circle` handles at the line's endpoints, uses the helper to live-update the Konva `Line` node during drag and commit via `onChange` on drag end. Canvas wires it in alongside `SelectionTransformer`.

**Tech Stack:** React, react-konva, Konva, Vitest + @testing-library/react

---

### Task 1: Pure helper `computeResizedLinePoints`

**Files:**
- Modify: `src/utils/geometry.ts`
- Test: `src/utils/geometry.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/utils/geometry.test.ts` (new top-level `describe` block, alongside existing imports — add `computeResizedLinePoints` to the import from `./geometry`):

```ts
describe('computeResizedLinePoints', () => {
  it('updates the first endpoint when dragging handle 0', () => {
    const result = computeResizedLinePoints([0, 0, 100, 0], 0, 0, 0, { x: 20, y: 30 });
    expect(result).toEqual([20, 30, 100, 0]);
  });

  it('updates the second endpoint when dragging handle 1', () => {
    const result = computeResizedLinePoints([0, 0, 100, 0], 0, 0, 1, { x: 80, y: 40 });
    expect(result).toEqual([0, 0, 80, 40]);
  });

  it('accounts for a nonzero shape offset', () => {
    const result = computeResizedLinePoints([0, 0, 100, 0], 10, 5, 0, { x: 30, y: 25 });
    expect(result).toEqual([20, 20, 100, 0]);
  });

  it('rejects a resize that would shrink the line below the minimum length', () => {
    const result = computeResizedLinePoints([0, 0, 100, 0], 0, 0, 0, { x: 95, y: 0 });
    expect(result).toBeNull();
  });

  it('allows a resize exactly at the minimum length', () => {
    const result = computeResizedLinePoints([0, 0, 100, 0], 0, 0, 0, { x: 90, y: 0 });
    expect(result).toEqual([90, 0, 100, 0]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/utils/geometry.test.ts`
Expected: FAIL with "computeResizedLinePoints is not a function" (or similar — import error)

- [ ] **Step 3: Implement the helper**

Add to the end of `src/utils/geometry.ts`:

```ts
export const MIN_LINE_LENGTH = 10;

export function computeResizedLinePoints(
  points: [number, number, number, number],
  shapeX: number,
  shapeY: number,
  handleIndex: 0 | 1,
  newWorldPos: Point
): [number, number, number, number] | null {
  const local = { x: newWorldPos.x - shapeX, y: newWorldPos.y - shapeY };
  const other =
    handleIndex === 0
      ? { x: points[2], y: points[3] }
      : { x: points[0], y: points[1] };

  if (Math.hypot(local.x - other.x, local.y - other.y) < MIN_LINE_LENGTH) {
    return null;
  }

  return handleIndex === 0
    ? [local.x, local.y, points[2], points[3]]
    : [points[0], points[1], local.x, local.y];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/utils/geometry.test.ts`
Expected: PASS (all `computeResizedLinePoints` tests and existing tests green)

- [ ] **Step 5: Commit**

```bash
git add src/utils/geometry.ts src/utils/geometry.test.ts
git commit -m "feat: add computeResizedLinePoints helper"
```

---

### Task 2: `LineEndpointHandles` component

**Files:**
- Create: `src/components/LineEndpointHandles.tsx`
- Test: `src/components/LineEndpointHandles.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/LineEndpointHandles.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LineEndpointHandles } from './LineEndpointHandles';
import type { LineShape } from '@/types/shape';
import type { Point } from '@/utils/geometry';

vi.mock('react-konva', () => ({
  Circle: (props: Record<string, unknown>) => (
    <div data-testid="line-handle" data-props={JSON.stringify(props)} />
  ),
}));

const line: LineShape = {
  id: 'line-1',
  type: 'line',
  x: 10,
  y: 20,
  points: [0, 0, 100, 0],
};

function createTarget(initial: Point, stage?: unknown) {
  let pos = initial;
  const position = (next?: Point) => {
    if (next) {
      pos = next;
      return undefined;
    }
    return pos;
  };
  return { position, getStage: () => stage };
}

describe('LineEndpointHandles', () => {
  it('renders a handle at each endpoint, sized by viewport scale', () => {
    render(
      <LineEndpointHandles
        shape={line}
        viewport={{ scale: 2, offsetX: 0, offsetY: 0 }}
        onChange={vi.fn()}
      />
    );

    const handles = screen.getAllByTestId('line-handle');
    expect(handles).toHaveLength(2);

    const first = JSON.parse(handles[0].getAttribute('data-props')!);
    const second = JSON.parse(handles[1].getAttribute('data-props')!);

    expect(first).toMatchObject({ x: 10, y: 20, radius: 2.5, fill: '#3b82f6' });
    expect(second).toMatchObject({ x: 110, y: 20, radius: 2.5, fill: '#3b82f6' });
  });

  it('commits new points on drag end when the result is valid', () => {
    const onChange = vi.fn();
    render(
      <LineEndpointHandles
        shape={line}
        viewport={{ scale: 1, offsetX: 0, offsetY: 0 }}
        onChange={onChange}
      />
    );

    const handles = screen.getAllByTestId('line-handle');
    const firstProps = JSON.parse(handles[0].getAttribute('data-props')!) as {
      onDragEnd: (e: { target: ReturnType<typeof createTarget> }) => void;
    };

    const target = createTarget({ x: 50, y: 60 });
    firstProps.onDragEnd({ target });

    // local = (50-10, 60-20) = (40, 40); other endpoint = (100, 0)
    expect(onChange).toHaveBeenCalledWith({ points: [40, 40, 100, 0] });
  });

  it('reverts the handle position on drag end when below the minimum length', () => {
    const onChange = vi.fn();
    render(
      <LineEndpointHandles
        shape={line}
        viewport={{ scale: 1, offsetX: 0, offsetY: 0 }}
        onChange={onChange}
      />
    );

    const handles = screen.getAllByTestId('line-handle');
    const firstProps = JSON.parse(handles[0].getAttribute('data-props')!) as {
      onDragEnd: (e: { target: ReturnType<typeof createTarget> }) => void;
    };

    // newWorldPos = (105, 20) -> local (95, 0), other (100, 0) -> distance 5 < 10
    const target = createTarget({ x: 105, y: 20 });
    firstProps.onDragEnd({ target });

    expect(onChange).not.toHaveBeenCalled();
    expect(target.position()).toEqual({ x: 10, y: 20 });
  });

  it('live-updates the line node on drag move when the result is valid', () => {
    const lineNode = { points: vi.fn(), getLayer: () => ({ batchDraw: vi.fn() }) };
    const stage = { findOne: vi.fn(() => lineNode) };

    render(
      <LineEndpointHandles
        shape={line}
        viewport={{ scale: 1, offsetX: 0, offsetY: 0 }}
        onChange={vi.fn()}
      />
    );

    const handles = screen.getAllByTestId('line-handle');
    const secondProps = JSON.parse(handles[1].getAttribute('data-props')!) as {
      onDragMove: (e: { target: ReturnType<typeof createTarget> }) => void;
    };

    // newWorldPos = (200, 30) -> local (190, 10)
    const target = createTarget({ x: 200, y: 30 }, stage);
    secondProps.onDragMove({ target });

    expect(stage.findOne).toHaveBeenCalledWith('#line-1');
    expect(lineNode.points).toHaveBeenCalledWith([0, 0, 190, 10]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/LineEndpointHandles.test.tsx`
Expected: FAIL with "Failed to resolve import './LineEndpointHandles'"

- [ ] **Step 3: Implement the component**

Create `src/components/LineEndpointHandles.tsx`:

```tsx
import { Circle } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import type { LineShape, Shape } from '@/types/shape';
import { computeResizedLinePoints, type ViewportTransform } from '@/utils/geometry';

interface LineEndpointHandlesProps {
  shape: LineShape;
  viewport: ViewportTransform;
  onChange: (updates: Partial<Shape>) => void;
}

const HANDLE_RADIUS = 5;

export function LineEndpointHandles({
  shape,
  viewport,
  onChange,
}: LineEndpointHandlesProps) {
  const radius = HANDLE_RADIUS / viewport.scale;

  const handlePositions: [number, number][] = [
    [shape.x + shape.points[0], shape.y + shape.points[1]],
    [shape.x + shape.points[2], shape.y + shape.points[3]],
  ];

  const resolveDrag = (
    handleIndex: 0 | 1,
    e: KonvaEventObject<DragEvent>
  ) => {
    const node = e.target;
    const pos = node.position();
    const result = computeResizedLinePoints(
      shape.points,
      shape.x,
      shape.y,
      handleIndex,
      pos
    );
    if (!result) {
      const [x, y] = handlePositions[handleIndex];
      node.position({ x, y });
      return null;
    }
    return result;
  };

  const handleDragMove = (handleIndex: 0 | 1, e: KonvaEventObject<DragEvent>) => {
    const result = resolveDrag(handleIndex, e);
    if (!result) return;

    const stage = e.target.getStage();
    const lineNode = stage?.findOne(`#${shape.id}`) as Konva.Line | undefined;
    lineNode?.points(result);
    lineNode?.getLayer()?.batchDraw();
  };

  const handleDragEnd = (handleIndex: 0 | 1, e: KonvaEventObject<DragEvent>) => {
    const result = resolveDrag(handleIndex, e);
    if (!result) return;
    onChange({ points: result });
  };

  return (
    <>
      {handlePositions.map(([x, y], index) => (
        <Circle
          key={index}
          x={x}
          y={y}
          radius={radius}
          fill="#3b82f6"
          draggable
          onDragMove={(e) => handleDragMove(index as 0 | 1, e)}
          onDragEnd={(e) => handleDragEnd(index as 0 | 1, e)}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/LineEndpointHandles.test.tsx`
Expected: PASS (all 4 tests green)

- [ ] **Step 5: Commit**

```bash
git add src/components/LineEndpointHandles.tsx src/components/LineEndpointHandles.test.tsx
git commit -m "feat: add LineEndpointHandles component"
```

---

### Task 3: Wire into Canvas

**Files:**
- Modify: `src/components/Canvas.tsx`
- Modify: `src/components/Canvas.test.tsx`

- [ ] **Step 1: Update the Canvas test mock**

In `src/components/Canvas.test.tsx`, the `react-konva` mock (around line 76-78) currently is:

```ts
  Layer: ({ children }: PropsWithChildren) => <>{children}</>,
  Transformer: () => <div data-testid="selection-transformer" />,
}));
```

Add a `Circle` stub so `LineEndpointHandles` doesn't crash when rendered:

```ts
  Layer: ({ children }: PropsWithChildren) => <>{children}</>,
  Transformer: () => <div data-testid="selection-transformer" />,
  Circle: () => <div data-testid="line-endpoint-handle" />,
}));
```

- [ ] **Step 2: Run Canvas tests to verify they still pass**

Run: `npm test -- src/components/Canvas.test.tsx`
Expected: PASS (no behavior changed yet, mock addition is inert)

- [ ] **Step 3: Wire `LineEndpointHandles` into Canvas**

In `src/components/Canvas.tsx`, add the import near the other component imports (after the `ShapeContextMenu` import, around line 20):

```tsx
import { ShapeContextMenu } from './ShapeContextMenu';
import { LineEndpointHandles } from './LineEndpointHandles';
```

Then, inside the `<Layer>`, render it right after `<SelectionTransformer ... />` (around line 340):

```tsx
          <CreationPreview shape={previewShape} connectorPoints={connectorPoints} />
          <SelectionTransformer selectedShape={selectedShape} />
          {selectedShape?.type === 'line' && tool === 'select' && (
            <LineEndpointHandles
              shape={selectedShape}
              viewport={viewport}
              onChange={(updates) => updateShape(selectedShape.id, updates)}
            />
          )}
        </Layer>
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS (all tests green, including `Canvas.test.tsx`, `LineEndpointHandles.test.tsx`, `geometry.test.ts`)

- [ ] **Step 5: Commit**

```bash
git add src/components/Canvas.tsx src/components/Canvas.test.tsx
git commit -m "feat: wire LineEndpointHandles into Canvas for line resize"
```
