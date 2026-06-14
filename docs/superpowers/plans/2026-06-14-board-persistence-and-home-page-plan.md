# Board Persistence and Home Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each board's diagram shapes to `localStorage` and add a home page to create, list, rename, delete, and open boards.

**Architecture:** Introduce a new `boardStore` that owns the board catalog and `localStorage` persistence. Keep the existing `editorStore` focused on the active drawing session. `App.tsx` switches between `HomePage` and `BoardPage` based on `boardStore.currentBoardId`. `BoardPage` loads a board's shapes into `editorStore` on mount and saves them back whenever they change.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Zustand 5, Tailwind CSS 3, shadcn/ui, Vitest 4, jsdom.

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `src/store/boardStore.ts` | Board catalog state, CRUD actions, `localStorage` persistence. |
| `src/store/boardStore.test.ts` | Unit tests for board CRUD and persistence. |
| `src/pages/HomePage.tsx` | Lists boards, supports create/rename/delete/open. |
| `src/pages/HomePage.test.tsx` | Component tests for the home page. |
| `src/pages/BoardPage.tsx` | Editor shell: loads shapes, saves shapes, renders toolbar + canvas. |

### Modified files

| File | Change |
|---|---|
| `src/store/editorStore.ts` | Add `setShapes` and `reset` actions. |
| `src/components/Toolbar.tsx` | Add a "Back to boards" button when a board is open. |
| `src/App.tsx` | Render `HomePage` or `BoardPage` based on `currentBoardId`; remove `useHotkeys` call. |
| `src/App.test.tsx` | Update smoke test for the new home/editor switch. |

---

## Task 1: Extend `editorStore` with session reset helpers

**Files:**
- Modify: `src/store/editorStore.ts`
- Test: `src/store/editorStore.test.ts`

### Step 1: Add `setShapes` and `reset` actions

Add two new actions to the `EditorState` interface and implementation. `setShapes` replaces the shape map (used when opening a board). `reset` clears the editor session (used when leaving a board).

Modify the interface around line 34 of `src/store/editorStore.ts`:

```ts
interface EditorState {
  shapes: Record<string, Shape>;
  tool: Tool;
  selectedId: string | null;
  viewport: Viewport;
  undoStack: Command[];
  redoStack: Command[];
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  execute: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: Tool) => void;
  setSelectedId: (id: string | null) => void;
  setViewport: (updates: Partial<Viewport>) => void;
  setShapes: (shapes: Record<string, Shape>) => void;
  reset: () => void;
}
```

Add the implementations before the closing `}));`:

```ts
  setShapes: (shapes) => set({ shapes, undoStack: [], redoStack: [] }),
  reset: () =>
    set({
      shapes: {},
      tool: 'select',
      selectedId: null,
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      undoStack: [],
      redoStack: [],
    }),
```

### Step 2: Run existing editor store tests

Run:

```bash
npm test -- src/store/editorStore.test.ts
```

Expected: all tests pass.

### Step 3: Commit

```bash
git add src/store/editorStore.ts

git commit -m "feat(editorStore): add setShapes and reset actions"
```

---

## Task 2: Create `boardStore` with localStorage persistence

**Files:**
- Create: `src/store/boardStore.ts`

### Step 1: Write `src/store/boardStore.ts`

Create the file with the board model, persistence helpers, and Zustand store.

```ts
import { create } from 'zustand';
import type { Shape } from '@/types/shape';

const STORAGE_KEY = 'whiteboard:boards';

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  shapes: Record<string, Shape>;
}

interface BoardState {
  boards: Board[];
  currentBoardId: string | null;
  createBoard: (name?: string) => string;
  openBoard: (id: string) => void;
  closeBoard: () => void;
  renameBoard: (id: string, name: string) => void;
  deleteBoard: (id: string) => void;
  saveCurrentBoard: (shapes: Record<string, Shape>) => void;
}

function loadBoards(): Board[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Board[];
  } catch {
    return [];
  }
}

function persistBoards(boards: Board[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  } catch {
    // Ignore quota/private-mode errors.
  }
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: loadBoards(),
  currentBoardId: null,
  createBoard: (name) => {
    const id = crypto.randomUUID();
    const board: Board = {
      id,
      name: name?.trim() || 'Untitled board',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      shapes: {},
    };
    const next = [...get().boards, board];
    set({ boards: next, currentBoardId: id });
    persistBoards(next);
    return id;
  },
  openBoard: (id) => {
    set({ currentBoardId: id });
  },
  closeBoard: () => {
    set({ currentBoardId: null });
  },
  renameBoard: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = get().boards.map((board) =>
      board.id === id
        ? { ...board, name: trimmed, updatedAt: Date.now() }
        : board
    );
    set({ boards: next });
    persistBoards(next);
  },
  deleteBoard: (id) => {
    const next = get().boards.filter((board) => board.id !== id);
    const updates: Partial<BoardState> = { boards: next };
    if (get().currentBoardId === id) {
      updates.currentBoardId = null;
    }
    set(updates);
    persistBoards(next);
  },
  saveCurrentBoard: (shapes) => {
    const { currentBoardId } = get();
    if (!currentBoardId) return;
    const next = get().boards.map((board) =>
      board.id === currentBoardId
        ? { ...board, shapes, updatedAt: Date.now() }
        : board
    );
    set({ boards: next });
    persistBoards(next);
  },
}));
```

