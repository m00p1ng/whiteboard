# Line Shape Resize via Endpoint Handles

## Problem

`SelectionTransformer` skips `line` and `connector` shapes (`SelectionTransformer.tsx:23`), so selecting a line gives no way to resize it. Lines store `points: [x1, y1, x2, y2]` in world coordinates with `x`/`y` as an offset (typically `0,0` at creation, but can become nonzero if the whole line is dragged).

## Goal

Let users resize a selected line by dragging either endpoint.

## Design

### New component: `LineEndpointHandles`

Rendered inside Canvas's `<Layer>`, alongside `SelectionTransformer`. Active only when:
- `selectedShape?.type === 'line'`
- `tool === 'select'`

Props: `{ shape: LineShape, viewport: ViewportTransform, onChange: (updates: Partial<Shape>) => void }`

### Rendering

Two Konva `Circle` handles:
- Position: `(shape.x + points[0], shape.y + points[1])` and `(shape.x + points[2], shape.y + points[3])`
- Radius: `5 / viewport.scale` (constant screen size regardless of zoom)
- Fill: `#3b82f6` (matches existing selection color)
- `draggable: true`

Line `rotation` is ignored for endpoint positioning — lines have no rotation UI today (Transformer is skipped for them), so `rotation` is always `0` in practice.

### Drag behavior

**`onDragMove`**:
1. Read the dragged handle's new position (world coords, since it's inside the same transformed Layer as shapes).
2. Compute candidate new `points` array — replace the dragged endpoint's pair with `(pos.x - shape.x, pos.y - shape.y)`, keep the other endpoint unchanged.
3. If `Math.hypot(dx, dy) < 10` (min length), revert the handle's position to its last valid spot and skip the update (reject).
4. Otherwise, imperatively update the Line node's `points` via `stage.findOne('#' + shape.id)` + `node.points(newPoints)` + `layer.batchDraw()` for live visual feedback. No store write yet.

**`onDragEnd`**:
- Compute final `points` the same way and call `onChange({ points: newPoints })`. This routes through `updateShape`, which is undoable (`editorStore.ts:61`).

### Out of scope

- Rotation handle for lines (none exists today; not added here).
- Connector shapes (separate from `line`, not addressed).
- Snapping endpoints to other shapes.

## Testing

New `LineEndpointHandles.test.tsx`:
- Renders with a line shape and two handles at expected positions.
- Simulating `dragend` on a handle calls `onChange` with correctly updated `points`.
- Dragging an endpoint to within 10px of the other endpoint does not commit an update (min-length rejection).
