# Node/Edge Context Menu Design

## 1. Scope & Success Criteria

Add a right-click context menu on flowchart nodes and edges with ordering,
duplicate, and delete actions.

**In scope:**
- Right-click (`contextmenu`) on a node opens a small menu at the cursor.
- Node menu offers: Bring to Front, Bring Forward, Send Backward, Send to Back,
  Duplicate, Delete.
- Right-click on an edge opens the same-style menu with **Delete** only.
- Right-click selects the target node or edge.
- Ordering changes are undoable/redoable via the existing command stack.
- Duplicate creates an undoable copy of the node.
- Menu closes on action, Escape, click/pointerdown elsewhere, or viewport
  pan/zoom/scroll.

**Out of scope:**
- Context menu for the empty canvas (no actionable items there).
- Multi-select — menu operates on the single right-clicked item.
- Copy/paste clipboard integration.

**Success criteria:** Right-clicking a node shows the ordering + duplicate +
delete menu; choosing an action performs the expected operation and is
undoable. Right-clicking an edge shows Delete only.

## 2. Z-Order Model

`nodes: Record<string, FlowchartNode>` already determines render order via
`Object.values(nodes)` insertion order (lowest = back, highest = front). No
new field is added to `FlowchartNode` — reordering rebuilds the record with a
new key order, matching the legacy shape context-menu design.

## 3. Command Layer Changes

`src/utils/flowchartCommands.ts`:
- Add `createReorderNodesCommand(prevOrder: string[], nextOrder: string[]): Command`.
  - `do`: rebuild `state.nodes` as a new object iterating `nextOrder`.
  - `undo`: rebuild `state.nodes` as a new object iterating `prevOrder`.

`src/store/flowchartStore.ts`:
- New actions, each computing `prevOrder = Object.keys(get().nodes)` and a
  `nextOrder`, then `execute(createReorderNodesCommand(prevOrder, nextOrder))`:
  - `bringNodeToFront(id)`: move `id` to the end of the order.
  - `sendNodeToBack(id)`: move `id` to the start of the order.
  - `bringNodeForward(id)`: swap `id` with the next key. No-op if already last.
  - `sendNodeBackward(id)`: swap `id` with the previous key. No-op if already
    first.
  - If `id` is not in `nodes`, or the action is a no-op, do not call
    `execute` (avoid pushing a useless undo entry).
- New action `duplicateNode(id)`:
  - Looks up the source node; no-op if missing.
  - Creates a copy with a new UUID, `x + 20`, `y + 20`, same type, size,
    style, and label.
  - Executes `createAddNodeCommand(copy)`.
  - Sets selection to the duplicated node and switches tool to `select`.

## 4. UI Components

### `NodeRenderer.tsx` and `EdgeRenderer.tsx`
- Add `onContextMenu?: (e: KonvaEventObject<PointerEvent>) => void` to props
  and wire it to the underlying Konva Group/Line.
- Forward the raw Konva event to `FlowchartCanvas`; `FlowchartCanvas` calls
  `event.evt.preventDefault()` so the browser's native menu does not appear.

### `CanvasContextMenu.tsx` (new)
- Props:
  ```ts
  {
    x: number;
    y: number;
    target: { type: 'node' | 'edge'; id: string };
    canForward: boolean;
    canBackward: boolean;
    onAction: (action: ContextMenuAction) => void;
    onClose: () => void;
  }
  ```
  where `ContextMenuAction = 'front' | 'forward' | 'backward' | 'back' | 'duplicate' | 'delete'`.
- Renders an absolutely-positioned `div` (Tailwind: white bg, border, shadow,
  rounded, small padding) at `{ x, y }`, layered above the Konva stage.
- Node items (top to bottom):
  1. Bring to Front
  2. Bring Forward (disabled if `!canForward`)
  3. Send Backward (disabled if `!canBackward`)
  4. Send to Back
  5. Divider
  6. Duplicate
  7. Divider
  8. Delete (destructive styling)
- Edge items: Delete only.
- Each click calls `onAction(...)` then `onClose`.

### `FlowchartCanvas.tsx`
- New state: `contextMenu: { x: number; y: number; target: { type: 'node' | 'edge'; id: string } } | null`.
- New handlers:
  - `handleNodeContextMenu(nodeId, e)`: prevent default, select the node,
    compute screen position from `e.evt.clientX/clientY`, open menu.
  - `handleEdgeContextMenu(edgeId, e)`: prevent default, select the edge,
    compute screen position, open menu.
- Pass `onContextMenu` into `NodeRenderer` and `EdgeRenderer`.
- Close `contextMenu` on:
  - Action dispatched from the menu.
  - Escape keydown.
  - Any pointer down on the stage (outside the menu).
  - Wheel / pan / zoom.
- Clamp menu position to viewport bounds so it does not render off-screen.
- Compute `canForward`/`canBackward` from `Object.keys(nodes)` and the menu
  target id.
- Render nodes in `Object.values(nodes)` order (already the case); reordering
  the record will automatically change the render stack.

## 5. Data Flow

1. User right-clicks a node or edge → `FlowchartCanvas` selects it and opens
   the menu at the pointer position.
2. User clicks an item:
   - Ordering: store action (`bringNodeToFront`, etc.) executes a
     `createReorderNodesCommand`.
   - Duplicate: `duplicateNode` executes an `createAddNodeCommand` for the
     copy.
   - Delete: existing `removeNode` or `removeEdge` is called.
3. The `nodes` record is replaced (or mutated in place) with the new state.
4. Menu closes.
5. Cmd/Ctrl+Z undoes the action via the existing `undo` action.

## 6. Error Handling / Edge Cases

- **Stale target**: store actions check `nodes[id]` / `edges[id]` exists before
  executing. If the target disappears while the menu is open, the menu closes
  automatically when the target is no longer found.
- **Boundary no-ops**: forward/backward buttons are disabled when the target
  is at the corresponding end of the order; store actions are no-ops if
  invoked anyway.
- **Off-screen menu**: `left`/`top` are clamped so the full menu fits in the
  viewport.
- **Duplicate overlap**: the copy is offset `20px` right and down. If it
  overlaps another node, the user can drag it away.
- **Tool mode**: the menu works regardless of the current tool; right-clicking
  temporarily selects the target without changing the active tool.

## 7. Testing

- `flowchartCommands.test.ts`: `createReorderNodesCommand` do/undo round-trip
  on a 3-node ordered record.
- `flowchartStore.test.ts`:
  - `bringNodeToFront` / `sendNodeToBack` / `bringNodeForward` /
    `sendNodeBackward` change `Object.keys(nodes)` order correctly, including
    boundary no-ops, and are undoable/redoable.
  - `duplicateNode` creates a copy with a new id, offset position, same style,
    and selects it; undo removes the copy.
- `CanvasContextMenu.test.tsx`: renders correct items for node vs. edge;
  disabled states for boundary items; clicking an item fires the expected
  action and closes the menu.
- `FlowchartCanvas.test.tsx`: right-click on a node/edge opens the menu with
  the correct target; Escape and stage pointerdown close the menu.

## 8. File Structure Changes

```
src/
  components/
    flowchart/
      CanvasContextMenu.tsx  (new)
      FlowchartCanvas.tsx    (modified)
      NodeRenderer.tsx       (modified)
      EdgeRenderer.tsx       (modified)
  store/
    flowchartStore.ts        (modified)
  utils/
    flowchartCommands.ts     (modified)
```
