# Shape Creation and Selection Design

## Goal

Make shape creation predictable when another shape is selected, and make newly
created shapes immediately ready to resize.

## Interaction Behavior

When a rectangle, circle, text, or line tool is active and a shape is selected,
the first click on empty board space clears the selection only. The active tool
does not change and no shape is created.

The next click on empty board space performs the active tool's normal creation
action. After a rectangle, circle, or text shape is created:

- the new shape becomes selected;
- the editor switches to the Select tool; and
- the existing selection transformer displays resize and rotation handles.

Line creation remains a two-click interaction. The first creation click records
the start point. The second creation click completes the line, selects it, and
switches to the Select tool. Lines remain excluded from the resize transformer,
so selection is visible through the existing selected styling without resize
handles.

The connector workflow is unchanged.

## Implementation

Keep the behavior in `Canvas`, which already coordinates board clicks, active
tools, shape creation, and selection.

Background-click handling will use this precedence:

1. If the Select tool is active, clear the current selection.
2. If a creation tool is active and `selectedId` is set, clear the selection and
   return without creating.
3. Otherwise, run the active tool's creation behavior.

For rectangle, circle, and text creation, use the generated shape ID for both
`addShape` and `setSelectedId`, then call `setTool('select')`.

For lines, preserve the current first-click start-point behavior. Only after the
second click adds the line will the new line ID be selected and the tool changed
to Select.

No editor-store API or shape-model changes are required.

## Edge Cases

- Clicking a shape continues to select that shape rather than creating another
  shape.
- Deselecting with a creation tool does not clear a pending line start point.
- A completed line cannot accidentally begin another line because completion
  switches the active tool to Select.
- Connectors retain their current source/target selection behavior.

## Testing

Add focused canvas interaction tests that verify:

- the first empty click with a selected shape clears selection without adding a
  shape;
- the creation tool remains active after that deselection;
- the next empty click creates a rectangle, circle, or text shape;
- a newly created shape is selected and the active tool becomes Select;
- the selection transformer appears for newly created resizable shapes; and
- a line switches to Select and becomes selected only after its second click,
  without displaying resize handles.

Existing store tests remain unchanged because the behavior is orchestration in
`Canvas`, not a new store contract.
