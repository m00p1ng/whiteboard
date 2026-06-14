# Shape Properties Panel Design

## 1. Scope & Success Criteria

When a shape is selected on the canvas, show a floating panel on the right
side of the screen with editable fields for that shape's style and geometry
properties. Editing a field updates the shape live; leaving the field (blur,
Enter, color picker close, slider release) commits exactly one undo step.

**In scope:**
- Right-side floating panel, visible only when `selectedId` is set and the
  shape exists.
- Per-shape-type field sets (see Section 3).
- Live visual feedback while editing, single undo entry per committed edit.
- Panel closes automatically when selection clears (existing deselect
  behavior — no new close button).

**Out of scope:**
- Multi-select (panel only ever reflects a single selected shape).
- Rotation field (rect/circle already have rotation handles on the selection
  transformer).
- Line/connector geometry fields (line already has dedicated endpoint resize
  handles; connector geometry is derived from its endpoints).

**Success criteria:** Selecting any shape shows the panel with the correct
fields for its type; editing a field updates the shape on canvas in real
time; a single Cmd/Ctrl+Z after an edit reverts the field to its pre-edit
value (not one undo per keystroke).

## 2. Store Changes (`src/store/editorStore.ts`)

Two new actions, added alongside the existing `updateShape`:

```ts
setShapeDraft: (id: string, updates: Partial<Shape>) => void;
recordFieldChange: (id: string, field: string, prevValue: unknown, nextValue: unknown) => void;
```

- `setShapeDraft(id, updates)`: live-preview update.
  ```ts
  setShapeDraft: (id, updates) =>
    set((state) => ({
      shapes: {
        ...state.shapes,
        [id]: { ...state.shapes[id], ...updates },
      },
    })),
  ```
  Does not touch `undoStack`/`redoStack`. Called on every `onChange`/`onInput`
  while a field is being edited, for instant visual feedback.

- `recordFieldChange(id, field, prevValue, nextValue)`: commits one undo
  entry for the edit session.
  ```ts
  recordFieldChange: (id, field, prevValue, nextValue) => {
    if (prevValue === nextValue) return;
    get().execute({
      do: (state) => {
        (state.shapes[id] as never)[field] = nextValue;
      },
      undo: (state) => {
        (state.shapes[id] as never)[field] = prevValue;
      },
    });
  },
  ```
  Called once when an edit session ends (blur, Enter, color picker close,
  range input `change`). Since `shapes[id][field]` is already `nextValue`
  from prior `setShapeDraft` calls, `do` is idempotent (needed for redo
  correctness); `execute` still pushes the command and clears `redoStack`.
  No-op if value didn't change (avoids empty undo entries).

## 3. Panel Component (`src/components/ShapePropertiesPanel.tsx`)

- Reads `selectedId` and `shapes` from `useEditorStore`.
- Returns `null` if `selectedId` is null or `shapes[selectedId]` is missing.
- Rendered with `key={selectedId}` so switching selection remounts the panel
  (fresh field state, natural blur on the previously-focused input).

### Field sets by shape type

| Type | Fields |
|---|---|
| `rect` | Fill, Stroke, Stroke width, X, Y, Width, Height |
| `circle` | Fill, Stroke, Stroke width, X, Y, Radius X, Radius Y |
| `text` | Fill (text color), Font size, Text content (textarea), X, Y |
| `line` | Stroke, Stroke width |
| `connector` | Stroke, Stroke width |

### Field input patterns

**Color fields** (Fill, Stroke): `<input type="color">` swatch paired with a
hex `<input type="text">`, kept in sync.
- Color picker: `onInput` → `setShapeDraft` (live while dragging picker),
  `onChange` (picker closed) → `recordFieldChange`.
- Hex text: `onChange` → `setShapeDraft` (live), `onBlur` or Enter →
  `recordFieldChange`.

**Numeric fields** (Stroke width, X, Y, Width, Height, Radius X/Y, Font size):
`<input type="number">`.
- `onChange` → parse `parseFloat`, fallback `0` if `NaN`, → `setShapeDraft`
  (live).
- `onBlur` or Enter → `recordFieldChange` with the captured pre-edit value.

**Text content** (text shapes only): `<textarea>`.
- `onChange` → `setShapeDraft` (live).
- `onBlur` → `recordFieldChange`.

**Capturing `prevValue`**: each field captures the shape's current value for
that field in a ref `onFocus` (before any `setShapeDraft` calls), used as
`prevValue` when `recordFieldChange` fires on commit.

## 4. Layout & Wiring

- `<aside className="absolute right-3 top-1/2 z-20 -translate-y-1/2 ...">` —
  same visual language as `LeftToolbar` (rounded-lg border bg-white shadow
  p-3 flex flex-col gap-2, `w-56`).
- Each field rendered as a small label + input, stacked vertically.
- Rendered in `BoardPage.tsx` alongside other overlays:
  ```tsx
  <ShapePropertiesPanel />
  ```
- No explicit close button. Panel disappears when `selectedId` becomes
  `null`, via the existing deselect flow (click empty canvas / Escape).

## 5. Data Flow Summary

1. User selects a shape → `selectedId` set → panel mounts with that shape's
   current values, `key={selectedId}`.
2. User focuses a field → pre-edit value captured in a ref.
3. User types/drags → `setShapeDraft` updates `shapes[id]` directly, canvas
   re-renders live, undo/redo stacks untouched.
4. User commits (blur/Enter/picker close/slider release) →
   `recordFieldChange(id, field, prevValue, currentValue)` pushes one
   `execute`d command onto `undoStack`, clears `redoStack`.
5. Cmd/Ctrl+Z reverts that field to `prevValue` in one step.
6. User selects a different shape or deselects → panel remounts/unmounts.

## 6. Edge Cases

- Selecting a different shape while a field is focused: panel remounts
  (`key={selectedId}` change) before any uncommitted draft can leak into the
  new shape's fields — uncommitted live edits on the old shape remain applied
  (already visible via `setShapeDraft`) but without an undo entry. This is
  acceptable: the shape's value is correct, just not separately undoable.
- Editing a numeric field to an invalid/empty value: treated as `0` for live
  preview; `recordFieldChange` commits whatever numeric value was last valid.
- Shape deleted while panel open (e.g. via Delete key): `selectedId` clears
  as part of existing delete flow, panel unmounts.

## 7. Testing

- `editorStore.test.ts`:
  - `setShapeDraft` updates `shapes[id]` and leaves `undoStack`/`redoStack`
    unchanged.
  - `recordFieldChange` pushes exactly one undo entry; `undo()` restores
    `prevValue`; `redo()` reapplies `nextValue`.
  - `recordFieldChange` is a no-op (no stack push) when `prevValue ===
    nextValue`.

- `ShapePropertiesPanel.test.tsx`:
  - Renders `null` when `selectedId` is `null` or shape missing.
  - Renders the correct field set for each of rect/circle/text/line/connector.
  - Typing in a numeric field updates the shape live (visible via store
    state) without pushing an undo entry.
  - Blurring that field commits exactly one undo entry; Cmd/Ctrl+Z reverts
    the field to its pre-edit value.
  - Color swatch and hex text inputs stay in sync.
  - Switching `selectedId` swaps the panel's displayed fields/values to the
    newly selected shape.

## 8. File Structure Changes

```
src/
  components/
    ShapePropertiesPanel.tsx  (new)
  pages/
    BoardPage.tsx             (modified)
  store/
    editorStore.ts            (modified)
```
