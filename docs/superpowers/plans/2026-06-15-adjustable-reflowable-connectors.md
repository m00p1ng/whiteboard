# Adjustable Reflowable Connectors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users reshape orthogonal connectors with persisted waypoints, reconnect endpoints to valid ports, and delete selected connectors with the keyboard while routes continue to reflow around moved nodes.

**Architecture:** Add optional world-space waypoints to `FlowchartEdge`. Keep routing and normalization pure in `orthogonalRouter`, put edit transformations in a new `edgeGeometry` utility, render the path and selection hit area in `EdgeRenderer`, and isolate drag handles in a new `EdgeHandles` component. `FlowchartCanvas` owns transient previews and port drop resolution; the Zustand store commits one undoable update per completed edit.

**Tech Stack:** TypeScript 6, React 19, Zustand 5, Konva/react-konva, Vitest, Testing Library.

---

## File Structure

- Modify `src/types/flowchart.ts`
  - Add the shared `FlowchartPoint` type and optional edge waypoints.
- Modify `src/utils/orthogonalRouter.ts`
  - Normalize routes and compute paths through manual waypoints.
- Modify `src/utils/orthogonalRouter.test.ts`
  - Cover compatibility, waypoint routing, reflow, and simplification.
- Create `src/utils/edgeGeometry.ts`
  - Convert rendered paths into editable waypoints and apply bend/segment edits.
- Create `src/utils/edgeGeometry.test.ts`
  - Cover automatic-edge conversion and orthogonal edit transformations.
- Modify `src/store/flowchartStore.ts`
  - Add validated undoable waypoint and endpoint actions.
- Modify `src/store/flowchartStore.test.ts`
  - Cover no-op validation, undo, and redo.
- Modify `src/components/flowchart/EdgeRenderer.tsx`
  - Accept preview points and add a wide transparent selection path.
- Modify `src/components/flowchart/EdgeRenderer.test.tsx`
  - Verify route selection and preview rendering.
- Create `src/components/flowchart/EdgeHandles.tsx`
  - Render bend, segment, and endpoint drag targets.
- Create `src/components/flowchart/EdgeHandles.test.tsx`
  - Verify handle visibility and callback payloads.
- Modify `src/components/flowchart/FlowchartCanvas.tsx`
  - Coordinate selected-edge previews, drag completion, and endpoint drops.
- Modify `src/components/flowchart/FlowchartCanvas.test.tsx`
  - Cover edge edit integration without disturbing the existing local test work.
- Modify `src/hooks/useFlowchartHotkeys.test.ts`
  - Cover edge deletion and editable-target protection.
- Modify `src/store/flowchartStore.integration.test.ts`
  - Verify edited connector reflow after node movement.

Execution note: the worktree already contains uncommitted changes in
`DraftLayer`, `NodeRenderer`, `FlowchartCanvas.test.tsx`, and `grid.ts`. Preserve
them. Read the current versions before each edit, stage only files belonging to
the current task, and never reset or overwrite unrelated changes.

### Task 1: Add Waypoint-Aware Routing And Normalization

**Files:**
- Modify: `src/types/flowchart.ts`
- Modify: `src/utils/orthogonalRouter.ts`
- Test: `src/utils/orthogonalRouter.test.ts`

- [ ] **Step 1: Write failing type and router tests**

Add `FlowchartPoint` imports and tests equivalent to:

```ts
it('preserves the existing route when no waypoints are provided', () => {
  expect(computeOrthogonalPath(source, 'right', target, 'left')).toEqual([
    100, 30, 108, 30, 108, 105, 192, 105, 192, 180, 200, 180,
  ]);
});

it('routes through fixed world-space waypoints', () => {
  expect(
    computeOrthogonalPath(source, 'right', target, 'left', 8, [
      { x: 140, y: 30 },
      { x: 140, y: 180 },
    ])
  ).toEqual([
    100, 30, 108, 30, 140, 30, 140, 180, 192, 180, 200, 180,
  ]);
});

it('removes duplicate and collinear interior points', () => {
  expect(
    normalizeOrthogonalPoints([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 30 },
    ])
  ).toEqual([
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 40, y: 30 },
  ]);
});

it('keeps manual waypoints fixed when a node moves', () => {
  const waypoints = [{ x: 140, y: 30 }, { x: 140, y: 180 }];
  const movedSource = { ...source, x: 20, y: 40 };

  const path = computeOrthogonalPath(
    movedSource,
    'right',
    target,
    'left',
    8,
    waypoints
  );

  expect(path).toContain(140);
  expect(waypoints).toEqual([
    { x: 140, y: 30 },
    { x: 140, y: 180 },
  ]);
});
```