### Step 2: Commit

```bash
git add src/store/boardStore.ts

git commit -m "feat(boardStore): add board catalog with localStorage persistence"
```

---

## Task 3: Test `boardStore`

**Files:**
- Create: `src/store/boardStore.test.ts`

### Step 1: Reset state and storage before each test

Use `useBoardStore.setState` to reset the in-memory state and clear `localStorage`.

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBoardStore } from './boardStore';

beforeEach(() => {
  localStorage.clear();
  useBoardStore.setState({ boards: [], currentBoardId: null });
});
```

### Step 2: Write the tests

Add tests for create, rename, delete, persistence, and deleting the active board.

```ts
describe('boardStore', () => {
  it('creates a board with a default name', () => {
    const id = useBoardStore.getState().createBoard();
    const board = useBoardStore.getState().boards[0];
    expect(board).toBeDefined();
    expect(board.id).toBe(id);
    expect(board.name).toBe('Untitled board');
    expect(board.shapes).toEqual({});
    expect(useBoardStore.getState().currentBoardId).toBe(id);
  });

  it('creates a board with a custom name', () => {
    const id = useBoardStore.getState().createBoard('My board');
    const board = useBoardStore.getState().boards.find((b) => b.id === id);
    expect(board?.name).toBe('My board');
  });

  it('renames a board', () => {
    const id = useBoardStore.getState().createBoard('Old');
    useBoardStore.getState().renameBoard(id, 'New');
    const board = useBoardStore.getState().boards.find((b) => b.id === id);
    expect(board?.name).toBe('New');
  });

  it('ignores empty rename', () => {
    const id = useBoardStore.getState().createBoard('Old');
    useBoardStore.getState().renameBoard(id, '   ');
    const board = useBoardStore.getState().boards.find((b) => b.id === id);
    expect(board?.name).toBe('Old');
  });

  it('deletes a board', () => {
    const id = useBoardStore.getState().createBoard();
    useBoardStore.getState().deleteBoard(id);
    expect(useBoardStore.getState().boards).toHaveLength(0);
  });

  it('clears current board id when deleting the active board', () => {
    const id = useBoardStore.getState().createBoard();
    useBoardStore.getState().deleteBoard(id);
    expect(useBoardStore.getState().currentBoardId).toBeNull();
  });

  it('persists boards to localStorage', () => {
    const id = useBoardStore.getState().createBoard('Persisted');
    const raw = localStorage.getItem('whiteboard:boards');
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(id);
    expect(parsed[0].name).toBe('Persisted');
  });

  it('loads boards from localStorage on import', async () => {
    const stored = [
      {
        id: 'existing-id',
        name: 'Existing',
        createdAt: 1,
        updatedAt: 2,
        shapes: {},
      },
    ];
    localStorage.setItem('whiteboard:boards', JSON.stringify(stored));
    vi.resetModules();
    const { useBoardStore: fresh } = await import('./boardStore');
    expect(fresh.getState().boards).toHaveLength(1);
    expect(fresh.getState().boards[0].id).toBe('existing-id');
  });
});
```

### Step 3: Run the tests

Run:

```bash
npm test -- src/store/boardStore.test.ts
```

Expected: all 8 tests pass.

### Step 4: Commit

```bash
git add src/store/boardStore.test.ts

git commit -m "test(boardStore): add CRUD and persistence tests"
```

---

## Task 4: Create `BoardPage`

**Files:**
- Create: `src/pages/BoardPage.tsx`

### Step 1: Create the pages directory

Run:

```bash
mkdir -p src/pages
```

### Step 2: Write `src/pages/BoardPage.tsx`

This page loads the current board's shapes into `editorStore`, watches for shape changes, and saves them back to `boardStore`.

```tsx
import { useEffect } from 'react';
import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';
import { useBoardStore } from '@/store/boardStore';
import { useEditorStore } from '@/store/editorStore';
import { useHotkeys } from '@/hooks/useHotkeys';

