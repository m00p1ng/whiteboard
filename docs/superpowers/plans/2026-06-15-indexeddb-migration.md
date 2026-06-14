# IndexedDB Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace synchronous whole-catalog `localStorage` persistence with asynchronous, per-board IndexedDB persistence while preventing the board list from rendering before startup hydration completes.

**Architecture:** Add a typed `boardDb` adapter around `idb`, keeping database concerns outside Zustand. The board store starts empty, exposes an async initializer that normalizes loaded records, and performs optimistic in-memory updates followed by fire-and-forget targeted writes. `App` gates both the home page and editor until initialization settles, so an empty pre-hydration catalog never flashes on screen.

**Tech Stack:** React 19, TypeScript 6, Zustand 5, IndexedDB, `idb`, `fake-indexeddb`, Vitest 4, Testing Library, jsdom.

---

## File Structure

```text
package.json                         # Add idb runtime and fake-indexeddb test dependencies
package-lock.json                    # Lock dependency versions
src/
├── db/
│   ├── boardDb.ts                   # Typed IndexedDB schema and board CRUD adapter
│   └── boardDb.test.ts              # Real adapter tests against fake-indexeddb
├── store/
│   ├── boardStore.ts                # Async hydration and targeted fire-and-forget writes
│   └── boardStore.test.ts           # Store behavior with a mocked database boundary
├── App.tsx                          # Hold rendering until board initialization settles
├── App.test.tsx                     # Startup-gate and navigation regression coverage
├── pages/
│   ├── BoardPage.test.tsx           # Replace localStorage assertions with database calls
│   └── HomePage.test.tsx            # Remove obsolete localStorage cleanup
└── test/
    └── setup.ts                     # Install fake IndexedDB instead of a localStorage shim
```

No data-copy migration is added. Existing `whiteboard:boards` localStorage data is intentionally ignored.

### Task 1: Install IndexedDB Dependencies and Configure Tests

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/test/setup.ts`

- [ ] **Step 1: Install the runtime and test dependencies**

Run:

```bash
rtk npm install idb
rtk npm install -D fake-indexeddb
```

Expected: `package.json` lists `idb` under `dependencies`, lists `fake-indexeddb` under `devDependencies`, and `package-lock.json` records both packages.

- [ ] **Step 2: Replace the localStorage shim with fake IndexedDB**

Replace `src/test/setup.ts` with:

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

This gives jsdom tests the same `indexedDB` and `IDBKeyRange` globals used by the browser. No localStorage replacement remains because production code will no longer reference it.

- [ ] **Step 3: Run the existing tests to expose remaining localStorage coupling**

Run:

```bash
rtk npm test
```

Expected: tests that still explicitly read or write `localStorage` fail, identifying the assertions that later tasks replace. Tests unrelated to persistence continue to pass.

- [ ] **Step 4: Commit the dependency and test-environment change**

```bash
rtk git add package.json package-lock.json src/test/setup.ts
rtk git commit -m "build: add IndexedDB dependencies"
```

### Task 2: Add the Typed IndexedDB Board Adapter

**Files:**
- Create: `src/db/boardDb.ts`
- Create: `src/db/boardDb.test.ts`

- [ ] **Step 1: Write the failing adapter test**

Create `src/db/boardDb.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { deleteBoard, loadBoards, putBoard } from './boardDb';
import type { Board } from '@/store/boardStore';

const firstBoard: Board = {
  id: 'board-1',
  name: 'First',
  createdAt: 100,
  updatedAt: 100,
  shapes: {},
};

const secondBoard: Board = {
  id: 'board-2',
  name: 'Second',
  createdAt: 200,
  updatedAt: 200,
  shapes: {},
};

beforeEach(async () => {
  const db = await openDB('whiteboard', 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('boards')) {
        database.createObjectStore('boards', { keyPath: 'id' });
      }
    },
  });
  await db.clear('boards');
  db.close();
});

