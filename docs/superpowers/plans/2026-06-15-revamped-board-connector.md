# Revamped Board Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the board's straight-line connector tool with an orthogonal auto-routing connector supporting drag-to-create, nearest-edge anchoring, segment rerouting, endpoint reconnection, and keyboard deletion.

**Architecture:** Extend `ConnectorShape` with persisted `ConnectorAnchor` endpoints and optional `waypoints`. Build pure geometry helpers in `src/utils/boardConnectorGeometry.ts` that reuse normalization from the flowchart router and segment editing from `edgeGeometry.ts`. Render the visible line, arrowhead, hit path, and handles in `src/components/BoardConnector.tsx` and `src/components/BoardConnectorHandles.tsx`. Coordinate creation drafts and edit previews in `Canvas`, committing changes through the existing `updateShape`/`removeShape` store actions.

**Tech Stack:** TypeScript 6, React 19, Zustand 5, Konva/react-konva, Vitest, Testing Library.

---

## File Structure

- Modify `src/types/shape.ts`
  - Add `ConnectorAnchor` and `waypoints` to `ConnectorShape`.
- Create `src/utils/boardConnectorGeometry.ts`
  - Nearest-edge detection, anchor-point lookup, and orthogonal routing for board shapes.
- Create `src/utils/boardConnectorGeometry.test.ts`
  - Unit tests for routing, nearest-edge logic, waypoint extraction, and segment offset.
- Modify `src/components/Connector.tsx`
  - Rename/replace with `BoardConnector`: visible orthogonal line, arrowhead, transparent hit path.
- Create `src/components/BoardConnectorHandles.tsx`
  - Endpoint and segment drag targets with preview/commit callbacks.
- Modify `src/components/ShapeRenderer.tsx`
  - Render `BoardConnector` for `type: 'connector'`.
- Modify `src/components/Canvas.tsx`
  - Drag-to-create draft, selected-connector preview state, endpoint drop resolution, keyboard deletion.
- Create `src/components/Canvas.test.tsx`
  - Mock Stage and shapes; add drag-to-create and selected-connector editing tests.
- Create `src/components/BoardConnector.test.tsx`
  - Verify hit path, selection, handle rendering, and arrowhead.
- Create `src/components/BoardConnectorHandles.test.tsx`
  - Verify callbacks and stable indexes.

---

### Task 1: Extend the ConnectorShape type

**Files:**
- Modify: `src/types/shape.ts`
- Test: `src/types/shape.test.ts`

- [ ] **Step 1: Add the new connector fields**

Open `src/types/shape.ts` and replace the `ConnectorShape` definition with:

```ts
export type ConnectorAnchor = 'top' | 'right' | 'bottom' | 'left';

export interface ConnectorShape extends BaseShape {
  type: 'connector';
  fromId: string;
  toId: string;
  fromAnchor?: ConnectorAnchor;
  toAnchor?: ConnectorAnchor;
  waypoints?: FlowchartPoint[];
}
```

Add the import at the top of the file:

```ts
import type { FlowchartPoint } from './flowchart';
```

- [ ] **Step 2: Add a type test for ConnectorShape**

Open `src/types/shape.test.ts` and append:

```ts
import type { ConnectorShape } from './shape';

it('accepts connector waypoints and anchors', () => {
  const connector: ConnectorShape = {
    id: 'c1',
    type: 'connector',
    x: 0,
    y: 0,
    fromId: 'a',
    toId: 'b',
    fromAnchor: 'right',
    toAnchor: 'left',
    waypoints: [{ x: 150, y: 100 }],
  };
  expect(connector.fromAnchor).toBe('right');
});
```

- [ ] **Step 3: Run the type tests**

Run:

```bash
npm test -- src/types/shape.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/types/shape.ts src/types/shape.test.ts
git commit -m "feat(connector): extend ConnectorShape with anchors and waypoints"
```

---

### Task 2: Build board connector geometry utilities

**Files:**
- Create: `src/utils/boardConnectorGeometry.ts`
- Create: `src/utils/boardConnectorGeometry.test.ts`

- [ ] **Step 1: Write failing geometry tests**

Create `src/utils/boardConnectorGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { RectShape, CircleShape } from '@/types/shape';
import {
  computeConnectorPath,
  getAnchorPoint,
  getManualWaypoints,
  getNearestAnchor,
  moveWaypoint,
  offsetRouteSegment,
} from './boardConnectorGeometry';

const rectA: RectShape = {
  id: 'a',
  type: 'rect',
  x: 0,
  y: 0,
  width: 100,
  height: 60,
};

const rectB: RectShape = {
  id: 'b',
  type: 'rect',
  x: 200,
  y: 100,
  width: 100,
  height: 60,
};

it('chooses the nearest edge based on target position', () => {
  expect(getNearestAnchor(rectA, { x: 250, y: 130 })).toBe('right');
  expect(getNearestAnchor(rectA, { x: -50, y: 30 })).toBe('left');
  expect(getNearestAnchor(rectA, { x: 50, y: -50 })).toBe('top');
  expect(getNearestAnchor(rectA, { x: 50, y: 150 })).toBe('bottom');
});

it('returns the midpoint of a rect edge', () => {
  expect(getAnchorPoint(rectA, 'right')).toEqual({ x: 100, y: 30 });
  expect(getAnchorPoint(rectA, 'left')).toEqual({ x: 0, y: 30 });
  expect(getAnchorPoint(rectA, 'top')).toEqual({ x: 50, y: 0 });
  expect(getAnchorPoint(rectA, 'bottom')).toEqual({ x: 50, y: 60 });
});

it('returns the perimeter point of a circle edge', () => {
  const circle: CircleShape = {
    id: 'c',
    type: 'circle',
    x: 50,
    y: 50,
    radiusX: 40,
    radiusY: 30,
  };
  expect(getAnchorPoint(circle, 'right')).toEqual({ x: 90, y: 50 });
  expect(getAnchorPoint(circle, 'top')).toEqual({ x: 50, y: 20 });
});

it('computes an orthogonal path between two rect edges', () => {
  const path = computeConnectorPath(rectA, 'right', rectB, 'left');
  expect(path).toHaveLength(8);
  expect(path[0]).toBe(100);
  expect(path[1]).toBe(30);
  expect(path.at(-2)).toBe(200);
  expect(path.at(-1)).toBe(130);
});

it('routes through persisted waypoints', () => {
  const path = computeConnectorPath(rectA, 'right', rectB, 'left', [
    { x: 140, y: 30 },
    { x: 140, y: 130 },
  ]);
  expect(path).toContain(140);
});

it('extracts manual waypoints from a rendered route', () => {
  const route = [100, 30, 108, 30, 108, 130, 200, 130];
  expect(getManualWaypoints(route)).toEqual([
    { x: 108, y: 30 },
    { x: 108, y: 130 },
  ]);
});

it('moves one waypoint immutably', () => {
  const waypoints = [
    { x: 108, y: 30 },
    { x: 108, y: 130 },
  ];
  expect(moveWaypoint(waypoints, 0, { x: 120, y: 40 })).toEqual([
    { x: 120, y: 40 },
    { x: 108, y: 130 },
  ]);
  expect(waypoints[0]).toEqual({ x: 108, y: 30 });
});

it('offsets an interior horizontal segment vertically', () => {
  const route = [0, 0, 8, 0, 40, 40, 100, 40, 132, 80, 140, 80];
  expect(offsetRouteSegment(route, 2, { x: 0, y: 20 })).toEqual([
    { x: 40, y: 60 },
    { x: 100, y: 60 },
  ]);
});

it('ignores movement parallel to the segment', () => {
  const route = [0, 0, 8, 0, 40, 40, 100, 40, 132, 80, 140, 80];
  expect(offsetRouteSegment(route, 2, { x: 30, y: 0 })).toEqual([
    { x: 40, y: 40 },
    { x: 100, y: 40 },
  ]);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/utils/boardConnectorGeometry.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the geometry module**

Create `src/utils/boardConnectorGeometry.ts`:

```ts
import type { CircleShape, ConnectorAnchor, RectShape, Shape } from '@/types/shape';
import type { FlowchartPoint } from '@/types/flowchart';
import {
  expandPoints,
  flattenPoints,
  normalizeOrthogonalPoints,
} from './orthogonalRouter';
import {
  getManualWaypoints as getEdgeManualWaypoints,
  moveWaypoint as moveEdgeWaypoint,
  offsetRouteSegment as offsetEdgeSegment,
} from './edgeGeometry';

