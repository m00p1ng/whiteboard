# Shape Context Menu (Z-Order) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-click context menu on canvas shapes offering Bring to Front, Bring Forward, Send Backward, and Send to Back, all undoable.

**Architecture:** Z-order is the insertion order of `shapes: Record<string, Shape>`. A new `createReorderCommand` rebuilds that record in a new key order and is pushed onto the existing undo/redo stack. `Canvas.tsx` listens for `onContextMenu` on shapes, selects the shape, and shows a new `ShapeContextMenu` overlay that calls new store actions (`bringToFront`, `sendToBack`, `bringForward`, `sendBackward`).

**Tech Stack:** React, TypeScript, Zustand, react-konva, Vitest, Testing Library, Tailwind CSS.

Spec: `docs/superpowers/specs/2026-06-15-shape-context-menu-design.md`

---

### Task 1: Reorder command

**Files:**
- Modify: `src/utils/commands.ts`
- Test: `src/utils/commands.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/utils/commands.test.ts`:

```ts
import { createReorderCommand } from './commands';
```

(add to the existing import line from `./commands`, alongside `createAddShapeCommand`)

Add a new test inside the `describe('commands', ...)` block:

```ts
  it('creates a reorder command that reorders and restores shape order', () => {
    const r1: RectShape = { id: 'r1', type: 'rect', x: 0, y: 0, width: 10, height: 10 };
    const r2: RectShape = { id: 'r2', type: 'rect', x: 0, y: 0, width: 10, height: 10 };
    const r3: RectShape = { id: 'r3', type: 'rect', x: 0, y: 0, width: 10, height: 10 };
    const state = { shapes: { r1, r2, r3 } };
    const cmd = createReorderCommand(['r1', 'r2', 'r3'], ['r2', 'r3', 'r1']);

    cmd.do(state);
    expect(Object.keys(state.shapes)).toEqual(['r2', 'r3', 'r1']);

    cmd.undo(state);
    expect(Object.keys(state.shapes)).toEqual(['r1', 'r2', 'r3']);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/commands.test.ts`
Expected: FAIL — `createReorderCommand` is not exported from `./commands`.

- [ ] **Step 3: Implement `createReorderCommand`**

Append to `src/utils/commands.ts`:

```ts
export function createReorderCommand(
  prevOrder: string[],
  nextOrder: string[]
): Command {
  return {
    do: (state) => {
      state.shapes = reorderShapes(state.shapes, nextOrder);
    },
    undo: (state) => {
      state.shapes = reorderShapes(state.shapes, prevOrder);
    },
  };
}

function reorderShapes(
  shapes: Record<string, Shape>,
  order: string[]
): Record<string, Shape> {
  const next: Record<string, Shape> = {};
  for (const id of order) {
    if (shapes[id]) next[id] = shapes[id];
  }
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/commands.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Commit**

```bash
git add src/utils/commands.ts src/utils/commands.test.ts
git commit -m "feat: add reorder command for shape z-order"
```

---

### Task 2: Store z-order actions

**Files:**
- Modify: `src/store/editorStore.ts`
- Test: `src/store/editorStore.test.ts`

This task first refactors `execute`/`undo`/`redo` so a command can replace the
whole `shapes` map (required by `createReorderCommand`, which reassigns
`state.shapes` rather than mutating it in place), then adds the four z-order
actions.

- [ ] **Step 1: Refactor `execute`/`undo`/`redo` to read back `state.shapes`**

In `src/store/editorStore.ts`, update the imports at the top:

```ts
import { create } from 'zustand';
import type { Shape } from '@/types/shape';
import type { Command, CommandState } from '@/utils/commands';
import { createReorderCommand } from '@/utils/commands';
```

Replace the `execute`, `undo`, and `redo` implementations with:

```ts
  execute: (command) =>
    set((state) => {
      const cmdState: CommandState = { shapes: { ...state.shapes } };
      command.do(cmdState);
      return {
        shapes: cmdState.shapes,
        undoStack: [...state.undoStack, command],
        redoStack: [],
      };
    }),
  undo: () =>
    set((state) => {
      const command = state.undoStack.at(-1);
      if (!command) return state;
      const cmdState: CommandState = { shapes: { ...state.shapes } };
      command.undo(cmdState);
      return {
        shapes: cmdState.shapes,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, command],
      };
    }),
  redo: () =>
    set((state) => {
      const command = state.redoStack.at(-1);
      if (!command) return state;
      const cmdState: CommandState = { shapes: { ...state.shapes } };
      command.do(cmdState);
      return {
        shapes: cmdState.shapes,
        undoStack: [...state.undoStack, command],
        redoStack: state.redoStack.slice(0, -1),
      };
    }),
