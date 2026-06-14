# Board Persistence and Home Page Design

## Summary

Add two features to the whiteboard app:

1. **Persistence on browser refresh** — every board's diagram shapes are saved to `localStorage` and restored when the app reloads.
2. **Home page** — a new entry view that lists all saved boards and lets the user create, rename, and delete boards.

The app currently has no routing and only supports one anonymous board. This design introduces a lightweight board layer without adding a routing library.

---

## Requirements

### Functional

- [ ] Persist each board's diagram shapes across browser refreshes using `localStorage`.
- [ ] Add a home page (`/` by default) that displays all saved boards.
- [ ] From the home page, create a new board.
- [ ] From the home page, rename an existing board.
- [ ] From the home page, delete an existing board.
- [ ] Clicking a board opens it in the existing editor.
- [ ] From the editor, navigate back to the home page.
- [ ] Only shapes are persisted; viewport and undo/redo history are reset on refresh.

### Non-functional

- Keep changes minimal and consistent with the existing React + Zustand + Tailwind + shadcn/ui stack.
- Do not introduce a routing library; use an in-app view switcher.
- Do not add a backend.
- Preserve existing tests and add tests for the new board store and home page.

---

## Architecture

Introduce two responsibilities:

1. **`boardStore`** (new) — owns the board catalog and persistence.
2. **`editorStore`** (existing) — owns the current drawing session (shapes, tool, viewport, history).

`App.tsx` becomes a lightweight shell that decides whether to render `HomePage` or `BoardPage` based on `boardStore.currentBoardId`.

```text
┌─────────────────────────────────────────┐
│              App.tsx                    │
│  currentBoardId ? <BoardPage />         │
│                 : <HomePage />          │
└─────────────────────────────────────────┘
         │                      │
         ▼                      ▼
    BoardPage.tsx          HomePage.tsx
         │                      │
         ▼                      ▼
   editorStore           boardStore
   (shapes, tools)       (board list, CRUD,
                         persistence)
```

### Why two stores?

- `editorStore` is already well-scoped to the drawing session; adding board metadata would mix concerns.
- Board CRUD and persistence are independent of the editor's tool/selection/history state.
- Easier to unit-test board operations in isolation.

---

## Data Model

### `Board`

```ts
interface Board {
  id: string;           // crypto.randomUUID()
  name: string;         // user-editable; defaults to "Untitled board"
  createdAt: number;    // Date.now()
  updatedAt: number;    // Date.now()
  shapes: Record<string, Shape>;
}
```

### `BoardState` (Zustand)

```ts
interface BoardState {
  boards: Board[];
  currentBoardId: string | null;

  // selectors
  currentBoard: Board | undefined;

  // actions
  createBoard(name?: string): string;     // returns new board id
  openBoard(id: string): void;
  closeBoard(): void;
  renameBoard(id: string, name: string): void;
  deleteBoard(id: string): void;
  saveCurrentBoard(shapes: Record<string, Shape>): void;
}
```

### Storage keys

- `whiteboard:boards` — JSON array of `Board` objects.

Board shapes are stored inline inside each `Board` object; no separate key per board.

---

## Components / Pages

### New files

| File | Responsibility |
|---|---|
| `src/store/boardStore.ts` | Board catalog state, CRUD actions, `localStorage` persistence. |
| `src/store/boardStore.test.ts` | Unit tests for board CRUD and persistence. |
| `src/pages/HomePage.tsx` | Grid/list of boards, create/rename/delete controls, open action. |
| `src/pages/HomePage.test.tsx` | Smoke tests for listing, creating, and deleting boards. |
| `src/pages/BoardPage.tsx` | Shell for the editor: toolbar + canvas + back button. |

### Modified files

| File | Change |
|---|---|
| `src/App.tsx` | Switch between `HomePage` and `BoardPage` based on `currentBoardId`. |
| `src/components/Toolbar.tsx` | Add a "Back to boards" button when a board is open. |
| `src/components/Canvas.tsx` | On mount, load shapes from the current board into `editorStore`. On unmount (or shape change), save shapes back to `boardStore`. |
| `src/store/editorStore.ts` | Optionally expose a `reset()` action to clear the session when leaving a board. |