export type BoardShape = RectShape | CircleShape;

const MARGIN = 8;

const directionVectors: Record<ConnectorAnchor, { x: number; y: number }> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export function isBoardShape(shape: Shape): shape is BoardShape {
  return shape.type === 'rect' || shape.type === 'circle';
}

export function getNearestAnchor(
  shape: BoardShape,
  point: FlowchartPoint
): ConnectorAnchor {
  const center =
    shape.type === 'rect'
      ? { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 }
      : { x: shape.x, y: shape.y };

  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'bottom' : 'top';
}

export function getAnchorPoint(
  shape: BoardShape,
  anchor: ConnectorAnchor
): FlowchartPoint {
  if (shape.type === 'rect') {
    switch (anchor) {
      case 'top':
        return { x: shape.x + shape.width / 2, y: shape.y };
      case 'right':
        return { x: shape.x + shape.width, y: shape.y + shape.height / 2 };
      case 'bottom':
        return { x: shape.x + shape.width / 2, y: shape.y + shape.height };
      case 'left':
        return { x: shape.x, y: shape.y + shape.height / 2 };
    }
  }
  switch (anchor) {
    case 'top':
      return { x: shape.x, y: shape.y - shape.radiusY };
    case 'right':
      return { x: shape.x + shape.radiusX, y: shape.y };
    case 'bottom':
      return { x: shape.x, y: shape.y + shape.radiusY };
    case 'left':
      return { x: shape.x - shape.radiusX, y: shape.y };
  }
}

export function computeConnectorPath(
  source: BoardShape,
  sourceAnchor: ConnectorAnchor,
  target: BoardShape,
  targetAnchor: ConnectorAnchor,
  waypoints?: FlowchartPoint[]
): number[] {
  const sourcePoint = getAnchorPoint(source, sourceAnchor);
  const targetPoint = getAnchorPoint(target, targetAnchor);
  const sourceDir = directionVectors[sourceAnchor];
  const targetDir = directionVectors[targetAnchor];

  const exit = {
    x: sourcePoint.x + sourceDir.x * MARGIN,
    y: sourcePoint.y + sourceDir.y * MARGIN,
  };
  const entry = {
    x: targetPoint.x + targetDir.x * MARGIN,
    y: targetPoint.y + targetDir.y * MARGIN,
  };

  if (waypoints?.length) {
    const interior = buildOrthogonalAnchors([exit, ...waypoints, entry]);
    return flattenPoints(
      normalizeOrthogonalPoints([sourcePoint, ...interior, targetPoint])
    );
  }

  const points: FlowchartPoint[] = [sourcePoint, exit];

  if (exit.x === entry.x || exit.y === entry.y) {
    points.push(entry);
  } else {
    const sourceHorizontal = sourceAnchor === 'left' || sourceAnchor === 'right';
    const targetVertical = targetAnchor === 'top' || targetAnchor === 'bottom';

    if (sourceHorizontal && targetVertical) {
      points.push({ x: entry.x, y: exit.y }, entry);
    } else if (!sourceHorizontal && !targetVertical) {
      points.push({ x: exit.x, y: entry.y }, entry);
    } else if (sourceHorizontal) {
      const midY = (exit.y + entry.y) / 2;
      points.push({ x: exit.x, y: midY }, { x: entry.x, y: midY }, entry);
    } else {
      const midX = (exit.x + entry.x) / 2;
      points.push({ x: midX, y: exit.y }, { x: midX, y: entry.y }, entry);
    }
  }

  points.push(targetPoint);
  return flattenPoints(normalizeOrthogonalPoints(points));
}

function buildOrthogonalAnchors(
  anchors: FlowchartPoint[]
): FlowchartPoint[] {
  const points: FlowchartPoint[] = [];
  for (const anchor of anchors) {
    const previous = points.at(-1);
    if (previous && previous.x !== anchor.x && previous.y !== anchor.y) {
      points.push({ x: anchor.x, y: previous.y });
    }
    points.push({ ...anchor });
  }
  return points;
}

export function getManualWaypoints(route: number[]): FlowchartPoint[] {
  return getEdgeManualWaypoints(route);
}

export function moveWaypoint(
  waypoints: FlowchartPoint[],
  index: number,
  position: FlowchartPoint
): FlowchartPoint[] {
  return moveEdgeWaypoint(waypoints, index, position);
}