describe('boardDb', () => {
  it('creates the boards store and supports put, load, update, and delete', async () => {
    await putBoard(firstBoard);
    await putBoard(secondBoard);

    expect(await loadBoards()).toEqual(
      expect.arrayContaining([firstBoard, secondBoard])
    );

    await putBoard({ ...firstBoard, name: 'Renamed', updatedAt: 300 });
    expect((await loadBoards()).find((board) => board.id === firstBoard.id))
      .toMatchObject({
        name: 'Renamed',
        updatedAt: 300,
      });

    await deleteBoard(secondBoard.id);
    expect(await loadBoards()).toEqual([
      { ...firstBoard, name: 'Renamed', updatedAt: 300 },
    ]);
  });
});
```

- [ ] **Step 2: Run the adapter test and verify it fails**

Run:

```bash
rtk npm test -- src/db/boardDb.test.ts
```

Expected: FAIL because `src/db/boardDb.ts` does not exist.

- [ ] **Step 3: Implement the typed database adapter**

Create `src/db/boardDb.ts`:

```ts
import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
} from 'idb';
import type { Board } from '@/store/boardStore';

const DB_NAME = 'whiteboard';
const DB_VERSION = 1;
const STORE = 'boards';

interface WhiteboardDb extends DBSchema {
  boards: {
    key: string;
    value: Board;
  };
}

let dbPromise: Promise<IDBPDatabase<WhiteboardDb>> | null = null;

function getDb(): Promise<IDBPDatabase<WhiteboardDb>> {
  if (!dbPromise) {
    dbPromise = openDB<WhiteboardDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      },
    });
  }

  return dbPromise;
}

export async function loadBoards(): Promise<Board[]> {
  const db = await getDb();
  return db.getAll(STORE);
}

export async function putBoard(board: Board): Promise<void> {
  const db = await getDb();
  await db.put(STORE, board);
}

export async function deleteBoard(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}
```

- [ ] **Step 4: Run the adapter test**

Run:

```bash
rtk npm test -- src/db/boardDb.test.ts
```

Expected: PASS with 1 test covering schema creation and all three exported operations.

- [ ] **Step 5: Commit the database adapter**

```bash
rtk git add src/db/boardDb.ts src/db/boardDb.test.ts
rtk git commit -m "feat: add IndexedDB board adapter"
```

### Task 3: Migrate the Board Store to Async Hydration and Targeted Writes

**Files:**
- Modify: `src/store/boardStore.ts`
- Replace persistence coverage in: `src/store/boardStore.test.ts`

- [ ] **Step 1: Replace the board-store tests with database-boundary tests**

Replace `src/store/boardStore.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteBoard as deleteBoardRecord,
  loadBoards,
  putBoard,
} from '@/db/boardDb';
import { initBoardStore, useBoardStore } from './boardStore';

vi.mock('@/db/boardDb', () => ({
  loadBoards: vi.fn(),
  putBoard: vi.fn(),
  deleteBoard: vi.fn(),
}));

const mockedLoadBoards = vi.mocked(loadBoards);
const mockedPutBoard = vi.mocked(putBoard);
const mockedDeleteBoard = vi.mocked(deleteBoardRecord);

beforeEach(() => {
  vi.clearAllMocks();
  mockedLoadBoards.mockResolvedValue([]);
  mockedPutBoard.mockResolvedValue(undefined);
  mockedDeleteBoard.mockResolvedValue(undefined);
  useBoardStore.setState({ boards: [], currentBoardId: null });
});

