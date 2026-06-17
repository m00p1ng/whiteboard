# Edge Waypoint Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users select a bend waypoint on an edge and delete it with `Delete`/`Backspace`; the edge automatically reroutes through the remaining waypoints.

**Architecture:** Extend the existing `FlowchartSelection` type with a `waypoint` variant, add a `removeEdgeWaypoint` store action, wire it into the hotkey handler, and teach `EdgeHandles` to report waypoint clicks and render a selected waypoint differently.

**Tech Stack:** React, TypeScript, React-Konva, Zustand, Vitest, Tailwind CSS

---

### Task 1: Extend `FlowchartSelection` to support waypoint selection

**Files:**
- Modify: `src/types/flowchart.ts:109-112`

- [ ] **Step 1: Add the waypoint variant**

```ts
export type FlowchartSelection =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | { type: 'waypoint'; edgeId: string; index: number }
  | null;
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/flowchart.ts
git commit -m "feat(types): add waypoint selection variant"
```

---

### Task 2: Add `removeEdgeWaypoint` store action

**Files:**
- Modify: `src/store/flowchartStore.ts`
- Test: `src/store/flowchartStore.test.ts`

- [ ] **Step 1: Add the action signature to `FlowchartActions`**

In `src/store/flowchartStore.ts`, add inside the `FlowchartActions` interface:

```ts
removeEdgeWaypoint: (id: string, index: number) => void;
```

- [ ] **Step 2: Implement the action**

Add the implementation inside the `useFlowchartStore` object, next to `removeEdge`:

```ts
removeEdgeWaypoint: (id, index) => {
  const edge = get().edges[id];
  if (!edge) return;
  const current = edge.waypoints ?? [];
  if (index < 0 || index >= current.length) return;
  const next = [...current.slice(0, index), ...current.slice(index + 1)];
  get().updateEdge(id, { waypoints: next.length > 0 ? next : undefined });
},
```

- [ ] **Step 3: Write the failing store test**

Add to `src/store/flowchartStore.test.ts`:

```ts
it('removes a waypoint and auto-reconnects the edge', () => {
  seedEdge({ waypoints: [{ x: 140, y: 90 }, { x: 140, y: 120 }] });

  useFlowchartStore.getState().removeEdgeWaypoint('e1', 0);

  expect(useFlowchartStore.getState().edges.e1.waypoints).toEqual([
    { x: 140, y: 120 },
  ]);
});

it('reverts to automatic routing when the last waypoint is removed', () => {
  seedEdge({ waypoints: [{ x: 140, y: 90 }] });

  useFlowchartStore.getState().removeEdgeWaypoint('e1', 0);

  expect(useFlowchartStore.getState().edges.e1.waypoints).toBeUndefined();
});

it('is a no-op for an invalid waypoint index', () => {
  seedEdge({ waypoints: [{ x: 140, y: 90 }] });
  const before = useFlowchartStore.getState().undoStack.length;

  useFlowchartStore.getState().removeEdgeWaypoint('e1', 5);

  expect(useFlowchartStore.getState().edges.e1.waypoints).toEqual([
    { x: 140, y: 90 },
  ]);
  expect(useFlowchartStore.getState().undoStack).toHaveLength(before);
});

it('undoes waypoint removal', () => {
  seedEdge({ waypoints: [{ x: 140, y: 90 }] });

  useFlowchartStore.getState().removeEdgeWaypoint('e1', 0);
  useFlowchartStore.getState().undo();

  expect(useFlowchartStore.getState().edges.e1.waypoints).toEqual([
    { x: 140, y: 90 },
  ]);
});
```

- [ ] **Step 4: Run the new tests and confirm they fail or pass**

Run: `npm test -- src/store/flowchartStore.test.ts`
Expected: all new tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/flowchartStore.ts src/store/flowchartStore.test.ts
git commit -m "feat(store): add removeEdgeWaypoint action"
```

---

### Task 3: Wire waypoint deletion into hotkeys

**Files:**
- Modify: `src/hooks/useFlowchartHotkeys.ts`
- Test: `src/hooks/useFlowchartHotkeys.test.ts`

- [ ] **Step 1: Destructure the new action**

In `src/hooks/useFlowchartHotkeys.ts`, update the destructured store hooks:

```ts
const {
  selection,
  tool,
  removeNode,
  removeEdge,
  removeEdgeWaypoint,
  undo,
  redo,
  setTool,
  setSelection,
  setViewport,
  setEditingNodeId,
  viewport,
} = useFlowchartStore();
```

- [ ] **Step 2: Handle waypoint deletion in the Delete block**

Replace the existing `Delete`/`Backspace` block with:

```ts
if (event.key === 'Delete' || event.key === 'Backspace') {
  if (selection?.type === 'node') {
    removeNode(selection.id);
  } else if (selection?.type === 'edge') {
    removeEdge(selection.id);
  } else if (selection?.type === 'waypoint') {
    removeEdgeWaypoint(selection.edgeId, selection.index);
  }
  return;
}
```

- [ ] **Step 3: Clear selection on Escape**

In the `Escape` handler, also clear selection:

```ts
if (event.key === 'Escape') {
  setTool('select');
  setSelection(null);
  return;
}
```

- [ ] **Step 4: Add `removeEdgeWaypoint` and `setSelection` to the dependency array**

Update the `useEffect` dependency array:

```ts
}, [
  selection,
  tool,
  removeNode,
  removeEdge,
  removeEdgeWaypoint,
  undo,
  redo,
  setTool,
  setSelection,
  setEditingNodeId,
  setViewport,
  viewport,
]);
```

- [ ] **Step 5: Write the failing hotkey test**

Add to `src/hooks/useFlowchartHotkeys.test.ts`:

```ts
function seedSelectedWaypoint() {
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
        waypoints: [{ x: 140, y: 90 }],
      },
    },
    selection: { type: 'waypoint', edgeId: 'e1', index: 0 },
    undoStack: [],
    redoStack: [],
  });
}

