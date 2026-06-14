# Board Shape Persistence Design

## Goal

Preserve every board's shapes after the browser tab closes, show the boards home
page when the app reopens, and order boards by most recently edited.

## User Experience

The application starts on the boards home page after a browser reload or a new
tab opens. It does not automatically reopen the previously active board.

The home page orders boards by `updatedAt` descending, so the board edited most
recently appears first.

Opening a board restores its saved shapes. Shape additions, moves, resizes,
deletions, and text edits save immediately. Each saved shape change updates the
board's `updatedAt`, which moves that board to the top the next time the home
page is shown.

## Persistence Lifecycle

`boardStore` remains the owner of board records and `localStorage` persistence.
`editorStore` remains the active editing session.

When `BoardPage` opens a board:

1. Disable autosave for the new board.
2. Copy the board's saved shapes into `editorStore`.
3. Clear the editor undo and redo stacks through the existing shape-loading
   behavior.
4. Mark hydration complete.
5. Enable autosave for subsequent editor shape changes.

The hydration guard prevents the editor's initial empty shape map, or shapes
left from another session, from overwriting the board before its saved shapes
have loaded.

After hydration, every `editorStore.shapes` reference change calls
`saveCurrentBoard`. That store action updates the active board's shapes and
`updatedAt`, then synchronously writes the board list to `localStorage`.
Synchronous `localStorage` writes mean no extra `beforeunload` or `pagehide`
handler is required.

## Home Page Ordering

`HomePage` derives a sorted copy of the board list:

```ts
const sortedBoards = [...boards].sort(
  (a, b) => b.updatedAt - a.updatedAt
);
```

The stored array is not mutated. Opening a board alone does not change its
position because ordering represents editing recency, not opening recency.

## Storage Schema

No schema migration is required. Existing board records already contain:

```ts
interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  shapes: Record<string, Shape>;
}
```

The application continues to use the `whiteboard:boards` local-storage key.
`currentBoardId` remains session-only Zustand state, which ensures reload starts
on the home page.

## Error Handling

Existing storage behavior remains:

- missing or corrupt storage loads an empty board list;
- storage write errors are ignored so editing remains usable; and
- missing active-board records render no board editor.

This change does not add backend synchronization, cross-tab synchronization, or
storage quota messaging.

## Testing

Add focused coverage for:

- opening a board hydrates saved shapes into `editorStore`;
- hydration does not overwrite saved shapes with the editor's initial state;
- shape changes after hydration update the board record and `localStorage`;
- saving shapes updates `updatedAt`;
- a fresh store import loads the saved shapes while `currentBoardId` remains
  null; and
- the home page renders boards by descending `updatedAt` without mutating the
  store's board array.

Run the full test suite, lint, and production build after the focused tests
pass.