```

- [ ] **Step 2: Run existing tests to verify the refactor is a no-op**

Run: `npm run test -- src/store/editorStore.test.ts src/utils/commands.test.ts`
Expected: PASS (same results as before the refactor)

- [ ] **Step 3: Write failing tests for z-order actions**

Add to `src/store/editorStore.test.ts`, as a new `describe` block alongside
the existing one:

```ts
describe('editorStore z-order actions', () => {
  const shapeA = { id: 'a', type: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
  const shapeB = { id: 'b', type: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
  const shapeC = { id: 'c', type: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };

  beforeEach(() => {
    useEditorStore.setState({
      shapes: {},
      tool: 'select',
      selectedId: null,
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      undoStack: [],
      redoStack: [],
    });
    useEditorStore.getState().addShape(shapeA);
    useEditorStore.getState().addShape(shapeB);
    useEditorStore.getState().addShape(shapeC);
  });

  it('brings a shape to front', () => {
    useEditorStore.getState().bringToFront('a');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['b', 'c', 'a']);
  });

  it('sends a shape to back', () => {
    useEditorStore.getState().sendToBack('c');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['c', 'a', 'b']);
  });

  it('brings a shape forward one step', () => {
    useEditorStore.getState().bringForward('a');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['b', 'a', 'c']);
  });

  it('sends a shape backward one step', () => {
    useEditorStore.getState().sendBackward('c');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['a', 'c', 'b']);
  });

  it('does nothing when bringing the front shape forward', () => {
    useEditorStore.getState().bringForward('c');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['a', 'b', 'c']);
    expect(useEditorStore.getState().undoStack).toHaveLength(3);
  });

  it('does nothing when sending the back shape backward', () => {
    useEditorStore.getState().sendBackward('a');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['a', 'b', 'c']);
    expect(useEditorStore.getState().undoStack).toHaveLength(3);
  });

  it('undoes a reorder', () => {
    useEditorStore.getState().bringToFront('a');
    useEditorStore.getState().undo();
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test -- src/store/editorStore.test.ts`
Expected: FAIL — `bringToFront`/`sendToBack`/`bringForward`/`sendBackward` are
not functions on the store.

- [ ] **Step 5: Implement the z-order actions**

In `src/store/editorStore.ts`, add to the `EditorState` interface (after
`setShapes: (shapes: Record<string, Shape>) => void;`):

```ts
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
```

Add to the store implementation (after the `setShapes` action, before
`reset`):

```ts
  bringToFront: (id) => {
    const order = Object.keys(get().shapes);
    const idx = order.indexOf(id);
    if (idx === -1 || idx === order.length - 1) return;
    const nextOrder = [...order.slice(0, idx), ...order.slice(idx + 1), id];
    get().execute(createReorderCommand(order, nextOrder));
  },
  sendToBack: (id) => {
    const order = Object.keys(get().shapes);
    const idx = order.indexOf(id);
    if (idx <= 0) return;
    const nextOrder = [id, ...order.slice(0, idx), ...order.slice(idx + 1)];
    get().execute(createReorderCommand(order, nextOrder));
  },
  bringForward: (id) => {
    const order = Object.keys(get().shapes);
    const idx = order.indexOf(id);
    if (idx === -1 || idx === order.length - 1) return;
    const nextOrder = [...order];
    [nextOrder[idx], nextOrder[idx + 1]] = [nextOrder[idx + 1], nextOrder[idx]];
    get().execute(createReorderCommand(order, nextOrder));
  },
  sendBackward: (id) => {
    const order = Object.keys(get().shapes);
    const idx = order.indexOf(id);
    if (idx <= 0) return;
    const nextOrder = [...order];
    [nextOrder[idx], nextOrder[idx - 1]] = [nextOrder[idx - 1], nextOrder[idx]];
    get().execute(createReorderCommand(order, nextOrder));
  },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- src/store/editorStore.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 7: Commit**

```bash
git add src/store/editorStore.ts src/store/editorStore.test.ts
git commit -m "feat: add z-order actions to editor store"
```

---

### Task 3: ShapeRenderer forwards onContextMenu

**Files:**
- Modify: `src/components/ShapeRenderer.tsx`
- Test: `src/components/ShapeRenderer.test.tsx`

- [ ] **Step 1: Write the failing test**

In `src/components/ShapeRenderer.test.tsx`, update the `Ellipse` mock to
destructure and forward `onContextMenu`:

```ts
  Ellipse: ({
    radiusX,
    radiusY,
    onTransformEnd,
    onContextMenu,
  }: {
    radiusX: number;
    radiusY: number;
    onTransformEnd: (event: { target: unknown }) => void;
    onContextMenu?: (event: { evt: Event }) => void;
  }) => (
    <button
      type="button"
      aria-label="ellipse"
      data-radius-x={radiusX}
      data-radius-y={radiusY}
      onContextMenu={(e) => onContextMenu?.({ evt: e.nativeEvent })}
      onClick={() => {
```

(keep the rest of the existing `onClick` body unchanged)

Add a new test in `describe('ShapeRenderer ellipse', ...)`:

```ts
  it('forwards onContextMenu to the underlying shape', () => {
    const onContextMenu = vi.fn();
    render(
      <ShapeRenderer
        shape={ellipse}
        isSelected={false}
        onSelect={() => undefined}
        onContextMenu={onContextMenu}
      />
    );

    fireEvent.contextMenu(screen.getByRole('button', { name: 'ellipse' }));

    expect(onContextMenu).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/ShapeRenderer.test.tsx`
Expected: FAIL — type error / `onContextMenu` prop does not exist on
`ShapeRenderer`, or the handler is never called.

- [ ] **Step 3: Add the prop to ShapeRenderer**

In `src/components/ShapeRenderer.tsx`, update the props interface:

```ts
interface ShapeRendererProps {
  shape: Shape;
  isSelected: boolean;
  draggable?: boolean;
  onSelect: () => void;
  onDblClick?: () => void;
  onChange?: (updates: Partial<Shape>) => void;
  onContextMenu?: (e: KonvaEventObject<PointerEvent>) => void;
}
```

Update the function signature and `common` object:

```ts
export function ShapeRenderer({ shape, isSelected, draggable = true, onSelect, onDblClick, onChange, onContextMenu }: ShapeRendererProps) {
```

```ts
  const common = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation ?? 0,
    fill: shape.fill,
    stroke: isSelected ? '#3b82f6' : shape.stroke ?? '#000',
    strokeWidth: shape.strokeWidth ?? 2,
    draggable,
    onClick: onSelect,
    onTap: onSelect,
    onDblClick: onDblClick,
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd,
    onContextMenu,
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/ShapeRenderer.test.tsx`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Commit**

```bash
git add src/components/ShapeRenderer.tsx src/components/ShapeRenderer.test.tsx
git commit -m "feat: forward onContextMenu from ShapeRenderer"
```

---

### Task 4: ShapeContextMenu component

**Files:**
- Create: `src/components/ShapeContextMenu.tsx`
- Test: `src/components/ShapeContextMenu.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ShapeContextMenu.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShapeContextMenu } from './ShapeContextMenu';

describe('ShapeContextMenu', () => {
  it('renders at the given position and calls handlers on click', () => {
    const onBringToFront = vi.fn();
    const onBringForward = vi.fn();
    const onSendBackward = vi.fn();
    const onSendToBack = vi.fn();

    render(
      <ShapeContextMenu
        x={10}
        y={20}
        canBringForward
        canSendBackward
        onBringToFront={onBringToFront}
        onBringForward={onBringForward}
        onSendBackward={onSendBackward}
        onSendToBack={onSendToBack}
      />
    );

    const menu = screen.getByRole('menu');
    expect(menu).toHaveStyle({ left: '10px', top: '20px' });

    fireEvent.click(screen.getByText('Bring to Front'));
    expect(onBringToFront).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Bring Forward'));
    expect(onBringForward).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Send Backward'));
    expect(onSendBackward).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Send to Back'));
    expect(onSendToBack).toHaveBeenCalled();
  });

  it('disables Bring Forward / Send Backward at the edges', () => {
    const onBringForward = vi.fn();
    const onSendBackward = vi.fn();

    render(
      <ShapeContextMenu
        x={0}
        y={0}
        canBringForward={false}
        canSendBackward={false}
        onBringToFront={() => undefined}
        onBringForward={onBringForward}
        onSendBackward={onSendBackward}
        onSendToBack={() => undefined}
      />
    );

    fireEvent.click(screen.getByText('Bring Forward'));
    fireEvent.click(screen.getByText('Send Backward'));

    expect(onBringForward).not.toHaveBeenCalled();
    expect(onSendBackward).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/ShapeContextMenu.test.tsx`
Expected: FAIL — `./ShapeContextMenu` does not exist.

- [ ] **Step 3: Implement ShapeContextMenu**

Create `src/components/ShapeContextMenu.tsx`:

```tsx
interface ShapeContextMenuProps {
  x: number;
  y: number;
  canBringForward: boolean;
  canSendBackward: boolean;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
}

const itemClass =
  'block w-full text-left px-3 py-1.5 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent';

export function ShapeContextMenu({
  x,
  y,
  canBringForward,
  canSendBackward,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
}: ShapeContextMenuProps) {
  return (
    <div
      role="menu"
      className="absolute z-50 min-w-[160px] rounded border border-gray-200 bg-white py-1 text-sm shadow-md"
      style={{ left: x, top: y }}
    >
      <button type="button" className={itemClass} onClick={onBringToFront}>
        Bring to Front
      </button>
      <button
        type="button"
        className={itemClass}
        onClick={onBringForward}
        disabled={!canBringForward}
      >
        Bring Forward
      </button>
      <button
        type="button"
        className={itemClass}
        onClick={onSendBackward}
        disabled={!canSendBackward}
      >
        Send Backward
      </button>
      <button type="button" className={itemClass} onClick={onSendToBack}>
        Send to Back
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/ShapeContextMenu.test.tsx`
Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ShapeContextMenu.tsx src/components/ShapeContextMenu.test.tsx
git commit -m "feat: add ShapeContextMenu component"
```

---

### Task 5: Wire context menu into Canvas

**Files:**
- Modify: `src/components/Canvas.tsx`
- Test: `src/components/Canvas.test.tsx`

- [ ] **Step 1: Update the Canvas test mocks**

In `src/components/Canvas.test.tsx`, replace the `ShapeRenderer` mock with one
that also exposes a context-menu trigger and forwards `onContextMenu`:

```tsx
vi.mock('./ShapeRenderer', () => ({
  ShapeRenderer: ({
    shape,
    onSelect,
    onContextMenu,
  }: {
    shape: { id: string };
    onSelect: () => void;
    onContextMenu?: (e: {
      evt: { preventDefault: () => void; clientX: number; clientY: number };
    }) => void;
  }) => (
    <div>
      <button
        type="button"
        data-testid={`shape-${shape.id}`}
        onClick={onSelect}
      />
      <button
        type="button"
        aria-label={`context-menu-${shape.id}`}
        onClick={() =>
          onContextMenu?.({
            evt: { preventDefault: vi.fn(), clientX: 50, clientY: 60 },
          })
        }
      />
    </div>
  ),
}));
```

Also mock the new component, alongside the existing `vi.mock('./TextEditor', ...)`
and `vi.mock('./CreationPreview', ...)`:

```tsx
vi.mock('./ShapeContextMenu', () => ({
  ShapeContextMenu: ({
    canBringForward,
    canSendBackward,
    onBringToFront,
    onBringForward,
    onSendBackward,
    onSendToBack,
  }: {
    canBringForward: boolean;
    canSendBackward: boolean;
    onBringToFront: () => void;
    onBringForward: () => void;
    onSendBackward: () => void;
    onSendToBack: () => void;
  }) => (
    <div role="menu">
      <button type="button" onClick={onBringToFront}>
        Bring to Front
      </button>
      <button type="button" disabled={!canBringForward} onClick={onBringForward}>
        Bring Forward
      </button>
      <button type="button" disabled={!canSendBackward} onClick={onSendBackward}>
        Send Backward
      </button>
      <button type="button" onClick={onSendToBack}>
        Send to Back
      </button>
    </div>
  ),
}));
```

- [ ] **Step 2: Write the failing tests**

Add a new `describe` block to `src/components/Canvas.test.tsx`:

```tsx
describe('Canvas shape context menu', () => {
  it('opens the menu and selects the shape on right-click', () => {
    render(<Canvas />);

    fireEvent.click(screen.getByRole('button', { name: 'context-menu-existing' }));

    expect(useEditorStore.getState().selectedId).toBe('existing');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('brings the shape to front and closes the menu', () => {
    useEditorStore.setState({
      shapes: {
        existing: existingShape,
        other: { ...existingShape, id: 'other' },
      },
    });
    render(<Canvas />);

    fireEvent.click(screen.getByRole('button', { name: 'context-menu-existing' }));
    fireEvent.click(screen.getByText('Bring to Front'));

    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['other', 'existing']);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu on Escape', () => {
    render(<Canvas />);

    fireEvent.click(screen.getByRole('button', { name: 'context-menu-existing' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu on stage pointer down', () => {
    render(<Canvas />);

    fireEvent.click(screen.getByRole('button', { name: 'context-menu-existing' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'pointer down' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- src/components/Canvas.test.tsx`
Expected: FAIL — `context-menu-existing` button not found / no `menu` role
rendered (Canvas doesn't wire `onContextMenu` or render `ShapeContextMenu`
yet).

- [ ] **Step 4: Implement the wiring in Canvas.tsx**

In `src/components/Canvas.tsx`:

1. Add the import for the new component, near the other component imports:

```ts
import { ShapeContextMenu } from './ShapeContextMenu';
```

2. Add new state, alongside the other `useState` declarations:

```ts
  const [contextMenu, setContextMenu] = useState<{
    shapeId: string;
    x: number;
    y: number;
  } | null>(null);
```

3. Read the new store actions, alongside the other `useEditorStore` selectors:

```ts
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);
  const bringForward = useEditorStore((s) => s.bringForward);
  const sendBackward = useEditorStore((s) => s.sendBackward);
```

4. In the keydown handler inside the existing `useEffect`, close the menu on
   Escape (alongside the existing `Escape` branch):

```ts
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(true);
      if (e.key === 'Escape') {
        setShapeDraft(null);
        draftToolRef.current = null;
        clearConnectorDraft();
        setContextMenu(null);
      }
    };
```

5. At the top of `handlePointerDown`, close the menu on any stage pointer
   down:

```ts
  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    if (contextMenu) setContextMenu(null);

    const stage = e.target.getStage();
```

6. Add the context menu handler, near `handleShapeClick`:

```ts
  const handleShapeContextMenu = (
    shapeId: string,
    e: KonvaEventObject<PointerEvent>
  ) => {
    e.evt.preventDefault();
    setSelectedId(shapeId);
    setContextMenu({ shapeId, x: e.evt.clientX, y: e.evt.clientY });
  };
```

7. Compute the forward/backward availability, near `connectorPoints`:

```ts
  const contextMenuIndex = contextMenu
    ? Object.keys(shapes).indexOf(contextMenu.shapeId)
    : -1;
  const contextMenuShapeCount = Object.keys(shapes).length;
  const canBringForward =
    contextMenuIndex !== -1 && contextMenuIndex < contextMenuShapeCount - 1;
  const canSendBackward = contextMenuIndex > 0;
```

8. Wire `onContextMenu` into the `ShapeRenderer` in the render:

```tsx
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              isSelected={shape.id === selectedId || shape.id === connectorSource}
              draggable={tool === 'select' && !spacePressed}
              onSelect={() => handleShapeClick(shape.id)}
              onDblClick={() => handleShapeDblClick(shape.id)}
              onChange={(updates) => updateShape(shape.id, updates)}
              onContextMenu={(e) => handleShapeContextMenu(shape.id, e)}
            />
```

9. Render the menu as a sibling overlay, after the `TextEditor` block:

```tsx
      {editingTextId && shapes[editingTextId]?.type === 'text' && (
        <TextEditor
          shape={shapes[editingTextId] as TextShape}
          viewport={viewport}
          onClose={() => setEditingTextId(null)}
        />
      )}
      {contextMenu && (
        <ShapeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          canBringForward={canBringForward}
          canSendBackward={canSendBackward}
          onBringToFront={() => {
            bringToFront(contextMenu.shapeId);
            setContextMenu(null);
          }}
          onBringForward={() => {
            bringForward(contextMenu.shapeId);
            setContextMenu(null);
          }}
          onSendBackward={() => {
            sendBackward(contextMenu.shapeId);
            setContextMenu(null);
          }}
          onSendToBack={() => {
            sendToBack(contextMenu.shapeId);
            setContextMenu(null);
          }}
        />
      )}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- src/components/Canvas.test.tsx`
Expected: PASS (all tests in the file)

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: PASS (all tests across the project)

- [ ] **Step 7: Commit**

```bash
git add src/components/Canvas.tsx src/components/Canvas.test.tsx
git commit -m "feat: add right-click context menu for shape z-order"
```