- [ ] **Step 2: Run the router tests and verify failure**

Run:

```bash
rtk npm test -- src/utils/orthogonalRouter.test.ts
```

Expected: FAIL because `FlowchartPoint`, `waypoints`, and
`normalizeOrthogonalPoints` do not exist.

- [ ] **Step 3: Add the waypoint type**

In `src/types/flowchart.ts`, add:

```ts
export interface FlowchartPoint {
  x: number;
  y: number;
}

export interface FlowchartEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort: PortId;
  toPort: PortId;
  label?: string;
  waypoints?: FlowchartPoint[];
  style: EdgeStyle;
}
```

- [ ] **Step 4: Implement normalization and waypoint routing**

Keep the old no-waypoint branch byte-for-byte compatible. Add exported helpers
with these signatures:

```ts
export function normalizeOrthogonalPoints(
  points: FlowchartPoint[]
): FlowchartPoint[];

export function flattenPoints(points: FlowchartPoint[]): number[];

export function expandPoints(points: number[]): FlowchartPoint[];

export function computeOrthogonalPath(
  source: FlowchartNode,
  sourcePort: PortId,
  target: FlowchartNode,
  targetPort: PortId,
  margin?: number,
  waypoints?: FlowchartPoint[]
): number[];
```

Implement normalization as a loop that first removes consecutive duplicates,
then removes any middle point where all three x values or all three y values
match, repeating until stable:

```ts
export function normalizeOrthogonalPoints(
  input: FlowchartPoint[]
): FlowchartPoint[] {
  let points = input.filter(
    (point, index) =>
      index === 0 ||
      point.x !== input[index - 1].x ||
      point.y !== input[index - 1].y
  );

  let changed = true;
  while (changed) {
    changed = false;
    const next = points.filter((point, index) => {
      if (index === 0 || index === points.length - 1) return true;
      const previous = points[index - 1];
      const following = points[index + 1];
      const collinear =
        (previous.x === point.x && point.x === following.x) ||
        (previous.y === point.y && point.y === following.y);
      if (collinear) changed = true;
      return !collinear;
    });
    points = next;
  }

  return points;
}
```

For a non-empty waypoint list, construct:

```ts
const anchors = [sourcePoint, sourceExit, ...waypoints, targetEntry, targetPoint];
```

Append each anchor through an axis-aligned elbow when the previous point is
diagonal. Prefer an elbow that preserves the outgoing direction of the
previous segment; use `{ x: next.x, y: previous.y }` as the deterministic
fallback. Normalize once after all anchors are appended.

- [ ] **Step 5: Run router tests**

Run:

```bash
rtk npm test -- src/utils/orthogonalRouter.test.ts
```

Expected: PASS, including all pre-existing exact-route assertions.

- [ ] **Step 6: Commit routing support**

```bash
rtk git add src/types/flowchart.ts src/utils/orthogonalRouter.ts src/utils/orthogonalRouter.test.ts
rtk git commit -m "feat(edges): route through waypoints"
```

### Task 2: Add Pure Edge Edit Geometry

**Files:**
- Create: `src/utils/edgeGeometry.ts`
- Create: `src/utils/edgeGeometry.test.ts`

- [ ] **Step 1: Write failing edit geometry tests**

Cover these public functions:

```ts
import {
  getManualWaypoints,
  moveWaypoint,
  offsetRouteSegment,
} from './edgeGeometry';

it('converts an automatic route to interior manual waypoints', () => {
  expect(
    getManualWaypoints([
      100, 30,
      108, 30,
      108, 105,
      192, 105,
      192, 180,
      200, 180,
    ])
  ).toEqual([
    { x: 108, y: 105 },
    { x: 192, y: 105 },
  ]);
});

it('moves one persisted waypoint without mutating the input', () => {
  const input = [{ x: 120, y: 80 }, { x: 180, y: 80 }];
  expect(moveWaypoint(input, 0, { x: 130, y: 100 })).toEqual([
    { x: 130, y: 100 },
    { x: 180, y: 80 },
  ]);
  expect(input[0]).toEqual({ x: 120, y: 80 });
});

it('offsets an interior horizontal segment with two bends', () => {
  const route = [
    0, 0,
    8, 0,
    40, 40,
    100, 40,
    132, 80,
    140, 80,
  ];
  expect(offsetRouteSegment(route, 2, { x: 0, y: 20 })).toEqual([
    { x: 40, y: 60 },
    { x: 100, y: 60 },
  ]);
});

it('ignores movement parallel to the segment', () => {
  const route = [
    0, 0,
    8, 0,
    40, 40,
    100, 40,
    132, 80,
    140, 80,
  ];
  expect(offsetRouteSegment(route, 2, { x: 30, y: 0 })).toEqual(
    getManualWaypoints(route)
  );
});
```