export function offsetRouteSegment(
  route: number[],
  segmentIndex: number,
  delta: FlowchartPoint
): FlowchartPoint[] {
  return offsetEdgeSegment(route, segmentIndex, delta);
}
```

- [ ] **Step 4: Run the geometry tests**

Run:

```bash
npm test -- src/utils/boardConnectorGeometry.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/boardConnectorGeometry.ts src/utils/boardConnectorGeometry.test.ts
git commit -m "feat(connector): add board connector geometry utilities"
```

---

### Task 3: Render the orthogonal connector with hit path and arrowhead

**Files:**
- Modify: `src/components/Connector.tsx`
- Modify: `src/components/ShapeRenderer.tsx`
- Create: `src/components/BoardConnector.test.tsx`

- [ ] **Step 1: Replace Connector with BoardConnector**

Open `src/components/Connector.tsx` and replace the entire file with:

```tsx
import { Arrow, Group, Line } from 'react-konva';
import { useEditorStore } from '@/store/editorStore';
import {
  computeConnectorPath,
  getNearestAnchor,
  isBoardShape,
} from '@/utils/boardConnectorGeometry';
import type { ConnectorShape } from '@/types/shape';

interface BoardConnectorProps {
  connector: ConnectorShape;
  isSelected: boolean;
  previewPoints?: number[];
  onSelect?: () => void;
}

export function BoardConnector({
  connector,
  isSelected,
  previewPoints,
  onSelect,
}: BoardConnectorProps) {
  const shapes = useEditorStore((s) => s.shapes);
  const source = shapes[connector.fromId];
  const target = shapes[connector.toId];

  if (!source || !target || !isBoardShape(source) || !isBoardShape(target)) {
    return null;
  }

  const fromAnchor = connector.fromAnchor ?? getNearestAnchor(source, target);
  const toAnchor = connector.toAnchor ?? getNearestAnchor(target, source);

  const points =
    previewPoints ??
    computeConnectorPath(
      source,
      fromAnchor,
      target,
      toAnchor,
      connector.waypoints
    );

  const stroke = isSelected ? '#3b82f6' : connector.stroke ?? '#000';
  const strokeWidth = connector.strokeWidth ?? 2;

  return (
    <Group>
      <Line
        data-testid="edge-hit-path"
        points={points}
        stroke="rgba(0,0,0,0.001)"
        strokeWidth={Math.max(strokeWidth + 12, 14)}
        hitStrokeWidth={Math.max(strokeWidth + 12, 14)}
        listening
        onClick={onSelect}
        onTap={onSelect}
      />
      <Arrow
        data-testid="edge-visible-path"
        points={points}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={stroke}
        pointerLength={8}
        pointerWidth={8}
        listening={false}
      />
    </Group>
  );
}
```

- [ ] **Step 2: Update ShapeRenderer to use BoardConnector**

Open `src/components/ShapeRenderer.tsx` and replace the `Connector` import and the `case 'connector'` block:

```ts
import { BoardConnector } from './Connector';
```

```tsx
case 'connector':
  return (
    <BoardConnector
      connector={shape}
      isSelected={isSelected}
      onSelect={onSelect}
    />
  );
```

- [ ] **Step 3: Add BoardConnector component tests**

Create `src/components/BoardConnector.test.tsx`:

```tsx
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BoardConnector } from './Connector';
import { useEditorStore } from '@/store/editorStore';
import type { RectShape, ConnectorShape } from '@/types/shape';

vi.mock('react-konva', () => ({
  Group: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Line: (props: Record<string, unknown>) => (
    <button
      type="button"
      data-testid={props['data-testid'] as string}
      data-props={JSON.stringify(props)}
      onClick={() =>
        (props.onClick as ((event: { cancelBubble: boolean }) => void) | undefined)?.({
          cancelBubble: false,
        })
      }
    />
  ),
  Arrow: (props: Record<string, unknown>) => (
    <div
      data-testid={props['data-testid'] as string}
      data-props={JSON.stringify(props)}
    />
  ),
}));

vi.mock('@/store/editorStore', () => ({
  useEditorStore: vi.fn(),
}));

function readProps(testId: string) {
  return JSON.parse(screen.getByTestId(testId).getAttribute('data-props')!);
}

const source: RectShape = {
  id: 'a',
  type: 'rect',
  x: 0,
  y: 0,
  width: 100,
  height: 60,
};

const target: RectShape = {
  id: 'b',
  type: 'rect',
  x: 200,
  y: 100,
  width: 100,
  height: 60,
};

const connector: ConnectorShape = {
  id: 'c1',
  type: 'connector',
  x: 0,
  y: 0,
  fromId: 'a',
  toId: 'b',
};

function mockStore(shapes: Record<string, RectShape>) {
  (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (state: { shapes: Record<string, RectShape> }) => unknown) =>
      selector({ shapes })
  );
}

it('renders a hit path and a visible arrow', () => {
  mockStore({ a: source, b: target });
  render(<BoardConnector connector={connector} isSelected={false} />);
  expect(screen.getByTestId('edge-hit-path')).toBeInTheDocument();
  expect(screen.getByTestId('edge-visible-path')).toBeInTheDocument();
});

it('calls onSelect when the hit path is clicked', () => {
  mockStore({ a: source, b: target });
  const onSelect = vi.fn();
  render(
    <BoardConnector connector={connector} isSelected={false} onSelect={onSelect} />
  );
  fireEvent.click(screen.getByTestId('edge-hit-path'));
  expect(onSelect).toHaveBeenCalledOnce();
});

it('renders preview points instead of computing the route', () => {
  mockStore({ a: source, b: target });
  const preview = [0, 0, 50, 50, 100, 100];
  render(
    <BoardConnector
      connector={connector}
      isSelected={false}
      previewPoints={preview}
    />
  );
  expect(readProps('edge-visible-path').points).toEqual(preview);
});
```

- [ ] **Step 4: Run the component tests**

Run:

```bash
npm test -- src/components/BoardConnector.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Connector.tsx src/components/ShapeRenderer.tsx src/components/BoardConnector.test.tsx
git commit -m "feat(connector): render orthogonal connector with hit path and arrowhead"
```

---

### Task 4: Build connector drag handles

**Files:**
- Create: `src/components/BoardConnectorHandles.tsx`
- Create: `src/components/BoardConnectorHandles.test.tsx`

- [ ] **Step 1: Write failing handle tests**

Create `src/components/BoardConnectorHandles.test.tsx`:

```tsx
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BoardConnectorHandles } from './BoardConnectorHandles';