describe('boardStore', () => {
  it('hydrates boards from IndexedDB without opening one', async () => {
    mockedLoadBoards.mockResolvedValue([
      {
        id: 'existing-id',
        name: 'Existing',
        createdAt: 1,
        updatedAt: 2,
        shapes: {},
      },
    ]);

    await initBoardStore();

    expect(useBoardStore.getState()).toMatchObject({
      currentBoardId: null,
      boards: [{ id: 'existing-id', name: 'Existing' }],
    });
  });

  it('normalizes legacy circle radii during hydration', async () => {
    mockedLoadBoards.mockResolvedValue([
      {
        id: 'legacy-board',
        name: 'Legacy',
        createdAt: 1,
        updatedAt: 2,
        shapes: {
          circle: {
            id: 'circle',
            type: 'circle',
            x: 20,
            y: 30,
            radius: 25,
          },
        },
      } as never,
    ]);

    await initBoardStore();

    expect(useBoardStore.getState().boards[0].shapes.circle).toMatchObject({
      radiusX: 25,
      radiusY: 25,
    });
    expect(useBoardStore.getState().boards[0].shapes.circle)
      .not.toHaveProperty('radius');
  });

  it('creates a board and writes only that board', () => {
    const id = useBoardStore.getState().createBoard('My board');
    const board = useBoardStore.getState().boards[0];

    expect(board).toMatchObject({
      id,
      name: 'My board',
      shapes: {},
    });
    expect(useBoardStore.getState().currentBoardId).toBe(id);
    expect(mockedPutBoard).toHaveBeenCalledWith(board);
  });

  it('renames a board and writes the updated record', () => {
    const id = useBoardStore.getState().createBoard('Old');
    mockedPutBoard.mockClear();

    useBoardStore.getState().renameBoard(id, 'New');

    const board = useBoardStore.getState().boards[0];
    expect(board.name).toBe('New');
    expect(mockedPutBoard).toHaveBeenCalledWith(board);
  });

  it('ignores an empty rename without writing', () => {
    const id = useBoardStore.getState().createBoard('Old');
    mockedPutBoard.mockClear();

    useBoardStore.getState().renameBoard(id, '   ');

    expect(useBoardStore.getState().boards[0].name).toBe('Old');
    expect(mockedPutBoard).not.toHaveBeenCalled();
  });

  it('deletes a board and clears the active id', () => {
    const id = useBoardStore.getState().createBoard();
    useBoardStore.getState().deleteBoard(id);

    expect(useBoardStore.getState().boards).toEqual([]);
    expect(useBoardStore.getState().currentBoardId).toBeNull();
    expect(mockedDeleteBoard).toHaveBeenCalledWith(id);
  });

  it('saves only the active board with its new shapes and timestamp', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValue(300);
    const id = useBoardStore.getState().createBoard('Diagram');
    mockedPutBoard.mockClear();

    useBoardStore.getState().saveCurrentBoard({
      rect: {
        id: 'rect',
        type: 'rect',
        x: 10,
        y: 20,
        width: 100,
        height: 60,
      },
    });

    const board = useBoardStore.getState().boards[0];
    expect(board).toMatchObject({
      id,
      updatedAt: 300,
      shapes: {
        rect: {
          type: 'rect',
          x: 10,
          y: 20,
        },
      },
    });
    expect(mockedPutBoard).toHaveBeenCalledWith(board);
  });

  it('keeps optimistic state changes when a database write rejects', async () => {
    mockedPutBoard.mockRejectedValueOnce(new Error('write failed'));

    const id = useBoardStore.getState().createBoard('Still visible');
    await Promise.resolve();

    expect(useBoardStore.getState().boards[0]).toMatchObject({
      id,
      name: 'Still visible',
    });
  });
});
```

- [ ] **Step 2: Run the board-store tests and verify they fail**

Run:

```bash
rtk npm test -- src/store/boardStore.test.ts
```

Expected: FAIL because `initBoardStore` is not exported and store actions still call localStorage instead of the mocked database functions.

- [ ] **Step 3: Replace localStorage initialization with database initialization**

At the top of `src/store/boardStore.ts`, add:

```ts
import {
  deleteBoard as deleteBoardRecord,
  loadBoards,
  putBoard,
} from '@/db/boardDb';
```

Delete `STORAGE_KEY`, the synchronous `loadBoards()` helper, and `persistBoards()`.

Add this helper after `normalizeBoard`:

```ts
function ignorePersistenceError(promise: Promise<void>): void {
  void promise.catch(() => undefined);
}
```

Add the exported initializer before the Zustand store:

```ts
export async function initBoardStore(): Promise<void> {
  const boards = await loadBoards();
  useBoardStore.setState({ boards: boards.map(normalizeBoard) });
}
```

Initialize the store with an empty catalog:

```ts
export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoardId: null,
```

- [ ] **Step 4: Replace whole-catalog persistence with targeted writes**

In `createBoard`, replace the `next` array and `persistBoards(next)` logic with:

```ts
set({ boards: [...get().boards, board], currentBoardId: id });
ignorePersistenceError(putBoard(board));
return id;
```

Replace `renameBoard` with:

```ts
renameBoard: (id, name) => {
  const trimmed = name.trim();
  if (!trimmed) return;

  const existing = get().boards.find((board) => board.id === id);
  if (!existing) return;

  const updatedBoard = {
    ...existing,
    name: trimmed,
    updatedAt: Date.now(),
  };
  set({
    boards: get().boards.map((board) =>
      board.id === id ? updatedBoard : board
    ),
  });
  ignorePersistenceError(putBoard(updatedBoard));
},
```

Replace `deleteBoard` with:

```ts
deleteBoard: (id) => {
  const updates: Partial<BoardState> = {
    boards: get().boards.filter((board) => board.id !== id),
  };
  if (get().currentBoardId === id) {
    updates.currentBoardId = null;
  }
  set(updates);
  ignorePersistenceError(deleteBoardRecord(id));
},
```

Replace `saveCurrentBoard` with:

```ts
saveCurrentBoard: (shapes) => {
  const { currentBoardId, boards } = get();
  if (!currentBoardId) return;

  const existing = boards.find((board) => board.id === currentBoardId);
  if (!existing) return;

  const updatedBoard = {
    ...existing,
    shapes,
    updatedAt: Date.now(),
  };
  set({
    boards: boards.map((board) =>
      board.id === currentBoardId ? updatedBoard : board
    ),
  });
  ignorePersistenceError(putBoard(updatedBoard));
},
```

- [ ] **Step 5: Run the store and adapter tests**

Run:

```bash
rtk npm test -- src/store/boardStore.test.ts src/db/boardDb.test.ts
```

Expected: PASS with the store tests using mocked persistence and the adapter test using fake IndexedDB.

- [ ] **Step 6: Commit the store migration**

```bash
rtk git add src/store/boardStore.ts src/store/boardStore.test.ts
rtk git commit -m "feat: persist board records in IndexedDB"
```

### Task 4: Gate App Rendering and Remove localStorage Test Assumptions

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/pages/BoardPage.test.tsx`
- Modify: `src/pages/HomePage.test.tsx`