The segment index identifies the segment from point `index` to `index + 1`.
Indexes `0` and `pointCount - 2` are invalid because endpoint-adjacent
segments are owned by endpoint handles.

- [ ] **Step 2: Run the new tests and verify failure**

Run:

```bash
rtk npm test -- src/utils/edgeGeometry.test.ts
```

Expected: FAIL because `edgeGeometry.ts` does not exist.

- [ ] **Step 3: Implement the pure geometry API**

Create:

```ts
import type { FlowchartPoint } from '@/types/flowchart';
import {
  expandPoints,
  normalizeOrthogonalPoints,
} from './orthogonalRouter';

export function getManualWaypoints(route: number[]): FlowchartPoint[] {
  const points = normalizeOrthogonalPoints(expandPoints(route));
  return points.slice(2, -2);
}

export function moveWaypoint(
  waypoints: FlowchartPoint[],
  index: number,
  position: FlowchartPoint
): FlowchartPoint[] {
  if (!waypoints[index]) return waypoints;
  return waypoints.map((point, pointIndex) =>
    pointIndex === index ? position : point
  );
}

export function offsetRouteSegment(
  route: number[],
  segmentIndex: number,
  delta: FlowchartPoint
): FlowchartPoint[] {
  const points = normalizeOrthogonalPoints(expandPoints(route));
  if (segmentIndex <= 0 || segmentIndex >= points.length - 2) {
    return points.slice(2, -2);
  }

  const start = points[segmentIndex];
  const end = points[segmentIndex + 1];
  const next = points.map((point) => ({ ...point }));

  if (start.y === end.y) {
    next[segmentIndex].y += delta.y;
    next[segmentIndex + 1].y += delta.y;
  } else if (start.x === end.x) {
    next[segmentIndex].x += delta.x;
    next[segmentIndex + 1].x += delta.x;
  }

  const sourceExit = points[1];
  const targetEntry = points.at(-2);
  return normalizeOrthogonalPoints(next.slice(1, -1)).filter(
    (point) =>
      (point.x !== sourceExit.x || point.y !== sourceExit.y) &&
      (!targetEntry ||
        point.x !== targetEntry.x ||
        point.y !== targetEntry.y)
  );
}
```

This filtering removes unchanged derived port exit/entry points. If the dragged
segment moves either one, its new position remains as an intentional manual
bend. If normalization removes every manual bend, return `[]`; the store will
clear `waypoints` and restore automatic routing.

- [ ] **Step 4: Run geometry and router tests**

Run:

```bash
rtk npm test -- src/utils/edgeGeometry.test.ts src/utils/orthogonalRouter.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit edit geometry**

```bash
rtk git add src/utils/edgeGeometry.ts src/utils/edgeGeometry.test.ts
rtk git commit -m "feat(edges): add edit geometry"
```

### Task 3: Add Validated Undoable Edge Actions

**Files:**
- Modify: `src/store/flowchartStore.ts`
- Test: `src/store/flowchartStore.test.ts`
- Test: `src/utils/flowchartCommands.test.ts`

- [ ] **Step 1: Write failing store tests**

Add tests for:

```ts
const nodeA: FlowchartNode = {
  id: 'a',
  type: 'process',
  x: 0,
  y: 0,
  width: 100,
  height: 60,
  style: {},
};
const nodeB: FlowchartNode = {
  ...nodeA,
  id: 'b',
  x: 200,
};
const nodeC: FlowchartNode = {
  ...nodeA,
  id: 'c',
  x: 400,
};