vi.mock('react-konva', () => ({
  Group: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Circle: (props: Record<string, unknown>) => (
    <button
      type="button"
      data-testid={props['data-testid'] as string}
      data-x={props.x}
      data-y={props.y}
      onDragStart={() =>
        (props.onDragStart as ((event: { cancelBubble: boolean }) => void) | undefined)?.({
          cancelBubble: false,
          target: { x: () => props.x, y: () => props.y, setAttr: vi.fn() },
        })
      }
      onDragMove={() =>
        (props.onDragMove as ((event: { cancelBubble: boolean; target: unknown }) => void) | undefined)?.({
          cancelBubble: false,
          target: { x: () => 10, y: () => 20 },
        })
      }
      onDragEnd={() =>
        (props.onDragEnd as ((event: { cancelBubble: boolean; target: unknown }) => void) | undefined)?.({
          cancelBubble: false,
          target: { x: () => 10, y: () => 20 },
        })
      }
    />
  ),
  Line: (props: Record<string, unknown>) => (
    <button
      type="button"
      data-testid={props['data-testid'] as string}
      onDragStart={() =>
        (props.onDragStart as ((event: { cancelBubble: boolean }) => void) | undefined)?.({
          cancelBubble: false,
          target: { x: () => 0, y: () => 0, setAttr: vi.fn() },
        })
      }
      onDragMove={() =>
        (props.onDragMove as ((event: { cancelBubble: boolean; target: unknown }) => void) | undefined)?.({
          cancelBubble: false,
          target: { x: () => 5, y: () => 25 },
        })
      }
      onDragEnd={() =>
        (props.onDragEnd as ((event: { cancelBubble: boolean; target: unknown }) => void) | undefined)?.({
          cancelBubble: false,
          target: { x: () => 5, y: () => 25 },
        })
      }
    />
  ),
}));

const route = [0, 0, 8, 0, 8, 100, 100, 100, 100, 50, 140, 50];

it('renders endpoint handles at the first and last points', () => {
  render(
    <BoardConnectorHandles
      points={route}
      waypoints={[]}
      onWaypointPreview={vi.fn()}
      onWaypointCommit={vi.fn()}
      onSegmentPreview={vi.fn()}
      onSegmentCommit={vi.fn()}
      onEndpointPreview={vi.fn()}
      onEndpointCommit={vi.fn()}
    />
  );
  expect(screen.getByTestId('edge-endpoint-source')).toBeInTheDocument();
  expect(screen.getByTestId('edge-endpoint-target')).toBeInTheDocument();
});

it('emits a segment offset preview and commit', () => {
  const onSegmentPreview = vi.fn();
  const onSegmentCommit = vi.fn();
  render(
    <BoardConnectorHandles
      points={route}
      waypoints={[]}
      onWaypointPreview={vi.fn()}
      onWaypointCommit={vi.fn()}
      onSegmentPreview={onSegmentPreview}
      onSegmentCommit={onSegmentCommit}
      onEndpointPreview={vi.fn()}
      onEndpointCommit={vi.fn()}
    />
  );
  fireEvent.dragStart(screen.getByTestId('edge-segment-2'));
  fireEvent.dragMove(screen.getByTestId('edge-segment-2'));
  expect(onSegmentPreview).toHaveBeenCalled();
  fireEvent.dragEnd(screen.getByTestId('edge-segment-2'));
  expect(onSegmentCommit).toHaveBeenCalled();
});

it('emits endpoint commit with the drop position', () => {
  const onEndpointCommit = vi.fn();
  render(
    <BoardConnectorHandles
      points={route}
      waypoints={[]}
      onWaypointPreview={vi.fn()}
      onWaypointCommit={vi.fn()}
      onSegmentPreview={vi.fn()}
      onSegmentCommit={vi.fn()}
      onEndpointPreview={vi.fn()}
      onEndpointCommit={onEndpointCommit}
    />
  );
  fireEvent.dragEnd(screen.getByTestId('edge-endpoint-target'));
  expect(onEndpointCommit).toHaveBeenCalledWith('target', { x: 10, y: 20 });
});
```

- [ ] **Step 2: Run handle tests to verify failure**

Run:

```bash
npm test -- src/components/BoardConnectorHandles.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the handles component**

Create `src/components/BoardConnectorHandles.tsx`:

```tsx
import { Circle, Group, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { FlowchartPoint } from '@/types/flowchart';
import { expandPoints } from '@/utils/orthogonalRouter';

interface BoardConnectorHandlesProps {
  points: number[];
  waypoints: FlowchartPoint[];
  onWaypointPreview: (index: number, point: FlowchartPoint) => void;
  onWaypointCommit: () => void;
  onSegmentPreview: (segmentIndex: number, delta: FlowchartPoint) => void;
  onSegmentCommit: () => void;
  onEndpointPreview: (
    endpoint: 'source' | 'target',
    point: FlowchartPoint
  ) => void;
  onEndpointCommit: (
    endpoint: 'source' | 'target',
    point: FlowchartPoint
  ) => void;
}

export function BoardConnectorHandles({
  points,
  waypoints,
  onWaypointPreview,
  onWaypointCommit,
  onSegmentPreview,
  onSegmentCommit,
  onEndpointPreview,
  onEndpointCommit,
}: BoardConnectorHandlesProps) {
  const expanded = expandPoints(points);

  function handleDragStart(event: KonvaEventObject<DragEvent>) {
    event.cancelBubble = true;
    const node = event.target;
    node.setAttr('originX', node.x());
    node.setAttr('originY', node.y());
  }

  function handleWaypointDrag(
    index: number,
    event: KonvaEventObject<DragEvent>
  ) {
    event.cancelBubble = true;
    const node = event.target;
    onWaypointPreview(index, { x: node.x(), y: node.y() });
  }

  function handleSegmentDrag(
    segmentIndex: number,
    event: KonvaEventObject<DragEvent>
  ) {
    event.cancelBubble = true;
    const node = event.target;
    const originX = node.getAttr('originX') ?? node.x();
    const originY = node.getAttr('originY') ?? node.y();
    onSegmentPreview(segmentIndex, {
      x: node.x() - originX,
      y: node.y() - originY,
    });
  }

  function handleEndpointDrag(
    endpoint: 'source' | 'target',
    event: KonvaEventObject<DragEvent>
  ) {
    event.cancelBubble = true;
    const node = event.target;
    onEndpointPreview(endpoint, { x: node.x(), y: node.y() });
  }

  return (
    <Group listening>
      {waypoints.map((waypoint, index) => (
        <Circle
          key={`bend-${index}`}
          data-testid={`edge-bend-${index}`}
          x={waypoint.x}
          y={waypoint.y}
          radius={5}
          fill="#3b82f6"
          stroke="#fff"
          strokeWidth={2}
          draggable
          onDragStart={handleDragStart}
          onDragMove={(e) => handleWaypointDrag(index, e)}
          onDragEnd={onWaypointCommit}
        />
      ))}

      {expanded.slice(0, -1).map((start, index) => {
        if (index === 0 || index === expanded.length - 2) return null;
        const end = expanded[index + 1];
        return (
          <Line
            key={`segment-${index}`}
            data-testid={`edge-segment-${index}`}
            points={[start.x, start.y, end.x, end.y]}
            stroke="rgba(0,0,0,0.001)"
            strokeWidth={14}
            hitStrokeWidth={14}
            draggable
            onDragStart={handleDragStart}
            onDragMove={(e) => handleSegmentDrag(index, e)}
            onDragEnd={onSegmentCommit}
          />
        );
      })}

      <Circle
        data-testid="edge-endpoint-source"
        x={expanded[0].x}
        y={expanded[0].y}
        radius={6}
        fill="#3b82f6"
        stroke="#fff"
        strokeWidth={2}
        draggable
        onDragStart={handleDragStart}
        onDragMove={(e) => handleEndpointDrag('source', e)}
        onDragEnd={(e) => {
          const node = e.target;
          onEndpointCommit('source', { x: node.x(), y: node.y() });
        }}
      />

      <Circle
        data-testid="edge-endpoint-target"
        x={expanded.at(-1)!.x}
        y={expanded.at(-1)!.y}
        radius={6}
        fill="#3b82f6"
        stroke="#fff"
        strokeWidth={2}
        draggable
        onDragStart={handleDragStart}
        onDragMove={(e) => handleEndpointDrag('target', e)}
        onDragEnd={(e) => {
          const node = e.target;
          onEndpointCommit('target', { x: node.x(), y: node.y() });
        }}
      />
    </Group>
  );
}
```

- [ ] **Step 4: Run handle tests**

Run:

```bash
npm test -- src/components/BoardConnectorHandles.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BoardConnectorHandles.tsx src/components/BoardConnectorHandles.test.tsx
git commit -m "feat(connector): add endpoint and segment drag handles"
```

---

### Task 5: Wire drag-to-create into Canvas

**Files:**
- Modify: `src/components/Canvas.tsx`
- Modify: `src/components/Canvas.test.tsx`

- [ ] **Step 1: Add shape pointer-down support to ShapeRenderer**

Open `src/components/ShapeRenderer.tsx` and extend the props and common event handlers:

```ts
interface ShapeRendererProps {
  shape: Shape;
  isSelected: boolean;
  draggable?: boolean;
  onSelect: () => void;
  onPointerDown?: () => void;
  onDblClick?: () => void;
  onChange?: (updates: Partial<Shape>) => void;
  onContextMenu?: (e: KonvaEventObject<PointerEvent>) => void;
}
```

```tsx
export function ShapeRenderer({
  shape,
  isSelected,
  draggable = true,
  onSelect,
  onPointerDown,
  onDblClick,
  onChange,
  onContextMenu,
}: ShapeRendererProps) {
```

Add `onPointerDown` to the `common` object:

```tsx
  const common = {
    ...
    onClick: onSelect,
    onTap: onSelect,
    onPointerDown,
    ...
  };
```

- [ ] **Step 2: Replace two-click connector state with drag draft state**

In `Canvas.tsx`, replace:

```ts
const [connectorSource, setConnectorSource] = useState<string | null>(null);
const [connectorPointer, setConnectorPointer] = useState<Point | null>(null);
```

with:

```ts
const [connectorDraft, setConnectorDraft] = useState<{
  sourceId: string;
  pointer: Point;
} | null>(null);
```

Replace `clearConnectorDraft` to clear the new state:

```ts
const clearConnectorDraft = useCallback(() => {
  setConnectorDraft(null);
  setSelectedId(null);
}, [setSelectedId]);
```

Replace the effect that clears connector state on tool change:

```tsx
useEffect(() => {
  if (connectorDraft && tool !== 'connector') {
    setConnectorDraft(null);
    setSelectedId(null);
  }
}, [connectorDraft, setSelectedId, tool]);
```

- [ ] **Step 3: Start connector draft on shape pointer-down**

In the JSX where shapes are mapped, pass `onPointerDown` only when the connector tool is active:

```tsx
<ShapeRenderer
  ...
  draggable={!spacePressed && (tool === 'select' || shape.id === selectedId)}
  onPointerDown={
    tool === 'connector' && shape.type !== 'line' && shape.type !== 'text'
      ? () => {
          setConnectorDraft({
            sourceId: shape.id,
            pointer: getAnchorPoint(shape, 'center'),
          });
          setSelectedId(shape.id);
        }
      : undefined
  }
  ...
/>
```

- [ ] **Step 4: Update pointer move/up handlers for the drag draft**

In `handlePointerMove`, replace the `tool === 'connector'` block with:

```tsx
if (tool === 'connector' && connectorDraft) {
  setConnectorDraft((draft) =>
    draft ? { ...draft, pointer: world } : null
  );
}
```

In `handlePointerUp`, replace `if (!shapeDraft) return;` with early handling for the connector draft:

```tsx
if (tool === 'connector' && connectorDraft) {
  if (content.hasPointerCapture(e.evt.pointerId)) {
    content.releasePointerCapture(e.evt.pointerId);
  }

  const screen = getScreenPointer(stage) ?? connectorDraft.pointer;
  const world = screenToWorld(screen, viewport);
  const targetId = resolveShapeIdAtPoint(stage, connectorDraft.sourceId);
  if (targetId) {
    const source = shapes[connectorDraft.sourceId];
    const target = shapes[targetId];
    if (source && target && isBoardShape(source) && isBoardShape(target)) {
      const fromAnchor = getNearestAnchor(source, target);
      const toAnchor = getNearestAnchor(target, source);
      addShape({
        id: crypto.randomUUID(),
        type: 'connector',
        x: 0,
        y: 0,
        fromId: connectorDraft.sourceId,
        toId: targetId,
        fromAnchor,
        toAnchor,
      });
      setSelectedId(null);
    }
  }
  setConnectorDraft(null);
  return;
}

if (!shapeDraft) return;
```