- [ ] **Step 1: Write App startup-gate tests**

Replace `src/App.test.tsx` with:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { initBoardStore, useBoardStore } from './store/boardStore';
import { useEditorStore } from './store/editorStore';

vi.mock('./store/boardStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./store/boardStore')>();
  return {
    ...actual,
    initBoardStore: vi.fn(),
  };
});

const mockedInitBoardStore = vi.mocked(initBoardStore);

beforeEach(() => {
  vi.clearAllMocks();
  mockedInitBoardStore.mockResolvedValue(undefined);
  useBoardStore.setState({ boards: [], currentBoardId: null });
  useEditorStore.getState().reset();
});

describe('App', () => {
  it('does not render the board list until IndexedDB hydration completes', async () => {
    let finishInitialization!: () => void;
    mockedInitBoardStore.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishInitialization = resolve;
        })
    );

    render(<App />);

    expect(
      screen.queryByRole('heading', { name: /boards/i })
    ).not.toBeInTheDocument();

    await act(async () => {
      finishInitialization();
    });

    expect(
      await screen.findByRole('heading', { name: /boards/i })
    ).toBeInTheDocument();
  });

  it('renders the home page after initialization', async () => {
    render(<App />);

    expect(
      await screen.findByRole('button', { name: /new board/i })
    ).toBeInTheDocument();
  });

  it('still renders the app when IndexedDB initialization rejects', async () => {
    mockedInitBoardStore.mockRejectedValue(new Error('database unavailable'));

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /boards/i })
    ).toBeInTheDocument();
  });

  it('switches to the editor when creating a board', async () => {
    render(<App />);
    fireEvent.click(
      await screen.findByRole('button', { name: /new board/i })
    );

    expect(screen.getByLabelText(/back to boards/i)).toBeInTheDocument();
  });

  it('returns to the home page when clicking back', async () => {
    render(<App />);
    fireEvent.click(
      await screen.findByRole('button', { name: /new board/i })
    );
    fireEvent.click(screen.getByLabelText(/back to boards/i));

    expect(
      screen.getByRole('heading', { name: /boards/i })
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the App tests and verify the startup test fails**

Run:

```bash
rtk npm test -- src/App.test.tsx
```

Expected: FAIL because `App` immediately renders `HomePage` without calling or awaiting `initBoardStore`.

- [ ] **Step 3: Implement the App initialization gate**

Replace `src/App.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { BoardPage } from '@/pages/BoardPage';
import { HomePage } from '@/pages/HomePage';
import { initBoardStore, useBoardStore } from '@/store/boardStore';

function App() {
  const [initialized, setInitialized] = useState(false);
  const currentBoardId = useBoardStore((state) => state.currentBoardId);

  useEffect(() => {
    let active = true;

    void initBoardStore()
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setInitialized(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!initialized) {
    return null;
  }

  return currentBoardId ? <BoardPage /> : <HomePage />;
}

export default App;
```

- [ ] **Step 4: Replace BoardPage localStorage assertions with database calls**

In `src/pages/BoardPage.test.tsx`, add:

```ts
import { putBoard } from '@/db/boardDb';

vi.mock('@/db/boardDb', () => ({
  loadBoards: vi.fn(),
  putBoard: vi.fn().mockResolvedValue(undefined),
  deleteBoard: vi.fn(),
}));

const mockedPutBoard = vi.mocked(putBoard);
```

In `beforeEach`, remove `localStorage.clear()` and the `localStorage.setItem(...)` block. Add:

```ts
mockedPutBoard.mockClear();
```

Replace the first test's storage assertions with:

```ts
expect(mockedPutBoard).not.toHaveBeenCalled();
expect(useBoardStore.getState().boards[0]).toMatchObject({
  shapes: { [savedShape.id]: savedShape },
  updatedAt: 200,
});
```

Replace the second test's final localStorage assertions with:

```ts
expect(mockedPutBoard).toHaveBeenCalledWith(board);
```

- [ ] **Step 5: Remove obsolete HomePage localStorage cleanup**

In `src/pages/HomePage.test.tsx`, delete:

```ts
localStorage.clear();
```

Keep the explicit Zustand reset in `beforeEach`; it is the correct isolation boundary for component tests that do not initialize the database.

- [ ] **Step 6: Run all persistence and rendering tests**

Run:

```bash
rtk npm test -- src/db/boardDb.test.ts src/store/boardStore.test.ts src/pages/BoardPage.test.tsx src/pages/HomePage.test.tsx src/App.test.tsx
```

Expected: PASS. The App test proves the home page waits for hydration, BoardPage proves editor autosave calls `putBoard`, and no test reads or writes localStorage.

- [ ] **Step 7: Confirm localStorage is fully removed**

Run:

```bash
rtk rg -n "localStorage|whiteboard:boards|STORAGE_KEY" src
```

Expected: no matches.

- [ ] **Step 8: Run full verification**

Run:

```bash
rtk npm test
rtk npm run lint
rtk npm run build
```

Expected: the complete Vitest suite passes, ESLint reports no errors, and TypeScript/Vite produce a successful production build.

- [ ] **Step 9: Commit the startup gate and test cleanup**

```bash
rtk git add src/App.tsx src/App.test.tsx src/pages/BoardPage.test.tsx src/pages/HomePage.test.tsx
rtk git commit -m "feat: await board hydration before rendering"
```