function seedEdge(overrides: Partial<FlowchartEdge> = {}) {
  const edge: FlowchartEdge = {
    id: 'e1',
    fromNodeId: 'a',
    fromPort: 'right',
    toNodeId: 'b',
    toPort: 'left',
    style: {},
    ...overrides,
  };
  useFlowchartStore.setState({
    nodes: { a: nodeA, b: nodeB, c: nodeC },
    edges: { e1: edge },
    selection: { type: 'edge', id: 'e1' },
    undoStack: [],
    redoStack: [],
  });
}

it('updates waypoints with undo and redo', () => {
  seedEdge();
  const store = useFlowchartStore.getState();

  store.setEdgeWaypoints('e1', [{ x: 140, y: 90 }]);
  expect(useFlowchartStore.getState().edges.e1.waypoints).toEqual([
    { x: 140, y: 90 },
  ]);

  useFlowchartStore.getState().undo();
  expect(useFlowchartStore.getState().edges.e1.waypoints).toBeUndefined();

  useFlowchartStore.getState().redo();
  expect(useFlowchartStore.getState().edges.e1.waypoints).toEqual([
    { x: 140, y: 90 },
  ]);
});

it('clears waypoints when normalization leaves no bends', () => {
  seedEdge({ waypoints: [{ x: 140, y: 90 }] });
  useFlowchartStore.getState().setEdgeWaypoints('e1', []);
  expect(useFlowchartStore.getState().edges.e1.waypoints).toBeUndefined();
});

it('reconnects one endpoint and preserves waypoints', () => {
  seedEdge({ waypoints: [{ x: 140, y: 90 }] });
  useFlowchartStore.getState().reconnectEdge('e1', 'target', 'c', 'top');
  const edge = useFlowchartStore.getState().edges.e1;
  expect(edge.toNodeId).toBe('c');
  expect(edge.toPort).toBe('top');
  expect(edge.waypoints).toEqual([{ x: 140, y: 90 }]);
});

it('rejects self and duplicate reconnections without history', () => {
  seedEdge();
  useFlowchartStore.setState((state) => ({
    edges: {
      ...state.edges,
      e2: {
        id: 'e2',
        fromNodeId: 'a',
        fromPort: 'right',
        toNodeId: 'c',
        toPort: 'left',
        style: {},
      },
    },
  }));
  const before = useFlowchartStore.getState().undoStack.length;
  useFlowchartStore.getState().reconnectEdge('e1', 'target', 'a', 'left');
  useFlowchartStore.getState().reconnectEdge('e1', 'target', 'c', 'left');
  expect(useFlowchartStore.getState().undoStack).toHaveLength(before);
});
```

Also extend `flowchartCommands.test.ts` with one
`createUpdateEdgeCommand` do/undo assertion so waypoint arrays and endpoint
fields are proven to restore correctly.

- [ ] **Step 2: Run store tests and verify failure**

Run:

```bash
rtk npm test -- src/store/flowchartStore.test.ts src/utils/flowchartCommands.test.ts
```

Expected: FAIL because the new store actions do not exist.

- [ ] **Step 3: Add store action signatures**

Add:

```ts
setEdgeWaypoints: (id: string, waypoints: FlowchartPoint[]) => void;
reconnectEdge: (
  id: string,
  endpoint: 'source' | 'target',
  nodeId: string,
  port: PortId
) => void;
```

- [ ] **Step 4: Implement waypoint commits**

Normalize a copied waypoint list. Convert an empty list to `undefined`, skip an
update when the serialized old and new values match, then call the existing
undoable `updateEdge`:

```ts
setEdgeWaypoints: (id, waypoints) => {
  const edge = get().edges[id];
  if (!edge) return;
  const normalized = normalizeOrthogonalPoints(waypoints);
  const next = normalized.length > 0 ? normalized : undefined;
  if (JSON.stringify(edge.waypoints) === JSON.stringify(next)) return;
  get().updateEdge(id, { waypoints: next });
},
```

- [ ] **Step 5: Implement validated endpoint reconnection**

Build the candidate fields first. Reject when:

- source and target node IDs match;
- either candidate node is missing; or
- another edge already has the exact candidate source node, source port,
  target node, and target port.

Then call `updateEdge` once with only the changed endpoint fields. Preserve
`waypoints`.

- [ ] **Step 6: Run store and command tests**

Run:

```bash
rtk npm test -- src/store/flowchartStore.test.ts src/utils/flowchartCommands.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit edge actions**