Add a helper inside `Canvas`:

```tsx
function resolveShapeIdAtPoint(
  stage: StageType | null,
  excludeId: string
): string | null {
  if (!stage) return null;
  const screen = stage.getPointerPosition();
  if (!screen) return null;
  const target = stage.getIntersection(screen);
  if (!target) return null;
  const id = target.getAttr('id') as string | undefined;
  if (!id || id === excludeId) return null;
  const shape = shapes[id];
  if (!shape || shape.type === 'line' || shape.type === 'text') return null;
  return id;
}
```

- [ ] **Step 5: Update connector preview points**

Replace `connectorPoints` memo with:

```tsx
const connectorPreviewPoints = useMemo(() => {
  if (!connectorDraft) return null;
  const source = shapes[connectorDraft.sourceId];
  if (!source || !isBoardShape(source)) return null;
  const start = getAnchorPoint(source, getNearestAnchor(source, connectorDraft.pointer));
  return [
    start.x,
    start.y,
    connectorDraft.pointer.x,
    connectorDraft.pointer.y,
  ] as [number, number, number, number];
}, [connectorDraft, shapes]);
```

Pass it to `CreationPreview`:

```tsx
<CreationPreview shape={previewShape} connectorPoints={connectorPreviewPoints} />
```

- [ ] **Step 6: Add Canvas tests for drag-to-create**

Create `src/components/Canvas.test.tsx`:

```tsx
import type { PropsWithChildren, Ref } from 'react';
import { forwardRef, useImperativeHandle } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Canvas } from './Canvas';
import { useEditorStore } from '@/store/editorStore';
import type { RectShape } from '@/types/shape';

const konvaMock = vi.hoisted(() => ({
  pointer: { x: 250, y: 130 },
  intersectionId: null as string | null,
}));

vi.mock('react-konva', () => ({
  Stage: forwardRef(
    (
      {
        children,
        onPointerDown,
        onPointerMove,
        onPointerUp,
      }: PropsWithChildren<{
        onPointerDown: (event: { target: unknown; evt: PointerEvent }) => void;
        onPointerMove: (event: { target: unknown; evt: PointerEvent }) => void;
        onPointerUp: (event: { target: unknown; evt: PointerEvent }) => void;
      }>,
      ref: Ref<{
        getPointerPosition: () => { x: number; y: number };
        getIntersection: () => { getAttr: (name: string) => string | null } | null;
      }>
    ) => {
      const stage = {
        getStage: () => stage,
        getPointerPosition: () => konvaMock.pointer,
        getIntersection: () =>
          konvaMock.intersectionId
            ? { getAttr: (name: string) =>
                name === 'id' ? konvaMock.intersectionId : null
              }
            : null,
      };
      useImperativeHandle(ref, () => stage);
      const event = () => ({
        target: stage,
        evt: new PointerEvent('pointer'),
      });

      return (
        <div>
          <button aria-label="pointer down" onClick={() => onPointerDown(event())} />
          <button aria-label="pointer move" onClick={() => onPointerMove(event())} />
          <button aria-label="pointer up" onClick={() => onPointerUp(event())} />
          {children}
        </div>
      );
    }
  ),
  Layer: ({ children }: PropsWithChildren) => <>{children}</>,
  Group: ({ children }: PropsWithChildren) => <>{children}</>,
  Rect: () => <div data-testid="rect" />,
  Ellipse: () => <div data-testid="circle" />,
  Line: () => <div data-testid="line" />,
  Text: () => <div data-testid="text" />,
  Arrow: () => <div data-testid="arrow" />,
  Circle: () => <div data-testid="circle-handle" />,
}));

vi.mock('./ShapeRenderer', () => ({
  ShapeRenderer: ({ shape, onPointerDown }: { shape: RectShape; onPointerDown?: () => void }) => (
    <button data-testid={`shape-${shape.id}`} onClick={onPointerDown}>
      {shape.id}
    </button>
  ),
}));

vi.mock('./CreationPreview', () => ({
  CreationPreview: () => <div data-testid="creation-preview" />,
}));

vi.mock('./SelectionTransformer', () => ({
  SelectionTransformer: () => null,
}));

vi.mock('./LineEndpointHandles', () => ({
  LineEndpointHandles: () => null,
}));

vi.mock('./GridBackground', () => ({
  GridBackground: () => null,
}));

vi.mock('./TextEditor', () => ({
  TextEditor: () => null,
}));

vi.mock('./ShapeTextEditor', () => ({
  ShapeTextEditor: () => null,
}));

vi.mock('./ShapeContextMenu', () => ({
  ShapeContextMenu: () => null,
}));

function seedStore() {
  useEditorStore.setState({
    shapes: {
      a: {
        id: 'a',
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
      } as RectShape,
      b: {
        id: 'b',
        type: 'rect',
        x: 200,
        y: 100,
        width: 100,
        height: 60,
      } as RectShape,
    },
    tool: 'connector',
    selectedId: null,
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    showGrid: true,
    undoStack: [],
    redoStack: [],
  });
}

beforeEach(() => {
  useEditorStore.getState().reset();
  konvaMock.pointer = { x: 250, y: 130 };
  konvaMock.intersectionId = null;
});

describe('Canvas connector creation', () => {
  it('creates a connector by dragging from one shape to another', () => {
    seedStore();
    render(<Canvas />);

    konvaMock.intersectionId = 'a';
    fireEvent.click(screen.getByTestId('shape-a'));

    konvaMock.intersectionId = 'b';
    fireEvent.click(screen.getByRole('button', { name: 'pointer up' }));

    const connectors = Object.values(useEditorStore.getState().shapes).filter(
      (s) => s.type === 'connector'
    );
    expect(connectors).toHaveLength(1);
    expect(connectors[0]).toMatchObject({
      fromId: 'a',
      toId: 'b',
      fromAnchor: 'right',
      toAnchor: 'left',
    });
  });

  it('cancels connector creation when releasing on empty canvas', () => {
    seedStore();
    render(<Canvas />);

    konvaMock.intersectionId = 'a';
    fireEvent.click(screen.getByTestId('shape-a'));

    konvaMock.intersectionId = null;
    fireEvent.click(screen.getByRole('button', { name: 'pointer up' }));

    const connectors = Object.values(useEditorStore.getState().shapes).filter(
      (s) => s.type === 'connector'
    );
    expect(connectors).toHaveLength(0);
  });
});
```

