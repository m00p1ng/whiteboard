# Board Shape Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore saved board shapes after reopening the app, prevent hydration from overwriting them, autosave genuine edits, and list boards by most recent edit.

**Architecture:** Keep `boardStore` as the persistent board catalog and `editorStore` as the active editing session. `BoardPage` will track which board has finished hydration and the exact shape-map reference loaded from storage, allowing autosave to ignore both the pre-hydration editor state and the initial hydrated state while saving the first genuine shape change.

**Tech Stack:** React 19, TypeScript 6, Zustand 5, Vitest 4, Testing Library, localStorage.

---

## File Structure

```text
src/
├── pages/
│   ├── BoardPage.tsx       # Hydrate safely and autosave only post-hydration edits
│   ├── BoardPage.test.tsx  # Persistence lifecycle regression tests
│   ├── HomePage.tsx        # Render a copied board list sorted by updatedAt
│   └── HomePage.test.tsx   # Ordering and non-mutation coverage
└── store/
    ├── boardStore.ts       # Existing synchronous save and updatedAt behavior
    └── boardStore.test.ts  # Verify saved shapes and fresh-import startup state
```

No storage schema changes or new dependencies are required.

### Task 1: Protect Board Hydration and Autosave Genuine Shape Changes

**Files:**
- Create: `src/pages/BoardPage.test.tsx`
- Modify: `src/pages/BoardPage.tsx:1-35`

- [ ] **Step 1: Write failing BoardPage persistence tests**

Create `src/pages/BoardPage.test.tsx`:

```tsx
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardPage } from './BoardPage';
import { useBoardStore } from '@/store/boardStore';
import { useEditorStore } from '@/store/editorStore';
import type { RectShape } from '@/types/shape';

vi.mock('@/components/Canvas', () => ({
  Canvas: () => <div>Canvas</div>,
}));
vi.mock('@/components/LeftToolbar', () => ({
  LeftToolbar: () => null,
}));
vi.mock('@/components/Minimap', () => ({
  Minimap: () => null,
}));
vi.mock('@/components/TopBar', () => ({
  TopBar: () => null,
}));
vi.mock('@/components/ZoomControls', () => ({
  ZoomControls: () => null,
}));
vi.mock('@/hooks/useHotkeys', () => ({
  useHotkeys: () => undefined,
}));

const savedShape: RectShape = {
  id: 'saved',
  type: 'rect',
  x: 10,
  y: 20,
  width: 100,
  height: 60,
};

beforeEach(() => {
  localStorage.clear();
  useEditorStore.getState().reset();
  useBoardStore.setState({
    boards: [
      {
        id: 'board-1',
        name: 'Persisted board',
        createdAt: 100,
        updatedAt: 200,
        shapes: { [savedShape.id]: savedShape },
      },
    ],
    currentBoardId: 'board-1',
  });
  localStorage.setItem(
    'whiteboard:boards',
    JSON.stringify(useBoardStore.getState().boards)
  );
});

describe('BoardPage persistence', () => {
  it('hydrates saved shapes without overwriting storage with the initial editor state', () => {
    render(<BoardPage />);

    expect(useEditorStore.getState().shapes).toEqual({
      [savedShape.id]: savedShape,
    });

    const stored = JSON.parse(localStorage.getItem('whiteboard:boards')!);
    expect(stored[0].shapes).toEqual({ [savedShape.id]: savedShape });
    expect(stored[0].updatedAt).toBe(200);
  });

  it('persists the first shape change after hydration', () => {
    vi.spyOn(Date, 'now').mockReturnValue(500);
    render(<BoardPage />);

    act(() => {
      useEditorStore.getState().addShape({
        id: 'new-shape',
        type: 'circle',
        x: 30,
        y: 40,
        radius: 20,
      });
    });

    const board = useBoardStore.getState().boards[0];
    expect(board.shapes).toHaveProperty('saved');
    expect(board.shapes).toHaveProperty('new-shape');
    expect(board.updatedAt).toBe(500);

    const stored = JSON.parse(localStorage.getItem('whiteboard:boards')!);
    expect(stored[0].shapes).toHaveProperty('new-shape');
    expect(stored[0].updatedAt).toBe(500);
  });
});
```

- [ ] **Step 2: Run the tests and verify the hydration regression fails**

Run:

```bash
rtk npm test -- src/pages/BoardPage.test.tsx
```

Expected: the hydration test fails because the current autosave effect writes
the editor's initial empty shape map and changes `updatedAt` before the saved
shapes are safely established.

- [ ] **Step 3: Implement board-aware hydration tracking**

Update the React import in `src/pages/BoardPage.tsx`:

```ts
import { useEffect, useRef, useState } from 'react';
```

Import the shape type:

```ts
import type { Shape } from '@/types/shape';
```

After selecting `shapes`, add:

```ts
const [hydratedBoardId, setHydratedBoardId] = useState<string | null>(null);
const hydratedShapesRef = useRef<Record<string, Shape> | null>(null);
```

Replace the hydration effect with:

```ts
useEffect(() => {
  setHydratedBoardId(null);
  const board = useBoardStore
    .getState()
    .boards.find((candidate) => candidate.id === currentBoardId);

  if (!board) {
    hydratedShapesRef.current = null;
    return;
  }

  hydratedShapesRef.current = board.shapes;
  useEditorStore.getState().setShapes(board.shapes);
  setHydratedBoardId(board.id);
}, [currentBoardId]);
```

Replace the autosave effect with:

```ts
useEffect(() => {
  if (
    !currentBoardId ||
    hydratedBoardId !== currentBoardId ||
    shapes === hydratedShapesRef.current
  ) {
    return;
  }

  saveCurrentBoard(shapes);
  hydratedShapesRef.current = shapes;
}, [currentBoardId, hydratedBoardId, shapes, saveCurrentBoard]);
```

The state guard prevents the mount render's stale shapes from saving. The
reference guard prevents the just-loaded storage value from counting as an
edit. Every editor command creates a new shape-map reference, so the first real
edit passes both guards.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
rtk npm test -- src/pages/BoardPage.test.tsx
```

Expected: PASS with 2 tests.

- [ ] **Step 5: Commit the hydration fix**

```bash
rtk git add src/pages/BoardPage.tsx src/pages/BoardPage.test.tsx
rtk git commit -m "fix: preserve shapes during board hydration"
```

### Task 2: Verify Storage Round Trips and Home-Page Startup

**Files:**
- Modify: `src/store/boardStore.test.ts`

- [ ] **Step 1: Add failing persistence contract tests**

Append these tests inside the existing `describe('boardStore', ...)` block:

```ts
it('persists saved shapes and updates the edit timestamp', () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(100);
  const id = useBoardStore.getState().createBoard('Diagram');
  now.mockReturnValue(300);

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

  const stored = JSON.parse(localStorage.getItem('whiteboard:boards')!);
  expect(stored[0].shapes.rect).toMatchObject({
    type: 'rect',
    x: 10,
    y: 20,
  });
  expect(stored[0].updatedAt).toBe(300);
  expect(useBoardStore.getState().boards[0].id).toBe(id);
});

it('loads saved shapes on a fresh import without reopening a board', async () => {
  localStorage.setItem(
    'whiteboard:boards',
    JSON.stringify([
      {
        id: 'saved-board',
        name: 'Saved board',
        createdAt: 1,
        updatedAt: 2,
        shapes: {
          text: {
            id: 'text',
            type: 'text',
            x: 5,
            y: 6,
            text: 'Persisted',
            fontSize: 18,
          },
        },
      },
    ])
  );

  vi.resetModules();
  const { useBoardStore: fresh } = await import('./boardStore');

  expect(fresh.getState().currentBoardId).toBeNull();
  expect(fresh.getState().boards[0].shapes.text).toMatchObject({
    text: 'Persisted',
  });
});
```

- [ ] **Step 2: Run the store tests**

Run:

```bash
rtk npm test -- src/store/boardStore.test.ts
```

Expected: PASS. These tests lock down existing synchronous storage behavior and
the required home-page startup state; no production store change is expected.

- [ ] **Step 3: Commit the persistence contract coverage**

```bash
rtk git add src/store/boardStore.test.ts
rtk git commit -m "test: cover board shape persistence"
```

### Task 3: Sort Boards by Most Recent Edit Without Mutating Store State

**Files:**
- Modify: `src/pages/HomePage.test.tsx`
- Modify: `src/pages/HomePage.tsx:6-40`

- [ ] **Step 1: Write the failing ordering test**

Add `within` to the Testing Library import in
`src/pages/HomePage.test.tsx`:

```ts
import { render, screen, fireEvent, within } from '@testing-library/react';
```

Append this test inside `describe('HomePage', ...)`:

```tsx
it('orders boards by most recent edit without mutating store order', () => {
  useBoardStore.setState({
    boards: [
      {
        id: 'older',
        name: 'Older board',
        createdAt: 1,
        updatedAt: 100,
        shapes: {},
      },
      {
        id: 'newer',
        name: 'Newer board',
        createdAt: 2,
        updatedAt: 300,
        shapes: {},
      },
      {
        id: 'middle',
        name: 'Middle board',
        createdAt: 3,
        updatedAt: 200,
        shapes: {},
      },
    ],
    currentBoardId: null,
  });

  render(<HomePage />);

  const boardGrid = screen.getByTestId('board-grid');
  const headings = within(boardGrid).getAllByRole('heading', { level: 2 });
  expect(headings.map((heading) => heading.textContent)).toEqual([
    'Newer board',
    'Middle board',
    'Older board',
  ]);
  expect(useBoardStore.getState().boards.map((board) => board.id)).toEqual([
    'older',
    'newer',
    'middle',
  ]);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
rtk npm test -- src/pages/HomePage.test.tsx -t "orders boards"
```

Expected: FAIL because `HomePage` currently renders the store's insertion order
and the board grid has no test identifier.

- [ ] **Step 3: Implement derived sorting**

In `src/pages/HomePage.tsx`, add the derived list after local state:

```ts
const sortedBoards = [...boards].sort(
  (a, b) => b.updatedAt - a.updatedAt
);
```

Add the test identifier and render the sorted copy:

```tsx
<div
  data-testid="board-grid"
  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
>
  {sortedBoards.map((board) => (
```

Keep the empty-state condition based on `boards.length`.

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
rtk npm test -- src/pages/HomePage.test.tsx
rtk npm test
rtk npm run lint
rtk npm run build
```

Expected:

- `HomePage.test.tsx`: PASS with 5 tests.
- Full Vitest suite: PASS.
- ESLint: exits 0.
- TypeScript and Vite build: exits 0.

- [ ] **Step 5: Commit home-page ordering**

```bash
rtk git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx
rtk git commit -m "feat: sort boards by recent edits"
```

## Manual Verification

Run:

```bash
rtk npm run dev
```

Verify:

1. Create a board and add at least two shapes.
2. Return to the boards home page.
3. Reload the browser. The home page remains visible.
4. Open the board. Both shapes are restored.
5. Move or resize a shape, return home, and confirm that board appears first.
6. Reload and reopen the board again; the latest shape position or size remains.
