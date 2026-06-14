# Real-Time Shape Creation Preview Design

## Goal

Show a live preview while creating every drawable shape, size shapes from a
pointer drag, and keep transient creation state out of persistence and undo
history.

## Interaction Behavior

Rectangle, Circle, Line, and Text use a pointer-down, drag, pointer-up gesture.
Starting a creation gesture immediately clears the previous selection and begins
the new preview in the same action.

- Rectangle uses the drag start and current pointer as opposite corners.
- Circle uses the same bounding-box gesture and creates an ellipse.
- Line uses the drag start and current pointer as its endpoints.
- Text previews and creates the existing fixed-size `Text` label at the drag
  start; drag distance does not change its dimensions.

Releasing the pointer commits one final shape, selects it, and switches to the
Select tool. A click without meaningful movement still creates a usable shape
with the existing defaults: a 100 by 60 rectangle, an 80 by 80 ellipse, the
existing fixed-size text label, or a short default line.

Connector creation remains click-based. Clicking a source shape begins a
temporary connector line from that shape to the current pointer. Clicking a
different valid target shape commits the connector. Clicking the source again
does not create a self-connector.

Pressing `Escape` cancels an active drag or pending connector without changing
the active tool. Changing tools or unmounting the canvas also clears transient
creation state.

## Preview Appearance

In-progress geometry renders with:

- a dashed blue outline;
- a translucent blue fill for rectangles and ellipses;
- dashed blue paths for lines and connectors; and
- visible endpoint markers where they improve clarity.

Previews are non-interactive and visually distinct from committed shapes.

## Architecture

Keep draft state local to `Canvas`; do not add it to `editorStore`.

`Canvas` owns:

- `shapeDraft`, containing the active tool, drag start, and current world
  pointer for rectangle, ellipse, line, or text creation; and
- `connectorDraft`, containing the source shape ID and current world pointer.

A focused `CreationPreview` component receives the derived preview geometry and
renders it in the existing Konva layer above committed shapes and below the
selection transformer. It does not expose drag, click, selection, or transform
handlers.

Only a completed gesture calls `addShape`. Pointer movement updates React-local
draft state, so it does not create undo commands, autosave writes, or persisted
intermediate shapes.

## Pointer Flow

### Shape Creation

1. On stage pointer-down with Rectangle, Circle, Line, or Text active, convert
   the screen pointer into world coordinates.
2. Clear the current selection and initialize `shapeDraft`.
3. Capture the pointer so movement and release remain available when the pointer
   leaves the canvas.
4. On pointer-move, update the draft's current world pointer.
5. On pointer-up, normalize the geometry, apply a default size when movement is
   below the click threshold, and call `addShape` once.
6. Clear the draft, select the new shape, and switch to Select.

Shape clicks must not begin a creation gesture through event bubbling. The
stage handler starts creation only when the pointer event targets the stage
background.

### Connector Creation

1. Clicking a shape with Connector active records it as the source.
2. Stage pointer movement updates the current world pointer.
3. `CreationPreview` renders a dashed path from the source shape's resolved
   center or anchor point to that pointer.
4. Clicking a different valid shape commits the existing connector model.
5. Clicking empty space keeps the connector pending; `Escape` or a tool change
   cancels it.

## Coordinate Handling

All draft geometry is stored in world coordinates. Convert a stage pointer with:

```text
worldX = (screenX - viewport.offsetX) / viewport.scale
worldY = (screenY - viewport.offsetY) / viewport.scale
```

This keeps preview and committed geometry aligned under pan and zoom.

Rectangle and ellipse drags are normalized so dragging left or upward still
produces positive dimensions:

```text
x = min(startX, currentX)
y = min(startY, currentY)
width = abs(currentX - startX)
height = abs(currentY - startY)
```

## Shape Model Migration

Rename the Circle tool only at the data-model level from a single-radius circle
to an ellipse:

```ts
interface CircleShape extends BaseShape {
  type: 'circle';
  radiusX: number;
  radiusY: number;
}
```

The public shape type remains `circle`, and the toolbar label and icon remain
unchanged.

Existing persisted circles may still contain `radius`. Add a shape-normalization
helper in `boardStore.ts` and apply it to every board returned by `loadBoards()`
before the boards enter either store:

```text
radiusX = radius
radiusY = radius
```

Already migrated circles pass through unchanged. Invalid or missing radii use
the current default radius of 40 on each axis. Unknown board and shape data
continues to follow the store's existing tolerant-loading behavior. The
normalized shape is saved in the new format on the next board update.

`ShapeRenderer` will use Konva `Ellipse`. Transform completion stores both
scaled radii and resets node scales. `getShapeBounds` uses the ellipse's full
width and height for minimap rendering. `getAnchorPoint` uses `radiusX` for
left/right anchors and `radiusY` for top/bottom anchors so connector endpoints
remain on the ellipse boundary.

## Defaults and Threshold

Treat movement below a small screen-space threshold as a click so behavior is
stable at every zoom level. Use a five-pixel threshold measured before world
coordinate conversion.

Click defaults are:

- rectangle: 100 by 60, starting at the pointer;
- ellipse: `radiusX: 40` and `radiusY: 40`, centered at the pointer;
- line: 80 world units horizontally from the pointer; and
- text: the existing `Text` label at the pointer with font size 18.

For a dragged ellipse, the normalized drag box defines its geometry:

```text
centerX = x + width / 2
centerY = y + height / 2
radiusX = width / 2
radiusY = height / 2
```

## Error and Cancellation Handling

- Ignore creation when the stage has no pointer position.
- Ignore non-finite derived coordinates rather than committing invalid shapes.
- `Escape` clears both draft types and connector-source selection but preserves
  the current tool.
- Tool changes and canvas unmount clear all drafts.
- Pointer cancellation behaves like `Escape`; it does not commit.
- A connector requires two distinct existing shape IDs.
- Preview components do not listen for events and cannot become selected.

## Testing

### Canvas Interaction Tests

- pointer-down and pointer-move render live rectangle, ellipse, line, text, and
  connector previews;
- pointer-up commits exactly one shape and clears the preview;
- dragging in each direction produces normalized positive geometry;
- a click without meaningful movement creates each default shape;
- creating while another shape is selected clears it and begins creation in the
  same gesture;
- `Escape`, pointer cancellation, and tool changes clear drafts without
  committing or changing the selected creation tool;
- connector preview follows the pointer and commits only to a different valid
  target; and
- pan and zoom produce correct world-space preview and committed coordinates.

### Model and Rendering Tests

- legacy circles normalize into equal `radiusX` and `radiusY`;
- migrated ellipses survive persistence round trips;
- `ShapeRenderer` passes ellipse radii to Konva and stores transformed radii;
- shape bounds use `2 * radiusX` and `2 * radiusY`; and
- connector anchor points use the matching axis radius; and
- minimap rendering reflects non-circular ellipses.

## Scope

This change does not add freehand drawing, snapping, modifier-key constraints,
shape styling controls, connector routing, or text-box resizing. Those features
remain separate work.
