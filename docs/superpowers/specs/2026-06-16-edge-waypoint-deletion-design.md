# Edge Waypoint Deletion Design

## 1. Scope & Success Criteria

Allow users to delete individual bend waypoints ("pins") on a selected edge.
The edge automatically reroutes through the remaining waypoints.

**In scope:**
- Click a bend handle on a selected edge to select that waypoint.
- Press `Delete` or `Backspace` to remove the selected waypoint.
- The edge immediately reroutes through the remaining waypoints (auto-reconnect).
- If all manual waypoints are removed, the edge falls back to automatic orthogonal routing.
- Whole-edge deletion (existing behavior) continues to work via edge selection + `Delete` or the edge context menu.

**Out of scope:**
- Adding new waypoints.
- Multi-waypoint selection.
- Deleting source/target endpoint handles.
- Context-menu deletion for individual waypoints.

**Success criteria:** A user can select a bend handle, press `Delete`, and see the edge reconnect through the remaining waypoints with one undoable action.

## 2. Data Model Changes

Extend `FlowchartSelection` in `src/types/flowchart.ts`:

```ts
export type FlowchartSelection =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | { type: 'waypoint'; edgeId: string; index: number }
  | null;
```

No changes to `FlowchartEdge`; the existing optional `waypoints` array is used.

Add a new store action `removeEdgeWaypoint(edgeId: string, index: number)` in `src/store/flowchartStore.ts`. It creates an undoable `createUpdateEdgeCommand` that writes the filtered waypoint list.

## 3. Selection & Deletion Flow

1. User selects an edge (click or right-click). `EdgeHandles` renders bend handles from the edge's current waypoints, or from derived waypoints for automatic routes.
2. User **clicks** a bend handle. `EdgeHandles` fires `onWaypointSelect(edgeId, index)`, which sets `selection` to `{ type: 'waypoint', edgeId, index }`.
3. `useFlowchartHotkeys` detects a waypoint selection. On `Delete` or `Backspace`, it calls `removeEdgeWaypoint(edgeId, index)`.
4. `removeEdgeWaypoint` removes the waypoint and commits one undoable edge update.
5. The canvas re-renders; `computeOrthogonalPath` recalculates the route through the remaining waypoints.

Click-to-select must coexist with drag-to-move. Konva's `onClick` only fires when the pointer is released without dragging, so existing drag behavior is preserved.

## 4. Visual Feedback

- The selected waypoint renders with a filled `#3b82f6` circle and a white stroke so it stands out.
- Non-selected waypoints keep the current white fill / blue stroke style.
- The selected edge's visible path remains highlighted in blue, as it does today.

## 5. Auto-Reconnect Behavior

When a waypoint is removed:

- If the edge still has remaining waypoints, the router passes through them in order.
- If no waypoints remain, `waypoints` becomes `undefined` and the edge reverts to fully automatic orthogonal routing between its source and target ports.
- The router normalizes collinear and duplicate points, so removing a waypoint that was just a small kink may result in a straight segment.
- If the edge was originally automatic, the first deletion converts the remaining rendered bends into persisted manual waypoints, matching the existing pattern used by segment drag and bend drag.

## 6. Edge Cases & Error Handling

- **Invalid selection:** If the selected waypoint index is out of range or the edge no longer exists, `removeEdgeWaypoint` is a no-op.
- **Click vs. drag:** Konva's `onClick` only fires on release without movement, so clicking a waypoint selects it and dragging it moves it.
- **Last waypoint:** Deleting the last manual waypoint clears the `waypoints` array, reverting the edge to automatic routing.
- **Keyboard focus:** `Delete`/`Backspace` is ignored while editing text, consistent with existing behavior.
- **Deselection:** Clicking an empty area of the canvas or pressing `Escape` clears the waypoint selection, just like node and edge selection.
- **Undo:** Removing a waypoint is one undoable command; undo restores the waypoint and the previous route.

## 7. Testing

- `flowchartStore.test.ts`: `removeEdgeWaypoint` removes the correct waypoint, reverts to automatic routing when the waypoint list becomes empty, and is undoable/redoable.
- `EdgeHandles.test.tsx`: clicking a bend handle fires `onWaypointSelect` with the right index; dragging still fires `onWaypointPreview` and `onWaypointCommit`.
- `FlowchartCanvas.test.tsx`: selecting a waypoint and pressing `Delete` removes it and keeps the edge connected.
- `useFlowchartHotkeys.test.ts`: `Delete` removes a selected waypoint; ignored during text editing.

## 8. File Structure Changes

```
src/
  types/
    flowchart.ts              # extend FlowchartSelection
  store/
    flowchartStore.ts         # add removeEdgeWaypoint action
  hooks/
    useFlowchartHotkeys.ts    # handle waypoint selection delete
  components/flowchart/
    EdgeHandles.tsx           # onWaypointSelect + selected visual
    FlowchartCanvas.tsx       # wire onWaypointSelect, derive selectedWaypoint
```
