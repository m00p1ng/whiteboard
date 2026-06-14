# Shape Creation and Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an empty-board click deselect before creating, then select each newly created shape, show resize handles where supported, and return to the Select tool.

**Architecture:** Keep interaction orchestration in `Canvas`, where board clicks already coordinate the active tool, selection, and shape creation. Add component-level tests with a lightweight mocked Konva stage so the tests exercise the real Zustand store and real `SelectionTransformer` decision logic without depending on canvas rendering.

**Tech Stack:** React 19, TypeScript 6, Zustand 5, React-Konva/Konva, Vitest 4, Testing Library.

---

## File Structure

```text
src/components/
├── Canvas.tsx       # Apply deselect-first precedence and post-creation selection/tool transitions
└── Canvas.test.tsx  # Exercise background clicks through a mocked Konva stage
```

The existing local changes to `src/App.css` and `src/store/editorStore.test.ts`
are unrelated. Do not edit, stage, revert, or include them in commits from this
plan.

### Task 1: Deselect Before Creating and Select New Resizable Shapes

**Files:**
- Create: `src/components/Canvas.test.tsx`
- Modify: `src/components/Canvas.tsx:17-73`

- [ ] **Step 1: Write the failing component tests**

Create `src/components/Canvas.test.tsx`:

```tsx
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Canvas } from './Canvas';
import { useEditorStore } from '@/store/editorStore';
import type { RectShape } from '@/types/shape';

const konvaMock = vi.hoisted(() => ({
  pointer: { x: 120, y: 80 },
}));

vi.mock('react-konva', () => ({
  Stage: ({
    children,
    onClick,
  }: PropsWithChildren<{
    onClick: (event: { target: unknown }) => void;
  }>) => (
    <button
      type="button"
      aria-label="board canvas"
      onClick={() => {
        const stage = {
          getStage: () => stage,
          getPointerPosition: () => konvaMock.pointer,
        };
        onClick({ target: stage });
      }}
    >
      {children}
    </button>
  ),
  Layer: ({ children }: PropsWithChildren) => <>{children}</>,
  Transformer: () => <div data-testid="selection-transformer" />,
}));

vi.mock('./ShapeRenderer', () => ({
  ShapeRenderer: ({ shape }: { shape: { id: string } }) => (
    <div data-testid={`shape-${shape.id}`} />
  ),
}));

vi.mock('./TextEditor', () => ({
  TextEditor: () => null,
}));

const existingShape: RectShape = {
  id: 'existing',
  type: 'rect',
  x: 10,
  y: 20,
  width: 100,
  height: 60,
  fill: '#fff',
};

beforeEach(() => {
  useEditorStore.getState().reset();
  useEditorStore.setState({
    shapes: { [existingShape.id]: existingShape },
    selectedId: existingShape.id,
  });
  konvaMock.pointer = { x: 120, y: 80 };
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(
    '00000000-0000-4000-8000-000000000001'
  );
});

describe('Canvas shape creation selection', () => {
  it.each([
    ['rect', 'rect'],
    ['circle', 'circle'],
    ['text', 'text'],
  ] as const)(
    'deselects before creating a %s, then selects it and returns to Select',
    (tool, expectedType) => {
      useEditorStore.getState().setTool(tool);
      render(<Canvas />);

      fireEvent.click(screen.getByRole('button', { name: 'board canvas' }));

      expect(useEditorStore.getState().selectedId).toBeNull();
      expect(useEditorStore.getState().tool).toBe(tool);
      expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['existing']);

      fireEvent.click(screen.getByRole('button', { name: 'board canvas' }));

      const state = useEditorStore.getState();
      expect(state.shapes['00000000-0000-4000-8000-000000000001']).toMatchObject({
        type: expectedType,
        x: 120,
        y: 80,
      });
      expect(state.selectedId).toBe('00000000-0000-4000-8000-000000000001');
      expect(state.tool).toBe('select');
      expect(screen.getByTestId('selection-transformer')).toBeInTheDocument();
    }
  );

  it('leaves connector selection behavior unchanged on an empty-board click', () => {
    useEditorStore.getState().setTool('connector');
    render(<Canvas />);

    fireEvent.click(screen.getByRole('button', { name: 'board canvas' }));

    expect(useEditorStore.getState().selectedId).toBe('existing');
    expect(useEditorStore.getState().tool).toBe('connector');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['existing']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
rtk npm test -- src/components/Canvas.test.tsx
```

Expected: FAIL because the second click creates the shape but leaves
`selectedId` null, leaves the creation tool active, and does not render the
selection transformer.

- [ ] **Step 3: Implement the minimal one-click-shape behavior**

In `src/components/Canvas.tsx`, select `setTool` from the store:

```ts
const tool = useEditorStore((s) => s.tool);
const setTool = useEditorStore((s) => s.setTool);
const setViewport = useEditorStore((s) => s.setViewport);
```