```bash
rtk git add src/store/flowchartStore.ts src/store/flowchartStore.test.ts src/utils/flowchartCommands.test.ts
rtk git commit -m "feat(edges): persist connector edits"
```

### Task 4: Make Connector Selection Practical

**Files:**
- Modify: `src/components/flowchart/EdgeRenderer.tsx`
- Test: `src/components/flowchart/EdgeRenderer.test.tsx`

- [ ] **Step 1: Replace the smoke test with interaction assertions**

Mock `react-konva` primitives so their props are inspectable. Add tests that:

```ts
it('renders a wide transparent hit path that selects the edge', () => {
  const onClick = vi.fn();
  render(<EdgeRenderer edge={edge} nodes={nodes} onClick={onClick} />);
  fireEvent.click(screen.getByTestId('edge-hit-path'));
  expect(onClick).toHaveBeenCalledOnce();
});

it('renders preview points instead of the stored route', () => {
  render(
    <EdgeRenderer
      edge={edge}
      nodes={nodes}
      previewPoints={[100, 30, 150, 30, 150, 180, 200, 180]}
    />
  );
  expect(readProps('edge-visible-path').points).toEqual([
    100, 30, 150, 30, 150, 180, 200, 180,
  ]);
});
```

- [ ] **Step 2: Run the renderer test and verify failure**

Run:

```bash
rtk npm test -- src/components/flowchart/EdgeRenderer.test.tsx
```

Expected: FAIL because there is no hit path or `previewPoints` prop.

- [ ] **Step 3: Add preview and hit-path rendering**

Extend props:

```ts
previewPoints?: number[];
```

Compute:

```ts
const points =
  previewPoints ??
  computeOrthogonalPath(
    source,
    edge.fromPort,
    target,
    edge.toPort,
    8,
    edge.waypoints
  );
```

Render a transparent `Line` before the visible `Arrow`:

```tsx
<Line
  data-testid="edge-hit-path"
  points={points}
  stroke="rgba(0,0,0,0.001)"
  strokeWidth={Math.max(strokeWidth + 12, 14)}
  hitStrokeWidth={Math.max(strokeWidth + 12, 14)}
  onClick={select}
  onTap={select}
/>
```

Move selection handlers from the non-listening group to the hit path. Keep the
visible arrow and label `listening={false}`. Derive the label position from the
middle route point, not `points.length - 4`.

- [ ] **Step 4: Run renderer tests**

Run:

