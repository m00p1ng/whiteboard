# Shape Context Menu (Z-Order) Design

## 1. Scope & Success Criteria

Add a right-click context menu on canvas shapes with z-order actions:
Bring to Front, Bring Forward, Send Backward, Send to Back.

**In scope:**
- Right-click (`contextmenu`) on any shape opens a small menu at the cursor.
- Menu offers 4 z-order actions, operating on the right-clicked shape.
- Right-click selects the shape.
- Z-order changes are undoable/redoable via the existing command stack.
- Menu closes on action, Escape, or click/pointerdown elsewhere.

**Out of scope:**
- Context menu for the empty canvas (no items to show there).
- Other menu items (delete, copy, etc.) — only z-order actions for now.
- Multi-select.

**Success criteria:** Right-clicking a shape shows a menu; choosing Bring to
Front / Send to Back / Bring Forward / Send Backward visibly reorders
overlapping shapes, and Cmd/Ctrl+Z undoes the reorder.

## 2. Z-Order Model

`shapes: Record<string, Shape>` already determines render order via
`Object.values(shapes)` insertion order (lowest = back, highest = front).
No new field needed — reordering means rebuilding this record with a new key
order.

## 3. Command Layer Changes

`src/utils/commands.ts`:
- Add `createReorderCommand(prevOrder: string[], nextOrder: string[]): Command`.
  - `do`: rebuild `state.shapes` as a new object iterating `nextOrder`.
  - `undo`: rebuild `state.shapes` as a new object iterating `prevOrder`.

`src/store/editorStore.ts`:
- `execute`, `undo`, `redo` currently mutate a closure-captured `nextShapes`
  object in place and return that variable. Change them to pass a
  `CommandState` object to `command.do`/`undo` and read `cmdState.shapes`
  back afterward, so a command may replace the whole map (required for
  reorder, which can't be expressed as in-place mutation of a fixed object).
- New actions, each computing `prevOrder = Object.keys(get().shapes)` and a
  `nextOrder`, then `execute(createReorderCommand(prevOrder, nextOrder))`:
  - `bringToFront(id)`: move `id` to the end of the order.
  - `sendToBack(id)`: move `id` to the start of the order.
  - `bringForward(id)`: swap `id` with the next key. No-op if already last.
  - `sendBackward(id)`: swap `id` with the previous key. No-op if already
    first.
  - If `id` is not in `shapes`, or the action is a no-op, do not call
    `execute` (avoid pushing a useless undo entry).

## 4. UI Components

### `ShapeRenderer.tsx`
- Add `onContextMenu?: (e: KonvaEventObject<PointerEvent>) => void` to props
  and spread into `common`.

### `ShapeContextMenu.tsx` (new)
- Props: `{ x: number; y: number; shapeId: string; canForward: boolean; canBackward: boolean; onAction: (action: 'front' | 'forward' | 'backward' | 'back') => void; }`
- Renders an absolutely-positioned `div` (Tailwind: white bg, border, shadow,
  rounded, small padding) at `{ x, y }`, same overlay layering approach as
  `TextEditor`.
- 4 buttons in order: "Bring to Front", "Bring Forward", "Send Backward",
  "Send to Back". Forward/Backward buttons get `disabled` + muted styling
  when `canForward`/`canBackward` is false.
- Each click calls `onAction(...)`.

### `Canvas.tsx`
- New state: `contextMenu: { shapeId: string; x: number; y: number } | null`.
- New handler `handleShapeContextMenu(shapeId, e)`:
  - `e.evt.preventDefault()`.
  - `setSelectedId(shapeId)`.
  - Compute `{x, y}` from `e.evt.clientX/clientY` (page coordinates for the
    overlay div, matching `TextEditor`'s positioning approach).
  - `setContextMenu({ shapeId, x, y })`.
- Wire `onContextMenu={(e) => handleShapeContextMenu(shape.id, e)}` into each
  `ShapeRenderer`.
- Close `contextMenu` (set to `null`) on:
  - Escape keydown (extend existing keydown listener).
  - Any `onPointerDown` on the `Stage` (existing handler — add a check at the
    top).
  - After an action is dispatched from `ShapeContextMenu`.
- Compute `canForward`/`canBackward` from `Object.keys(shapes)` and the
  context menu's `shapeId` (not last / not first respectively).
- Render `<ShapeContextMenu>` conditionally, as a sibling overlay alongside
  `TextEditor` (outside the Konva `Stage`).

## 5. Data Flow

1. User right-clicks a shape → `handleShapeContextMenu` selects it and opens
   the menu at the pointer position.
2. User clicks a z-order action → store action (`bringToFront`, etc.) is
   called with the shape id, executing a `createReorderCommand` on the
   command stack.
3. `shapes` record is replaced with the new key order → re-render reflects
   new stacking via `Object.values(shapes)` order in `Canvas.tsx`.
4. Menu closes.
5. Cmd/Ctrl+Z undoes the reorder via the existing `undo` action.

## 6. Error Handling / Edge Cases

- Right-click on a shape that no longer exists (stale id) when action is
  clicked: store actions check `shapes[id]` exists before proceeding.
- Forward/backward at array boundary: buttons disabled, no-op if somehow
  invoked.
- Menu position: no viewport-edge clamping in this version (acceptable for
  first pass; canvas area is large).

## 7. Testing

- `commands.test.ts`: `createReorderCommand` do/undo round-trip on a 3-shape
  ordered record.
- `editorStore.test.ts`: `bringToFront`/`sendToBack`/`bringForward`/
  `sendBackward` change `Object.keys(shapes)` order correctly, including
  boundary no-ops, and are undoable/redoable.
- `Canvas.test.tsx`: right-click on a shape opens the context menu with the
  correct items; clicking an item calls the corresponding store action and
  closes the menu; Escape and stage pointerdown close the menu.

## 8. File Structure Changes

```
src/
  components/
    Canvas.tsx          (modified)
    ShapeRenderer.tsx    (modified)
    ShapeContextMenu.tsx (new)
  store/
    editorStore.ts       (modified)
  utils/
    commands.ts          (modified)
```