export function BoardPage() {
  useHotkeys();
  const currentBoard = useBoardStore((state) =>
    state.boards.find((board) => board.id === state.currentBoardId)
  );
  const saveCurrentBoard = useBoardStore((state) => state.saveCurrentBoard);
  const shapes = useEditorStore((state) => state.shapes);

  useEffect(() => {
    if (currentBoard) {
      useEditorStore.setState({
        shapes: currentBoard.shapes,
        undoStack: [],
        redoStack: [],
      });
    }
  }, [currentBoard?.id]);

  useEffect(() => {
    saveCurrentBoard(shapes);
  }, [shapes, saveCurrentBoard]);

  if (!currentBoard) {
    return null;
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-gray-50">
      <Toolbar />
      <Canvas />
    </div>
  );
}
```

### Step 3: Commit

```bash
git add src/pages/BoardPage.tsx

git commit -m "feat(boardPage): add editor shell with load/save lifecycle"
```

---

## Task 5: Create `HomePage`

**Files:**
- Create: `src/pages/HomePage.tsx`

### Step 1: Write `src/pages/HomePage.tsx`

Display a grid of boards with create, rename, delete, and open actions.

```tsx
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBoardStore } from '@/store/boardStore';

export function HomePage() {
  const boards = useBoardStore((state) => state.boards);
  const createBoard = useBoardStore((state) => state.createBoard);
  const openBoard = useBoardStore((state) => state.openBoard);
  const renameBoard = useBoardStore((state) => state.renameBoard);
  const deleteBoard = useBoardStore((state) => state.deleteBoard);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleRename = (id: string, value: string) => {
    renameBoard(id, value);
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Boards</h1>
          <Button onClick={() => createBoard()}>
            <Plus className="h-4 w-4 mr-2" />
            New board
          </Button>
        </div>

        {boards.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">No boards yet.</p>
            <Button onClick={() => createBoard()} className="mt-4">
              Create your first board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {editingId === board.id ? (
                  <input
                    autoFocus
                    data-testid="rename-input"
                    defaultValue={board.name}
                    onBlur={(e) => handleRename(board.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRename(board.id, e.currentTarget.value);
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                ) : (
                  <h2
                    className="font-semibold text-lg cursor-pointer"
                    onClick={() => openBoard(board.id)}
                  >
                    {board.name}
                  </h2>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Updated {new Date(board.updatedAt).toLocaleString()}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingId(board.id)}
                    aria-label={`Rename ${board.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteBoard(board.id)}
                    aria-label={`Delete ${board.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 2: Commit

```bash
git add src/pages/HomePage.tsx

git commit -m "feat(homePage): add board list with create, rename, delete"
```

---

## Task 6: Update `Toolbar` with back button

**Files:**
- Modify: `src/components/Toolbar.tsx`

### Step 1: Add imports and back button

Add `ArrowLeft` icon and import the board store. Add a back button that appears when a board is open.

```tsx
import { ArrowLeft, MousePointer2, Square, Circle, Minus, Type, GitCommitHorizontal, Undo2, Redo2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useBoardStore } from '@/store/boardStore';
import { useEditorStore, type Tool } from '@/store/editorStore';
```

Inside the component, read board state:

```tsx
export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const selectedId = useEditorStore((s) => s.selectedId);
  const removeShape = useEditorStore((s) => s.removeShape);
  const reset = useEditorStore((s) => s.reset);
  const currentBoardId = useBoardStore((s) => s.currentBoardId);
  const closeBoard = useBoardStore((s) => s.closeBoard);

  const handleBack = () => {
    closeBoard();
    reset();
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-lg border bg-background p-2 shadow-sm">
      {currentBoardId && (
        <>
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Back to boards">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border" />
        </>
      )}
      <ToggleGroup type="single" value={tool} onValueChange={(v) => v && setTool(v as Tool)}>
        {tools.map((t) => (
          <ToggleGroupItem key={t.value} value={t.value} aria-label={t.label}>
            {t.icon}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="h-6 w-px bg-border" />
      <Button variant="ghost" size="icon" onClick={undo} aria-label="Undo">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={redo} aria-label="Redo">
        <Redo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={!selectedId}
        onClick={() => selectedId && removeShape(selectedId)}
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

### Step 2: Run lint/tests

Run:

```bash
npm run lint
npm test -- src/components/Toolbar
```

Expected: lint passes and existing tests pass. (No Toolbar tests exist today.)

### Step 3: Commit

```bash
git add src/components/Toolbar.tsx

git commit -m "feat(toolbar): add back to boards button"
```

---

## Task 7: Update `App.tsx` to switch views

**Files:**
- Modify: `src/App.tsx`

### Step 1: Replace App content

```tsx
import { useBoardStore } from '@/store/boardStore';
import { BoardPage } from '@/pages/BoardPage';
import { HomePage } from '@/pages/HomePage';

function App() {
  const currentBoardId = useBoardStore((state) => state.currentBoardId);
  return currentBoardId ? <BoardPage /> : <HomePage />;
}

export default App;
```

### Step 2: Run the existing smoke test

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: test currently renders the toolbar; it will likely fail because the home page no longer shows the toolbar. Move on to Task 8 to update the test.

### Step 3: Commit

```bash
git add src/App.tsx

git commit -m "feat(app): switch between home and board pages"
```

---

## Task 8: Update tests for the new flow

**Files:**
- Modify: `src/App.test.tsx`
- Create: `src/pages/HomePage.test.tsx`

### Step 1: Update `src/App.test.tsx`

Replace the existing test with tests for the home/editor switch.

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { useBoardStore } from './store/boardStore';
import { useEditorStore } from './store/editorStore';

beforeEach(() => {
  localStorage.clear();
  useBoardStore.setState({ boards: [], currentBoardId: null });
  useEditorStore.getState().reset();
});

describe('App', () => {
  it('renders the home page by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /boards/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new board/i })).toBeInTheDocument();
  });

  it('switches to the editor when creating a board', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /new board/i }));
    expect(screen.getByLabelText(/back to boards/i })).toBeInTheDocument();
  });

  it('returns to the home page when clicking back', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /new board/i }));
    fireEvent.click(screen.getByLabelText(/back to boards/i }));
    expect(screen.getByRole('heading', { name: /boards/i })).toBeInTheDocument();
  });
});
```

### Step 2: Create `src/pages/HomePage.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomePage } from './HomePage';
import { useBoardStore } from '@/store/boardStore';

beforeEach(() => {
  localStorage.clear();
  useBoardStore.setState({ boards: [], currentBoardId: null });
});

describe('HomePage', () => {
  it('shows empty state when no boards exist', () => {
    render(<HomePage />);
    expect(screen.getByText(/no boards yet/i })).toBeInTheDocument();
  });

  it('creates a board', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByRole('button', { name: /new board/i }));
    expect(useBoardStore.getState().boards).toHaveLength(1);
    expect(useBoardStore.getState().currentBoardId).not.toBeNull();
  });

  it('lists existing boards', () => {
    useBoardStore.getState().createBoard('Project plan');
    render(<HomePage />);
    expect(screen.getByText('Project plan')).toBeInTheDocument();
  });

  it('deletes a board', () => {
    useBoardStore.getState().createBoard('Delete me');
    render(<HomePage />);
    fireEvent.click(screen.getByLabelText(/delete delete me/i }));
    expect(useBoardStore.getState().boards).toHaveLength(0);
  });
});
```

### Step 3: Run all tests

Run:

```bash
npm test
```

Expected: full test suite passes.

### Step 4: Commit

```bash
git add src/App.test.tsx src/pages/HomePage.test.tsx

git commit -m "test: update app and add home page tests"
```

---

## Task 9: Verify build and lint

**Files:**
- None (verification only)

### Step 1: Run lint

Run:

```bash
npm run lint
```

Expected: no errors.

### Step 2: Run build

Run:

```bash
npm run build
```

Expected: TypeScript compilation succeeds and Vite build completes.

### Step 3: Manual smoke test (optional)

Run:

```bash
npm run dev
```

Open the printed local URL in a browser. Verify:

1. Home page loads with "Boards" heading.
2. "New board" creates a board and opens the editor.
3. Drawing shapes, then refreshing the browser, returns to home with the board listed.
4. Opening that board restores its shapes.
5. Rename and delete work from the home page.
6. The back button returns to the home page.

### Step 4: Commit

If no code changes were needed, skip this step. If any lint/build fixes were required, commit them.

---

## Self-Review Checklist

- [ ] **Spec coverage:**
  - Persist shapes across refresh → `boardStore` save/load, `BoardPage` load/save.
  - Home page list → `HomePage` board grid.
  - Create board → `HomePage` "New board" button + `createBoard`.
  - Rename board → `HomePage` rename flow + `renameBoard`.
  - Delete board → `HomePage` delete button + `deleteBoard`.
  - Open board → `HomePage` click board title + `openBoard`.
  - Back to home → `Toolbar` back button + `closeBoard`/`reset`.
  - Only shapes persisted → `Board` stores only `shapes`; viewport/history not stored.
- [ ] **No placeholders:** every task includes exact code, commands, and expected output.
- [ ] **Type consistency:** `Board`, `BoardState`, `createBoard`, `renameBoard`, `deleteBoard`, `saveCurrentBoard`, `setShapes`, `reset` names are consistent across tasks.