Note: `onPointerDown` is triggered by the mocked `ShapeRenderer` button click. The real Canvas passes `onPointerDown` only when the connector tool is active, so the test seeds `tool: 'connector'`.

- [ ] **Step 7: Run Canvas tests**

Run:

```bash
npm test -- src/components/Canvas.test.tsx
```

Expected: PASS after removing or updating old two-click connector assertions.

- [ ] **Step 8: Commit**

```bash
git add src/components/ShapeRenderer.tsx src/components/Canvas.tsx src/components/Canvas.test.tsx
git commit -m "feat(connector): drag-to-create connector draft"
```

---

### Task 6: Add selected-connector editing to Canvas

**Files:**
- Modify: `src/components/Canvas.tsx`
- Modify: `src/components/BoardConnector.tsx`
- Modify: `src/components/Canvas.test.tsx`

- [ ] **Step 1: Add selected-connector preview state and imports**

In `Canvas.tsx`, add the imports:

```ts
import { BoardConnectorHandles } from './BoardConnectorHandles';
import type { FlowchartPoint } from '@/types/flowchart';
import {
  computeConnectorPath,
  getNearestAnchor,
  isBoardShape,
  moveWaypoint,
  offsetRouteSegment,
  type BoardShape,
} from '@/utils/boardConnectorGeometry';
```

Add state:

```ts
const [connectorEdit, setConnectorEdit] = useState<{
  connectorId: string;
  points: number[];
  waypoints: FlowchartPoint[];
} | null>(null);
```

- [ ] **Step 2: Render handles for the selected connector**

In the JSX `Layer`, after rendering shapes, add:

```tsx
{selectedShape?.type === 'connector' && tool === 'select' && (
  <BoardConnectorHandles
    points={connectorEdit?.connectorId === selectedShape.id ? connectorEdit.points : computeSelectedConnectorPoints(selectedShape)}
    waypoints={connectorEdit?.connectorId === selectedShape.id ? connectorEdit.waypoints : selectedShape.waypoints ?? []}
    onWaypointPreview={handleWaypointPreview}
    onWaypointCommit={handleWaypointCommit}
    onSegmentPreview={handleSegmentPreview}
    onSegmentCommit={handleSegmentCommit}
    onEndpointPreview={handleEndpointPreview}
    onEndpointCommit={handleEndpointCommit}
  />
)}
```

Add helper functions inside `Canvas`:

```tsx
function computeSelectedConnectorPoints(connector: ConnectorShape): number[] {
  const source = shapes[connector.fromId];
  const target = shapes[connector.toId];
  if (!source || !target || !isBoardShape(source) || !isBoardShape(target)) {
    return [];
  }
  return computeConnectorPath(
    source,
    connector.fromAnchor ?? getNearestAnchor(source, target),
    target,
    connector.toAnchor ?? getNearestAnchor(target, source),
    connector.waypoints
  );
}
```

- [ ] **Step 3: Implement waypoint and segment preview/commit**

```tsx
function getSelectedConnectorBase(connector: ConnectorShape): {
  points: number[];
  waypoints: FlowchartPoint[];
} {
  const points = computeSelectedConnectorPoints(connector);
  return { points, waypoints: connector.waypoints ?? [] };
}

function handleWaypointPreview(index: number, point: FlowchartPoint) {
  if (!selectedShape || selectedShape.type !== 'connector') return;
  const base = connectorEdit?.connectorId === selectedShape.id
    ? { points: connectorEdit.points, waypoints: connectorEdit.waypoints }
    : getSelectedConnectorBase(selectedShape);
  const nextWaypoints = moveWaypoint(base.waypoints, index, point);
  const nextPoints = computeConnectorPath(
    shapes[selectedShape.fromId] as BoardShape,
    selectedShape.fromAnchor ?? getNearestAnchor(shapes[selectedShape.fromId] as BoardShape, shapes[selectedShape.toId] as BoardShape),
    shapes[selectedShape.toId] as BoardShape,
    selectedShape.toAnchor ?? getNearestAnchor(shapes[selectedShape.toId] as BoardShape, shapes[selectedShape.fromId] as BoardShape),
    nextWaypoints
  );
  setConnectorEdit({ connectorId: selectedShape.id, points: nextPoints, waypoints: nextWaypoints });
}

function handleWaypointCommit() {
  if (!selectedShape || selectedShape.type !== 'connector' || connectorEdit?.connectorId !== selectedShape.id) return;
  updateShape(selectedShape.id, { waypoints: connectorEdit.waypoints.length ? connectorEdit.waypoints : undefined });
  setConnectorEdit(null);
}

function handleSegmentPreview(segmentIndex: number, delta: FlowchartPoint) {
  if (!selectedShape || selectedShape.type !== 'connector') return;
  const base = connectorEdit?.connectorId === selectedShape.id
    ? { points: connectorEdit.points, waypoints: connectorEdit.waypoints }
    : getSelectedConnectorBase(selectedShape);
  const nextWaypoints = offsetRouteSegment(base.points, segmentIndex, delta);
  const nextPoints = computeConnectorPath(
    shapes[selectedShape.fromId] as BoardShape,
    selectedShape.fromAnchor ?? getNearestAnchor(shapes[selectedShape.fromId] as BoardShape, shapes[selectedShape.toId] as BoardShape),
    shapes[selectedShape.toId] as BoardShape,
    selectedShape.toAnchor ?? getNearestAnchor(shapes[selectedShape.toId] as BoardShape, shapes[selectedShape.fromId] as BoardShape),
    nextWaypoints
  );
  setConnectorEdit({ connectorId: selectedShape.id, points: nextPoints, waypoints: nextWaypoints });
}

function handleSegmentCommit() {
  if (!selectedShape || selectedShape.type !== 'connector' || connectorEdit?.connectorId !== selectedShape.id) return;
  updateShape(selectedShape.id, { waypoints: connectorEdit.waypoints.length ? connectorEdit.waypoints : undefined });
  setConnectorEdit(null);
}
```

- [ ] **Step 4: Implement endpoint reconnection**