```bash
rtk npm test -- src/components/flowchart/EdgeRenderer.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit selection rendering**

```bash
rtk git add src/components/flowchart/EdgeRenderer.tsx src/components/flowchart/EdgeRenderer.test.tsx
rtk git commit -m "feat(edges): add connector hit path"
```

### Task 5: Build Isolated Edge Drag Handles

**Files:**
- Create: `src/components/flowchart/EdgeHandles.tsx`
- Create: `src/components/flowchart/EdgeHandles.test.tsx`

- [ ] **Step 1: Write failing handle tests**

Mock `Group`, `Circle`, and `Line`. Test the public contract:

```ts
interface EdgeHandlesProps {
  points: number[];
  waypoints: FlowchartPoint[];
  onWaypointPreview: (index: number, point: FlowchartPoint) => void;
  onWaypointCommit: () => void;
  onSegmentPreview: (
    segmentIndex: number,
    delta: FlowchartPoint
  ) => void;
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
```

Assertions:

- endpoint circles render at the first and last points;
- bend circles render from the supplied manual waypoints, preserving indexes;
- segment drag targets omit the first and last segments;
- a bend drag emits its manual waypoint index and world position;
- a horizontal segment emits only vertical delta;
- a vertical segment emits only horizontal delta;
- mouse and touch start cancel bubbling.

- [ ] **Step 2: Run handle tests and verify failure**

Run:

```bash
rtk npm test -- src/components/flowchart/EdgeHandles.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement handle derivation**

Normalize `expandPoints(points)`. Render:

- endpoint `Circle` handles with radius `6`;
- one bend `Circle` per supplied waypoint with radius `5`;
- interior transparent `Line` segment targets with stroke width `14`.

Use stable test IDs:

```tsx
data-testid="edge-endpoint-source"
data-testid="edge-endpoint-target"
data-testid={`edge-bend-${index}`}
data-testid={`edge-segment-${index}`}
```

Capture each Konva node's start position in `onDragStart`. In `onDragMove`,
calculate world-space deltas from `event.target.x()` and `event.target.y()`,
emit the appropriate preview callback, and reset the draggable interaction
node to its original coordinates so only the preview route moves visually.
Call the matching commit callback exactly once in `onDragEnd`.

- [ ] **Step 4: Run handle tests**

Run:

```bash
rtk npm test -- src/components/flowchart/EdgeHandles.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the handle component**

```bash
rtk git add src/components/flowchart/EdgeHandles.tsx src/components/flowchart/EdgeHandles.test.tsx
rtk git commit -m "feat(edges): add connector handles"
```

### Task 6: Integrate Editing And Endpoint Drops In The Canvas

**Files:**
- Modify: `src/components/flowchart/FlowchartCanvas.tsx`
- Modify: `src/components/flowchart/FlowchartCanvas.test.tsx`

- [ ] **Step 1: Read and preserve existing local canvas test changes**

Run:

```bash
rtk git diff -- src/components/flowchart/FlowchartCanvas.test.tsx
```

Expected: existing uncommitted Stage mocks and node-creation tests. Extend
those mocks; do not replace or revert them.

- [ ] **Step 2: Add failing canvas integration tests**

Extend the `EdgeRenderer` mock to expose `previewPoints` and `onClick`. Mock
`EdgeHandles` with buttons that invoke each callback. Add tests for:

```ts
let latestEdgeRendererProps:
  | {
      previewPoints?: number[];
      onClick?: () => void;
    }
  | undefined;
let latestEdgeHandleProps: EdgeHandlesProps | undefined;

vi.mock('./EdgeRenderer', () => ({
  EdgeRenderer: (props: typeof latestEdgeRendererProps) => {
    latestEdgeRendererProps = props;
    return <button data-testid="edge" onClick={props?.onClick} />;
  },
}));

vi.mock('./EdgeHandles', () => ({
  EdgeHandles: (props: EdgeHandlesProps) => {
    latestEdgeHandleProps = props;
    return <div data-testid="edge-handles" />;
  },
}));

function seedEditableGraph() {
  useFlowchartStore.setState({
    nodes: {
      a: {
        id: 'a',
        type: 'process',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
        style: {},
      },
      b: {
        id: 'b',
        type: 'process',
        x: 200,
        y: 0,
        width: 100,
        height: 60,
        style: {},
      },
      c: {
        id: 'c',
        type: 'process',
        x: 400,
        y: 100,
        width: 100,
        height: 60,
        style: {},
      },
    },
    edges: {
      e1: {
        id: 'e1',
        fromNodeId: 'a',
        fromPort: 'right',
        toNodeId: 'b',
        toPort: 'left',
        style: {},
      },
    },
    selection: { type: 'edge', id: 'e1' },
    undoStack: [],
    redoStack: [],
  });
}

it('shows handles only for the selected edge', () => {
  seedEditableGraph();
  render(<FlowchartCanvas />);
  expect(screen.getByTestId('edge-handles')).toBeInTheDocument();
});

it('commits one waypoint update after a bend preview', () => {
  seedEditableGraph();
  render(<FlowchartCanvas />);

  act(() => {
    latestEdgeHandleProps?.onWaypointPreview(0, { x: 150, y: 80 });
  });
  expect(latestEdgeRendererProps?.previewPoints).toBeDefined();

  act(() => {
    latestEdgeHandleProps?.onWaypointCommit();
  });
  expect(useFlowchartStore.getState().edges.e1.waypoints).toContainEqual({
    x: 150,
    y: 80,
  });
  expect(useFlowchartStore.getState().undoStack).toHaveLength(1);
});

it('cancels an endpoint drop outside a port', () => {
  seedEditableGraph();
  render(<FlowchartCanvas />);

  act(() => {
    latestEdgeHandleProps?.onEndpointCommit('target', {
      x: 1000,
      y: 1000,
    });
  });
  expect(useFlowchartStore.getState().edges.e1.toNodeId).toBe('b');
  expect(useFlowchartStore.getState().undoStack).toHaveLength(0);
});

it('reconnects an endpoint dropped on a visible port', () => {
  seedEditableGraph();
  render(<FlowchartCanvas />);

  act(() => {
    latestEdgeHandleProps?.onEndpointCommit('target', { x: 450, y: 100 });
  });
  expect(useFlowchartStore.getState().edges.e1).toMatchObject({
    toNodeId: 'c',
    toPort: 'top',
  });
  expect(useFlowchartStore.getState().undoStack).toHaveLength(1);
});
```

- [ ] **Step 3: Run canvas tests and verify failure**

Run:

```bash
rtk npm test -- src/components/flowchart/FlowchartCanvas.test.tsx
```

Expected: FAIL because the selected-edge editing state is absent.

- [ ] **Step 4: Add transient selected-edge preview state**

Add:

```ts
const [edgePreview, setEdgePreview] = useState<{
  edgeId: string;
  points: number[];
  waypoints: FlowchartPoint[];
} | null>(null);
```

Read `setEdgeWaypoints` and `reconnectEdge` from the store. Compute the selected
edge route with `edge.waypoints`. Clear stale preview state when selection
changes or the selected edge disappears.

- [ ] **Step 5: Implement bend and segment preview callbacks**

For the first bend edit of an automatic edge, seed candidate waypoints with
`getManualWaypoints(selectedRoute)`, then call `moveWaypoint`. For a segment
preview, always call `offsetRouteSegment` with the currently rendered route;
that helper converts the changed interior geometry into manual waypoints while
discarding unchanged derived exit/entry points. Recompute preview points
through `computeOrthogonalPath`.

On drag end:

```ts
setEdgeWaypoints(edge.id, edgePreview.waypoints);
setEdgePreview(null);
```

Do not call the store during drag move.

- [ ] **Step 6: Implement endpoint preview and port drop resolution**

Add:

```ts
function portAtPoint(
  point: FlowchartPoint,
  radius = 10 / viewport.scale
): { nodeId: string; port: PortId } | null
```

Iterate every node and four ports, returning the closest port within `radius`.
During preview, create a two-pixel temporary node centered on the pointer and
route the dragged side to it while preserving the opposite side and manual
waypoints.

On commit, call `portAtPoint`. If it returns `null`, clear preview only. If it
returns a port, call:

```ts
reconnectEdge(edge.id, endpoint, target.nodeId, target.port);
```

The store remains the final validator for self and duplicate edges.

- [ ] **Step 7: Render preview routes and selected handles**

Pass:

```tsx
previewPoints={
  edgePreview?.edgeId === edge.id ? edgePreview.points : undefined
}
```

to `EdgeRenderer`. Render `EdgeHandles` in the interaction layer only when a
valid edge is selected, using preview points when present and the computed
route otherwise. Supply:

```ts
edgePreview?.waypoints ??
  edge.waypoints ??
  getManualWaypoints(selectedRoute)
```

as its `waypoints` prop so bend callback indexes map to persisted waypoint
indexes.

Cancel bubbling in every handle callback so editing does not pan or deselect
the canvas.

- [ ] **Step 8: Run canvas and component tests**

Run:

```bash
rtk npm test -- src/components/flowchart/FlowchartCanvas.test.tsx src/components/flowchart/EdgeHandles.test.tsx src/components/flowchart/EdgeRenderer.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit canvas integration without staging unrelated files**

```bash
rtk git add src/components/flowchart/FlowchartCanvas.tsx src/components/flowchart/FlowchartCanvas.test.tsx
rtk git commit -m "feat(edges): edit connectors on canvas"
```

Before committing, inspect `rtk git diff --cached` and confirm the staged
`FlowchartCanvas.test.tsx` diff includes both the pre-existing local test work
and the connector additions intentionally. If the pre-existing changes belong
to the user and should not be committed with this feature, leave the file
unstaged and defer this commit until ownership is resolved.

### Task 7: Complete Keyboard And Reflow Coverage

**Files:**
- Modify: `src/hooks/useFlowchartHotkeys.test.ts`
- Modify: `src/store/flowchartStore.integration.test.ts`

- [ ] **Step 1: Add failing hotkey tests**

Add:

```ts
function seedSelectedEdge() {
  useFlowchartStore.setState({
    nodes: {
      a: {
        id: 'a',
        type: 'process',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
        style: {},
      },
      b: {
        id: 'b',
        type: 'process',
        x: 200,
        y: 0,
        width: 100,
        height: 60,
        style: {},
      },
    },
    edges: {
      e1: {
        id: 'e1',
        fromNodeId: 'a',
        fromPort: 'right',
        toNodeId: 'b',
        toPort: 'left',
        style: {},
      },
    },
    selection: { type: 'edge', id: 'e1' },
    undoStack: [],
    redoStack: [],
  });
}

it.each(['Delete', 'Backspace'])(
  'removes a selected edge with %s',
  (key) => {
    seedSelectedEdge();
    renderHook(() => useFlowchartHotkeys());
    pressKey(key);
    expect(useFlowchartStore.getState().edges.e1).toBeUndefined();
    expect(useFlowchartStore.getState().selection).toBeNull();
  }
);

it('does not delete an edge while an editable control has focus', () => {
  seedSelectedEdge();
  renderHook(() => useFlowchartHotkeys());
  const input = document.createElement('input');
  document.body.append(input);
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
  );
  expect(useFlowchartStore.getState().edges.e1).toBeDefined();
  input.remove();
});

it('does not delete an edge from a contenteditable element', () => {
  seedSelectedEdge();
  renderHook(() => useFlowchartHotkeys());
  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  document.body.append(editor);
  editor.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true })
  );
  expect(useFlowchartStore.getState().edges.e1).toBeDefined();
  editor.remove();
});
```

The implementation currently ignores inputs and textareas but not generic
editable elements.

- [ ] **Step 2: Add the reflow integration test**

Create an edge with fixed waypoints, move its source node, recompute both
routes, and assert:

```ts
expect(useFlowchartStore.getState().edges.e1.waypoints).toEqual(waypoints);
expect(after.slice(0, 4)).not.toEqual(before.slice(0, 4));
expect(after).toContain(waypoints[0].x);
expect(after).toContain(waypoints[0].y);
```

- [ ] **Step 3: Run tests and verify the contenteditable case fails**

Run:

```bash
rtk npm test -- src/hooks/useFlowchartHotkeys.test.ts src/store/flowchartStore.integration.test.ts
```

Expected: edge deletion tests pass with current behavior; the
`contenteditable` protection test fails.

- [ ] **Step 4: Harden editable-target detection**

In `useFlowchartHotkeys.ts`, replace the input/textarea check with:

```ts
const target = event.target;
if (
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement)
) {
  return;
}
```

- [ ] **Step 5: Run hotkey and integration tests**

Run:

```bash
rtk npm test -- src/hooks/useFlowchartHotkeys.test.ts src/store/flowchartStore.integration.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit keyboard and reflow coverage**

```bash
rtk git add src/hooks/useFlowchartHotkeys.ts src/hooks/useFlowchartHotkeys.test.ts src/store/flowchartStore.integration.test.ts
rtk git commit -m "test(edges): cover deletion and reflow"
```

### Task 8: Full Verification And Manual Browser Check

**Files:**
- Verify all modified files
- No new production files expected

- [ ] **Step 1: Run focused connector tests**

```bash
rtk npm test -- src/utils/orthogonalRouter.test.ts src/utils/edgeGeometry.test.ts src/store/flowchartStore.test.ts src/utils/flowchartCommands.test.ts src/components/flowchart/EdgeRenderer.test.tsx src/components/flowchart/EdgeHandles.test.tsx src/components/flowchart/FlowchartCanvas.test.tsx src/hooks/useFlowchartHotkeys.test.ts src/store/flowchartStore.integration.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the complete automated suite**

```bash
rtk npm test
rtk npm run lint
rtk npm run build
```

Expected: all tests pass, ESLint exits zero, and TypeScript/Vite build exits
zero.

- [ ] **Step 3: Start the app**

```bash
rtk npm run dev
```

Expected: Vite prints a local URL, normally `http://localhost:5173`.

- [ ] **Step 4: Verify the workflow in the in-app browser**

Using the Browser plugin:

1. Open the local Vite URL.
2. Create three nodes.
3. Connect two nodes.
4. Click the connector on a thin segment and confirm it selects.
5. Drag an automatic bend and confirm the route remains orthogonal.
6. Drag an interior segment perpendicular to itself and confirm two bends
   appear.
7. Align bends on the same axis and confirm they collapse into one segment.
8. Move a connected node and confirm manual bends stay fixed while the endpoint
   section reflows.
9. Drag an endpoint to a port on the third node and confirm reconnection.
10. Drag an endpoint to empty canvas and confirm cancellation.
11. Press `Delete`, undo, then redo and confirm connector removal is reversible.

- [ ] **Step 5: Inspect final repository state**

```bash
rtk git status --short
rtk git log --oneline -8
```

Expected: only the user's pre-existing unrelated work remains uncommitted.
Connector work is represented by the task commits above.
