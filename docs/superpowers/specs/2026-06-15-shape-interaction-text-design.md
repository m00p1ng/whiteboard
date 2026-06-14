# Shape Interaction & In-Shape Text — Design

## Goal

1. A selected shape can be dragged regardless of the active tool.
2. The shape context menu gets a Delete entry.
3. Double-clicking a rect or circle lets the user type text centered inside it.
4. The properties panel exposes text settings (content, font size, color) for rect/circle.
5. Color fields (fill, stroke, text color) support a "transparent" value.
6. Position/size number fields in the properties panel round to sensible precision.

## 1. Drag selected shape regardless of tool

`Canvas.tsx` currently passes `draggable={tool === 'select' && !spacePressed}` to `ShapeRenderer`. Change to:

```ts
draggable={!spacePressed && (tool === 'select' || shape.id === selectedId)}
```

A previously selected shape stays draggable even when a creation tool (rect/circle/line/text) or connector tool is active. This does not affect creation-drag (only triggers when `e.target === stage`) or connector click handling (click without movement still fires `onClick`).

## 2. Context menu Delete

`ShapeContextMenu` gets a new "Delete" item (visually separated, e.g. red text, below the z-order items). Wired in `Canvas.tsx` to:

```ts
onDelete={() => {
  removeShape(contextMenu.shapeId);
  setSelectedId(null);
  setContextMenu(null);
}}
```

`removeShape` already exists and is undoable (used by the Delete/Backspace hotkey).

## 3. Data model — text in rect/circle

New shared optional interface in `src/types/shape.ts`:

```ts
export interface ShapeTextStyle {
  text?: string;
  fontSize?: number;
  textColor?: string;
}

export interface RectShape extends BaseShape, ShapeTextStyle {
  type: 'rect';
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape, ShapeTextStyle {
  type: 'circle';
  radiusX: number;
  radiusY: number;
}
```

Defaults when fields are absent: `text` → `''` (nothing rendered), `fontSize` → `16`, `textColor` → `'#000000'`.

## 4. Rendering in-shape text

In `ShapeRenderer`, after the `Rect`/`Ellipse`, render a sibling Konva `Text` when `shape.text` is non-empty:

- `listening={false}` — never intercepts pointer events; the `Rect`/`Ellipse` underneath keeps handling click/drag/dblclick/context-menu/transform.
- `align="center"`, `verticalAlign="middle"`, `wrap="word"`.
- `fill={shape.textColor ?? '#000000'}`, `fontSize={shape.fontSize ?? 16}`.
- `rotation={shape.rotation ?? 0}`.
- Bounding box:
  - rect: `x=shape.x, y=shape.y, width=shape.width, height=shape.height`
  - circle: `x=shape.x - shape.radiusX, y=shape.y - shape.radiusY, width=2*shape.radiusX, height=2*shape.radiusY`

No `Group` restructuring, so `SelectionTransformer` and resize logic (which read `Rect`/`Ellipse` node geometry) are untouched.

## 5. Double-click → in-shape text edit

New component `ShapeTextEditor` (separate from `TextEditor`, which remains for standalone `TextShape`).

`Canvas.handleShapeDblClick` is extended: for `rect`/`circle`, set `editingShapeTextId` and render `ShapeTextEditor`.

- Textarea overlay sized to the shape's screen-space bounding box (same box as section 4, converted through `viewport.scale`/`offsetX`/`offsetY`).
- `text-align: center`, vertically centered (flex or matching line-height).
- `defaultValue={shape.text ?? ''}`, autofocus + select on mount.
- `onBlur` → `updateShape(shape.id, { text: value })`, then close.
- `Escape` → close without committing (same pattern as existing `TextEditor`).

Font size and text color are edited via the properties panel (section 6), not the inline editor.

## 6. Properties panel additions

For `rect`/`circle` in `ShapePropertiesPanel`, add after the existing Fill/Stroke fields:

- **Text** — `TextAreaField`, value `shape.text ?? ''`
- **Font size** — `NumberField`, value `shape.fontSize ?? 16`
- **Text color** — `ColorField`, value `shape.textColor ?? '#000000'`

## 7. Transparent color support

`ColorField` gets a "Transparent" checkbox next to the swatch:

- Checked when current value is `'transparent'`.
- When checked: color swatch and hex text input are disabled; value becomes `'transparent'`.
- When unchecked: restores the last non-transparent hex value (tracked in a ref; falls back to `#ffffff` for Fill, `#000000` for Stroke/Text color if none recorded yet).

Applies to all `ColorField` usages: Fill, Stroke (rect/circle/line), Text color (text shape's `fill`, and new rect/circle `textColor`).

Konva's `fill`/`stroke` accept `'transparent'` natively as a CSS color string — no renderer changes beyond passing the value through (already does).

## 8. Number field precision

`NumberField` gets an optional `precision?: number` prop. When set, live/committed values are rounded via `parseFloat(value.toFixed(precision))`, and the displayed input value is formatted to that precision.

Applied in `ShapePropertiesPanel`:
- **X / Y** — `precision={0}` (integer)
- **Width / Height / Radius X / Radius Y** — `precision={2}`

Font size keeps its existing (unrounded) behavior.

## Testing

- `ShapeRenderer.test.tsx`: rect/circle with `text` set renders a `Text` node with correct bounds/`listening=false`; absent/empty `text` renders nothing extra.
- `ShapeContextMenu.test.tsx`: Delete item calls `onDelete`.
- `Canvas.test.tsx`: dragging a selected shape works while a non-select tool is active; double-click on rect/circle opens `ShapeTextEditor`; blur commits `text`.
- `ShapePropertiesPanel.test.tsx`: new Text/Font size/Text color fields for rect/circle; transparent checkbox toggles value to/from `'transparent'`; X/Y round to integers, Width/Height/Radius round to 2 decimals.
- `editorStore.test.ts`: no new actions needed — `setShapeDraft`/`recordFieldChange`/`removeShape` already cover this.