it('removes a selected waypoint on Delete', () => {
  seedSelectedWaypoint();
  renderHook(() => useFlowchartHotkeys());

  pressKey('Delete');

  expect(useFlowchartStore.getState().edges.e1.waypoints).toBeUndefined();
});

it('clears selection on Escape', () => {
  seedSelectedWaypoint();
  renderHook(() => useFlowchartHotkeys());

  pressKey('Escape');

  expect(useFlowchartStore.getState().selection).toBeNull();
});
```

- [ ] **Step 6: Run the hotkey tests**

Run: `npm test -- src/hooks/useFlowchartHotkeys.test.ts`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useFlowchartHotkeys.ts src/hooks/useFlowchartHotkeys.test.ts
git commit -m "feat(hotkeys): delete selected waypoint and clear selection on escape"
```

---

### Task 4: Make `EdgeHandles` selectable and visually highlight the selected waypoint

**Files:**
- Modify: `src/components/flowchart/EdgeHandles.tsx`
- Test: `src/components/flowchart/EdgeHandles.test.tsx`

- [ ] **Step 1: Add new props**

Update the `EdgeHandlesProps` interface:

```ts
export interface EdgeHandlesProps {
  points: number[];
  waypoints: FlowchartPoint[];
  selectedWaypointIndex?: number;
  onWaypointSelect?: (index: number) => void;
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

- [ ] **Step 2: Destructure the new props**

```ts
export function EdgeHandles({
  points,
  waypoints,
  selectedWaypointIndex,
  onWaypointSelect,
  onWaypointPreview,
  onWaypointCommit,
  onSegmentPreview,
  onSegmentCommit,
  onEndpointPreview,
  onEndpointCommit,
}: EdgeHandlesProps) {
```

- [ ] **Step 3: Update the bend handle rendering**

Replace the waypoint map block with:

```tsx
{waypoints.map((waypoint, index) => {
  const selected = selectedWaypointIndex === index;
  return (
    <Circle
      key={`bend-${index}`}
      data-testid={`edge-bend-${index}`}
      x={waypoint.x}
      y={waypoint.y}
      radius={5}
      fill={selected ? '#3b82f6' : '#ffffff'}
      stroke={selected ? '#ffffff' : '#3b82f6'}
      strokeWidth={2}
      draggable
      onMouseDown={stopPointer}
      onTouchStart={stopPointer}
      onClick={(event) => {
        event.cancelBubble = true;
        onWaypointSelect?.(index);
      }}
      onDragMove={(event) =>
        onWaypointPreview(index, {
          x: event.target.x(),
          y: event.target.y(),
        })
      }
      onDragEnd={(event) => {
        event.target.position(waypoint);
        onWaypointCommit();
      }}
    />
  );
})}
```

- [ ] **Step 4: Write the failing tests**

Add to `src/components/flowchart/EdgeHandles.test.tsx`:

```ts
it('selects a waypoint on click', () => {
  const onWaypointSelect = vi.fn();
  render(
    <EdgeHandles
      points={points}
      waypoints={waypoints}
      onWaypointSelect={onWaypointSelect}
      onWaypointPreview={() => {}}
      onWaypointCommit={() => {}}
      onSegmentPreview={() => {}}
      onSegmentCommit={() => {}}
      onEndpointPreview={() => {}}
      onEndpointCommit={() => {}}
    />
  );
  const handle = konva.circles.find(
    (props) => props['data-testid'] === 'edge-bend-1'
  )!;

  act(() => {
    (handle.onClick as (event: { cancelBubble: boolean }) => void)({
      cancelBubble: false,
    });
  });

  expect(handle['fill']).toBe('#ffffff');
  expect(onWaypointSelect).toHaveBeenCalledWith(1);
});

it('highlights the selected waypoint', () => {
  render(
    <EdgeHandles
      points={points}
      waypoints={waypoints}
      selectedWaypointIndex={0}
      onWaypointSelect={() => {}}
      onWaypointPreview={() => {}}
      onWaypointCommit={() => {}}
      onSegmentPreview={() => {}}
      onSegmentCommit={() => {}}
      onEndpointPreview={() => {}}
      onEndpointCommit={() => {}}
    />
  );
  const selected = konva.circles.find(
    (props) => props['data-testid'] === 'edge-bend-0'
  )!;
  const unselected = konva.circles.find(
    (props) => props['data-testid'] === 'edge-bend-1'
  )!;

  expect(selected['fill']).toBe('#3b82f6');
  expect(selected['stroke']).toBe('#ffffff');
  expect(unselected['fill']).toBe('#ffffff');
  expect(unselected['stroke']).toBe('#3b82f6');
});
```

- [ ] **Step 5: Run the EdgeHandles tests**

Run: `npm test -- src/components/flowchart/EdgeHandles.test.tsx`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/flowchart/EdgeHandles.tsx src/components/flowchart/EdgeHandles.test.tsx
git commit -m "feat(edge-handles): select waypoints and highlight selected pin"
```

---

### Task 5: Wire waypoint selection through `FlowchartCanvas`

**Files:**
- Modify: `src/components/flowchart/FlowchartCanvas.tsx`
- Test: `src/components/flowchart/FlowchartCanvas.test.tsx`

- [ ] **Step 1: Compute the selected waypoint index**

After `selectedEdgePoints` is computed, add:

```ts
const selectedWaypointIndex =
  selection?.type === 'waypoint' && selection.edgeId === selectedEdgeId
    ? selection.index
    : undefined;
```

- [ ] **Step 2: Add the selection handler**

Add near the other edge handle callbacks:

```ts
function handleWaypointSelect(index: number) {
  if (!selectedEdgeId) return;
  setSelection({ type: 'waypoint', edgeId: selectedEdgeId, index });
}
```

- [ ] **Step 3: Pass the new props to `EdgeHandles`**

Update the `EdgeHandles` JSX:

```tsx
<EdgeHandles
  points={
    activeEdgePreview?.edgeId === selectedEdge.id
      ? activeEdgePreview.points
      : selectedEdgePoints
  }
  waypoints={
    activeEdgePreview?.edgeId === selectedEdge.id
      ? activeEdgePreview.waypoints
      : selectedEdge.waypoints ??
        getManualWaypoints(selectedEdgePoints)
  }
  selectedWaypointIndex={selectedWaypointIndex}
  onWaypointSelect={handleWaypointSelect}
  onWaypointPreview={handleWaypointPreview}
  onWaypointCommit={commitEdgeWaypoints}
  onSegmentPreview={handleSegmentPreview}
  onSegmentCommit={commitEdgeWaypoints}
  onEndpointPreview={handleEndpointPreview}
  onEndpointCommit={handleEndpointCommit}
/>
```

- [ ] **Step 4: Write the failing canvas test**

Add to `src/components/flowchart/FlowchartCanvas.test.tsx`:

```ts
it('selects a waypoint when the edge handle reports selection', () => {
  seedEditableGraph();
  useFlowchartStore.setState({
    edges: {
      e1: {
        id: 'e1',
        fromNodeId: 'a',
        fromPort: 'right',
        toNodeId: 'b',
        toPort: 'left',
        style: {},
        waypoints: [{ x: 150, y: 80 }],
      },
    },
  });

  render(<FlowchartCanvas />);

  act(() => {
    (
      componentMock.edgeHandleProps?.onWaypointSelect as (
        index: number
      ) => void
    )(0);
  });

  expect(useFlowchartStore.getState().selection).toEqual({
    type: 'waypoint',
    edgeId: 'e1',
    index: 0,
  });
});

it('clears waypoint selection when clicking the stage', () => {
  seedEditableGraph();
  useFlowchartStore.setState({
    selection: { type: 'waypoint', edgeId: 'e1', index: 0 },
  });

  render(<FlowchartCanvas />);

  fireEvent.click(screen.getByRole('button', { name: 'stage click' }));

  expect(useFlowchartStore.getState().selection).toBeNull();
});
```

- [ ] **Step 5: Run the canvas tests**

Run: `npm test -- src/components/flowchart/FlowchartCanvas.test.tsx`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/flowchart/FlowchartCanvas.tsx src/components/flowchart/FlowchartCanvas.test.tsx
git commit -m "feat(canvas): wire waypoint selection into edge handles"
```

---

### Task 6: Full verification

**Files:**
- All modified files

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Run the linter**

Run: `npm run lint`
Expected: no lint errors.

- [ ] **Step 3: Run the TypeScript build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "test: verify edge waypoint deletion end-to-end"
```

---

## Self-Review

**Spec coverage:**
- Click a bend handle to select it → Task 4 + Task 5.
- `Delete`/`Backspace` removes the selected waypoint → Task 3.
- Edge auto-reconnects through remaining waypoints → Task 2.
- Falls back to automatic routing when no waypoints remain → Task 2.
- Whole-edge deletion remains intact → unchanged, verified by Task 6.
- Visual feedback for selected waypoint → Task 4.
- Undo support → Task 2.
- Escape clears selection → Task 3.
- Canvas click clears selection → Task 5.

**Placeholder scan:** No TBD/TODO/fill-in details found.

**Type consistency:** `removeEdgeWaypoint` signature matches usage in hotkeys. `FlowchartSelection` waypoint variant uses `edgeId`/`index` consistently across store, hotkeys, canvas, and edge handles.