---

## Data Flow

### Opening a board

1. User clicks a board on `HomePage`.
2. `boardStore.openBoard(id)` sets `currentBoardId`.
3. `BoardPage` renders.
4. `BoardPage` reads `currentBoard.shapes` and writes them into `editorStore`.

### Saving shapes

1. User draws, moves, deletes shapes on the canvas.
2. `editorStore` updates its `shapes` map as usual.
3. A Zustand subscriber in `BoardPage` (or a `useEffect`) watches `editorStore.shapes`.
4. When shapes change, `boardStore.saveCurrentBoard(shapes)` updates the board's `shapes` and `updatedAt` and persists to `localStorage`.

### Creating a board

1. User clicks "New board" on `HomePage`.
2. `boardStore.createBoard()` appends a board with empty `shapes` and sets `currentBoardId`.
3. `BoardPage` opens with an empty canvas.

### Renaming a board

1. User clicks a rename control on a board card.
2. Inline input or prompt updates `boardStore.renameBoard(id, name)`.
3. `boardStore` updates `updatedAt` and persists.

### Deleting a board

1. User clicks a delete control on a board card.
2. Optional confirmation.
3. `boardStore.deleteBoard(id)` removes the board from `boards` and clears `currentBoardId` if it was the active board.
4. `boardStore` persists the remaining catalog.

### Returning home

1. User clicks "Back to boards" in `Toolbar`.
2. `boardStore.closeBoard()` clears `currentBoardId`.
3. `editorStore.reset()` clears the current session.
4. `HomePage` renders.

---

## Persistence Strategy

- Use Zustand's `subscribe` or `persist` middleware to write `boards` to `localStorage` whenever it changes.
- Read from `localStorage` once on store initialization.
- Serialization format: `JSON.stringify(boards)`.
- Keep the storage key stable: `whiteboard:boards`.
- If `localStorage` is unavailable or JSON is corrupt, fall back to an empty board list.

### Why not persist `editorStore` directly?

- We want multiple boards, not a single anonymous diagram.
- Board metadata (name, timestamps) must live alongside shapes.
- Viewport and history are intentionally not persisted per requirements.

---

## Edge Cases & Error Handling

| Case | Behavior |
|---|---|
| Empty `localStorage` | Show empty home page with "New board" call-to-action. |
| Corrupt `localStorage` JSON | Catch parse error, reset to empty board list, log a warning. |
| Deleting the currently open board | Close the board and return to home page. |
| Opening a board that no longer exists | Treat as missing, close board, return home. |
| Very large diagrams | `localStorage` has ~5 MB limit; acceptable for current scope. |
| Browser in incognito / storage disabled | Gracefully fall back to in-memory state for the session. |

---

## Testing Approach

### Unit tests

- `boardStore.test.ts`
  - Create board generates a valid id and default name.
  - Rename updates name and `updatedAt`.
  - Delete removes the board.
  - Persistence round-trip to `localStorage`.
  - Delete current board clears `currentBoardId`.

### Component tests

- `HomePage.test.tsx`
  - Renders empty state.
  - Creates a board and switches to editor.
  - Deletes a board.

- `App.test.tsx`
  - Update existing smoke test to cover home/editor switching.

### Existing tests

- Keep existing `editorStore` tests passing.
- Keep existing geometry/command tests passing.

---

## Decisions Made

| Topic | Decision | Rationale |
|---|---|---|
| Storage | `localStorage` | Chosen by user; no backend. |
| Persistence scope | Shapes only | Viewport and history intentionally reset on refresh. |
| Home page features | List, create, rename, delete | Chosen by user. |
| Routing | In-app view switcher | Chosen by user; avoids new dependency. |
| Architecture | Two stores | Cleaner separation of board catalog vs. editor session. |

---

## Future Work (out of scope)

- Export/import boards as JSON files.
- Backend sync and real-time collaboration.
- Duplicate board.
- Board search/sorting.
- Persistence of viewport and undo/redo history.
