# Shape Stroke and Font Style Controls

## Summary

Add controls to the flowchart node's properties panel for:

- Stroke color
- Font size
- Font color
- Font family (font name)

The flowchart system already stores `stroke`, `fontSize`, and `textColor` on `NodeStyle`; this change exposes them in the UI and adds `fontFamily` as a new style property. Legacy basic shapes are out of scope.

## Background

The whiteboard currently renders flowchart nodes with hard-coded defaults derived from `NodeStyle`:

- `fill`: `#ffffff`
- `stroke`: `#334155`
- `strokeWidth`: `2`
- `fontSize`: `14`
- `textColor`: `#0f172a`

The `PropertiesPanel` only lets users edit the label, width, and height. Users want to change the visual appearance of shapes directly from the sidebar.

## Goals

1. Let users change a node's stroke color from the properties panel.
2. Let users change a node's text/font size from the properties panel.
3. Let users change a node's text/font color from the properties panel.
4. Let users change a node's font family from the properties panel.
5. Keep changes undoable/redoable through the existing command system.

## Non-Goals

- Styling controls for edges or edge labels.
- Styling controls for legacy basic shapes (rect, circle, line, text, connector).
- Custom color picker component beyond native `<input type="color">`.
- Persisting a per-user default style or style presets.

## Design

### Architecture

The flowchart system already separates data (`FlowchartNode`), actions (`updateNodeStyle`), and rendering (`NodeRenderer`). We extend each layer slightly:

1. **Data model**: add `fontFamily?: string` to `NodeStyle`.
2. **Defaults**: set `fontFamily: 'Inter'` in `createDefaultNode`.
3. **Renderer**: read `style.fontFamily` and pass it to the Konva `Text` component.
4. **UI**: add an "Appearance" section to `PropertiesPanel` with controls for the four properties.

No new store actions are required; the panel reuses `updateNodeStyle`.

### Components & Data Flow

#### `src/types/flowchart.ts`

```ts
export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  textColor?: string;
  fontFamily?: string; // NEW
}
```

#### `src/store/flowchartStore.ts`

In `createDefaultNode`, add `fontFamily: 'Inter'` to the default style object.

#### `src/components/flowchart/NodeRenderer.tsx`

```ts
const fontFamily = style.fontFamily ?? 'Inter';
```

Pass `fontFamily` to the `<Text />` component.

#### `src/components/flowchart/PropertiesPanel.tsx`

Add an "Appearance" section below the size fields when a node is selected.

Controls:

| Property | Control | Bound field |
|---|---|---|
| Stroke color | Native color picker + hex text input | `style.stroke` |
| Text color | Native color picker + hex text input | `style.textColor` |
| Font size | Number input (min 8, max 72) | `style.fontSize` |
| Font family | `<select>` | `style.fontFamily` |

Font options:

- `Inter`
- `Courier New`
- `Georgia`

Each control calls:

```ts
updateNodeStyle(node.id, { [field]: value })
```

### Error Handling

- Invalid hex strings in the text inputs are not blocked while typing. The color picker displays the last valid value. Konva falls back to its default if an invalid color reaches the renderer.
- Font size is clamped to the range 8–72 on blur.
- An empty or missing `fontFamily` falls back to `Inter` in `NodeRenderer`.

### Testing

- `PropertiesPanel.test.tsx`: verify that changing each control calls `updateNodeStyle` with the correct key/value.
- `NodeRenderer.test.tsx`: verify that a custom `fontFamily` is applied to the rendered `Text`.
- Existing store tests: verify that `createDefaultNode` includes `fontFamily: 'Inter'`.
- Run `npm run test` and `npm run lint` before finishing.

## Approaches Considered

1. **Flowchart-only (selected)**: Implement controls only for flowchart nodes. Simplest and matches the active editor.
2. **Flowchart + legacy model consistency**: Also update legacy `ShapeTextStyle` type definitions. Rejected because legacy shapes are not rendered and the user preferred the minimal scope.
3. **Shared `StyleEditor` component**: Build a reusable component for nodes, edges, and future legacy shapes. Rejected as over-engineering for the current scope.

## Open Questions

None.

## Out of Scope

- Edge label styling.
- Legacy basic shape properties panel.
- Style presets or per-user defaults.
- Custom color picker UI.