Add deselect-first precedence after the existing Select-tool branch. Limit the
guard to the four creation tools so connector source/target behavior is
unchanged:

```ts
if (tool === 'select') {
  setSelectedId(null);
  return;
}
if (
  selectedId &&
  (tool === 'rect' || tool === 'circle' || tool === 'text' || tool === 'line')
) {
  setSelectedId(null);
  return;
}
```

Replace the rectangle, circle, and text branches with:

```ts
if (tool === 'rect') {
  addShape({
    id,
    type: 'rect',
    x: pos.x,
    y: pos.y,
    width: 100,
    height: 60,
    fill: '#fff',
  });
  setSelectedId(id);
  setTool('select');
} else if (tool === 'circle') {
  addShape({
    id,
    type: 'circle',
    x: pos.x,
    y: pos.y,
    radius: 40,
    fill: '#fff',
  });
  setSelectedId(id);
  setTool('select');
} else if (tool === 'text') {
  addShape({
    id,
    type: 'text',
    x: pos.x,
    y: pos.y,
    text: 'Text',
    fontSize: 18,
  });
  setSelectedId(id);
  setTool('select');
}
```

Leave the connector and line branches unchanged in this task.

- [ ] **Step 4: Run the focused test**

Run:

```bash
rtk npm test -- src/components/Canvas.test.tsx
```

Expected: PASS with 4 tests.

- [ ] **Step 5: Commit the resizable-shape behavior**

```bash
rtk git add src/components/Canvas.tsx src/components/Canvas.test.tsx
rtk git commit -m "feat: select newly created shapes"
```

### Task 2: Select a Line Only When Its Second Click Completes It

**Files:**
- Modify: `src/components/Canvas.test.tsx`
- Modify: `src/components/Canvas.tsx:59-75`

- [ ] **Step 1: Write the failing line-completion test**

Append this test inside the existing `describe` block in
`src/components/Canvas.test.tsx`:

```tsx
it('selects a line and returns to Select only after the second creation click', () => {
  useEditorStore.getState().setTool('line');
  render(<Canvas />);
  const canvas = screen.getByRole('button', { name: 'board canvas' });

  fireEvent.click(canvas);

  expect(useEditorStore.getState().selectedId).toBeNull();
  expect(useEditorStore.getState().tool).toBe('line');
  expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['existing']);

  konvaMock.pointer = { x: 30, y: 40 };
  fireEvent.click(canvas);

  expect(useEditorStore.getState().tool).toBe('line');
  expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['existing']);

  konvaMock.pointer = { x: 90, y: 110 };
  fireEvent.click(canvas);

  const state = useEditorStore.getState();
  expect(state.shapes['00000000-0000-4000-8000-000000000001']).toMatchObject({
    type: 'line',
    points: [30, 40, 90, 110],
  });
  expect(state.selectedId).toBe('00000000-0000-4000-8000-000000000001');
  expect(state.tool).toBe('select');
  expect(screen.queryByTestId('selection-transformer')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the line test to verify it fails**

Run:

```bash
rtk npm test -- src/components/Canvas.test.tsx -t "selects a line"
```

Expected: FAIL because completing a line currently clears `lineStart` but does
not select the line or switch to Select.

- [ ] **Step 3: Implement the minimal line-completion transition**

Replace the completed-line branch in `src/components/Canvas.tsx` with:

```ts
} else if (tool === 'line') {
  if (!lineStart) {
    setLineStart({ x: pos.x, y: pos.y });
  } else {
    addShape({
      id,
      type: 'line',
      x: 0,
      y: 0,
      points: [lineStart.x, lineStart.y, pos.x, pos.y],
    });
    setLineStart(null);
    setSelectedId(id);
    setTool('select');
  }
}
```

Using the existing `id` variable ensures the added line and selected line have
the same identifier. `SelectionTransformer` already excludes lines, so no
transformer change is required.

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
rtk npm test -- src/components/Canvas.test.tsx
rtk npm test
rtk npm run lint
rtk npm run build
```

Expected:

- `Canvas.test.tsx`: PASS with 5 tests.
- Full Vitest suite: PASS.
- ESLint: exits 0.
- TypeScript and Vite build: exits 0.

- [ ] **Step 5: Commit the line behavior**

```bash
rtk git add src/components/Canvas.tsx src/components/Canvas.test.tsx
rtk git commit -m "feat: select completed lines"
```

## Manual Verification

Run the app:

```bash
rtk npm run dev
```

Open a board and verify:

1. Select an existing shape, activate Rectangle, and click empty space. The
   shape deselects and no rectangle is added.
2. Click empty space again. A rectangle is added, selected, shows resize
   handles, and Select becomes active.
3. Repeat with Circle and Text.
4. Select an existing shape, activate Line, and click empty space once to
   deselect it. Click twice more to define a line. The completed line is
   selected, Select becomes active, and no resize handles appear.
5. Create a connector between two shapes and confirm its existing workflow is
   unchanged.
