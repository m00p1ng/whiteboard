# Shadcn Settings Controls Design

## Goal

Migrate the existing `ShapePropertiesPanel` form controls to shadcn/ui while preserving the panel's current floating layout, available fields, editing behavior, and undo semantics.

## Scope

- Keep the existing custom `aside` container, dimensions, placement, spacing, border, background, and shadow.
- Add local shadcn/ui `Input`, `Label`, and `Textarea` components.
- Replace the panel's styled number, text, color, and textarea elements with those components where their native element types support the current behavior.
- Keep the native color input as the swatch, styled consistently beside a shadcn `Input` for the hexadecimal value.
- Preserve all shape-type-specific field visibility.
- Preserve accessible labels and existing label text.

The panel will not become a shadcn `Card`, `Sheet`, `Dialog`, or other overlay component.

## Component Design

The shadcn primitives will live under `src/components/ui`, following the project's existing `Button` and `ToggleGroup` pattern.

`ShapePropertiesPanel` will retain its current internal field helpers:

- `NumberField` uses `Label` and `Input` with `type="number"`.
- `ColorField` uses `Label`, a native `input[type="color"]`, and a shadcn `Input` with `type="text"`.
- `TextAreaField` uses `Label` and `Textarea`.

Each label will use `htmlFor` with a stable field ID instead of relying on a wrapping label. IDs will be derived from the field label because only one properties panel is rendered at a time and its visible labels are unique.

## Behavior

The migration is presentational only:

- Input changes continue to update the selected shape live through `setShapeDraft`.
- Blur and Enter continue to commit one undoable field change.
- Color swatch input continues to update live and commit through its existing color events.
- Selecting no shape continues to render no panel.
- Changing shape selection continues to remount the panel through the existing key in `BoardPage`.

No editor store, persistence, canvas, or shape model changes are required.

## Testing

Existing `ShapePropertiesPanel` tests remain the behavioral contract and should continue to pass unchanged where possible. Add focused assertions only if needed to verify accessible label associations after adopting shadcn `Label`.

Run:

- The focused `ShapePropertiesPanel` test file.
- The full test suite.
- The production build.

## Out of Scope

- Repositioning or resizing the panel.
- Adding sections, headings, separators, or new settings.
- Changing field order.
- Changing color validation or numeric constraints.
- Replacing the native browser color picker.