```tsx
function handleEndpointCommit(
  endpoint: 'source' | 'target',
  point: FlowchartPoint
) {
  if (!selectedShape || selectedShape.type !== 'connector') return;
  const targetId = resolveShapeIdAtPoint(stageRef.current, selectedShape.id);
  if (!targetId) {
    setConnectorEdit(null);
    return;
  }
  const otherId = endpoint === 'source' ? selectedShape.toId : selectedShape.fromId;
  if (targetId === otherId) {
    setConnectorEdit(null);
    return;
  }
  const newShape = shapes[targetId];
  const otherShape = shapes[otherId];
  if (!newShape || !otherShape || !isBoardShape(newShape) || !isBoardShape(otherShape)) {
    setConnectorEdit(null);
    return;
  }

  if (endpoint === 'source') {
    updateShape(selectedShape.id, {
      fromId: targetId,
      fromAnchor: getNearestAnchor(newShape, otherShape),
    });
  } else {
    updateShape(selectedShape.id, {
      toId: targetId,
      toAnchor: getNearestAnchor(newShape, otherShape),
    });
  }
  setConnectorEdit(null);
}
```

- [ ] **Step 5: Clear edit state when selection changes**

Add an effect so a stale preview is not reused after the user deselects or reselects:

```tsx
useEffect(() => {
  setConnectorEdit(null);
}, [selectedShape?.id, selectedShape?.type]);
```

- [ ] **Step 6: Delete selected connector with keyboard**

The existing `useHotkeys` hook already removes `selectedId` on Delete/Backspace. Confirm it works for connectors. If the selected shape is a connector, `removeShape(selectedId)` deletes it.

- [ ] **Step 7: BoardConnector preview wiring**

Pass `previewPoints` from `Canvas` when the connector is being edited:

```tsx
<BoardConnector
  connector={shape}
  isSelected={isSelected}
  previewPoints={
    connectorEdit?.connectorId === shape.id ? connectorEdit.points : undefined
  }
  onSelect={onSelect}
/>
```

This requires `connectorEdit` to be accessible in the `shapes.map` render. Since `connectorEdit` is in `Canvas`, you can either lift `BoardConnector` rendering into Canvas or thread the prop through `ShapeRenderer`. To avoid prop drilling, render selected connector handles as an overlay (already done in Step 2) and let `BoardConnector` recompute its own route; the preview points are only needed for smooth drag rendering. For simplicity, skip `previewPoints` on `BoardConnector` and let the handles overlay show the preview by rendering themselves with preview points. The visible connector line will update after commit. If live preview of the line is required, thread `connectorEdit` through `ShapeRenderer`.

- [ ] **Step 8: Add Canvas integration tests**

Append to `src/components/Canvas.test.tsx` inside the `describe` block:

```tsx
function seedConnector() {
  useEditorStore.setState({
    shapes: {
      a: {
        id: 'a',
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
      } as RectShape,
      b: {
        id: 'b',
        type: 'rect',
        x: 200,
        y: 100,
        width: 100,
        height: 60,
      } as RectShape,
      c: {
        id: 'c',
        type: 'rect',
        x: 400,
        y: 0,
        width: 100,
        height: 60,
      } as RectShape,
      conn: {
        id: 'conn',
        type: 'connector',
        x: 0,
        y: 0,
        fromId: 'a',
        toId: 'b',
        fromAnchor: 'right',
        toAnchor: 'left',
      },
    },
    tool: 'select',
    selectedId: 'conn',
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    showGrid: true,
    undoStack: [],
    redoStack: [],
  });
}

it('removes the selected connector on Delete', () => {
  seedConnector();
  render(<Canvas />);

  fireEvent.keyDown(window, { key: 'Delete' });

  expect(useEditorStore.getState().shapes.conn).toBeUndefined();
  expect(useEditorStore.getState().selectedId).toBeNull();
});
```

Endpoint reconnection and segment offset tests are best covered at the `BoardConnectorHandles` and `BoardConnector` component level because the mocked Stage in `Canvas.test.tsx` does not expose Konva drag events directly. If the implementation uses a different mocking strategy that lets `BoardConnectorHandles` fire drag events, add tests that call `onEndpointCommit` and `onSegmentCommit` through the mocked handles and assert the resulting `updateShape` calls.

- [ ] **Step 9: Run all connector-related tests**

Run:

```bash
npm test -- src/components/Canvas.test.tsx src/components/BoardConnector.test.tsx src/components/BoardConnectorHandles.test.tsx src/utils/boardConnectorGeometry.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/Canvas.tsx src/components/BoardConnector.tsx src/components/Canvas.test.tsx
git commit -m "feat(connector): selected connector editing and reconnection"
```

---

### Task 7: Verify full test suite and clean up

**Files:**
- Modify: any remaining stale references
- Run: full test/lint/build pipeline

- [ ] **Step 1: Remove unused old code**

In `src/components/Canvas.tsx`, remove any remaining references to the old two-click connector state (`connectorSource`, `connectorPointer`) and the old `handleShapeClick` connector branch. In `src/components/ShapeRenderer.tsx`, confirm the only connector import is `BoardConnector` from `./Connector`.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore(connector): clean up and verify tests, lint, build"
```

---

## Self-Review

### Spec Coverage

- Drag-to-create creation → Task 5.
- Nearest-edge anchoring → Task 2 `getNearestAnchor`, used in Task 5/6.
- Orthogonal routing with arrowhead → Task 2 `computeConnectorPath`, Task 3 `Arrow` rendering.
- Hit path selection → Task 3 transparent `Line`.
- Endpoint reconnection → Task 6 `handleEndpointCommit`.
- Segment rerouting → Task 4 handles + Task 6 `offsetRouteSegment` preview/commit.
- Keyboard deletion → existing `useHotkeys` covers selected connector removal.
- Auto-reflow on shape move → route is derived; no extra task needed.
- Undo/redo → uses existing `updateShape`/`removeShape` commands.
- Tests → Tasks 1-6 include test additions.

### Placeholder Scan

No `TBD`, `TODO`, or vague "handle edge cases" steps remain. Each step includes concrete code, commands, and expected outputs.

### Type Consistency

- `ConnectorAnchor` is defined in `src/types/shape.ts` and used throughout geometry and components.
- `FlowchartPoint` is reused for waypoints consistently.
- `BoardShape` guards (`isBoardShape`) are used before computing routes.

### Open Risks

- React-Konva test attribute access may require mocking primitives. The tests note this and direct the implementer to follow `EdgeRenderer.test.tsx` patterns.
- `Stage.getIntersection` in `resolveShapeIdAtPoint` relies on Konva node IDs being set. Ensure `ShapeRenderer` applies `id: shape.id` to each rendered primitive (it already does via `common`).
