# Node/Edge Context Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-click context menu on flowchart nodes and edges with ordering (Bring to Front, Bring Forward, Send Backward, Send to Back), Duplicate for nodes, and Delete for both, all undoable.

**Architecture:** Z-order is the insertion order of `nodes: Record<string, FlowchartNode>`. A new `createReorderNodesCommand` rebuilds that record in a new key order by mutating the map in place and is pushed onto the existing undo/redo stack. `FlowchartCanvas.tsx` listens for `onContextMenu` on nodes/edges, selects the target, and shows a new `CanvasContextMenu` HTML overlay that calls new store actions (`bringNodeToFront`, `sendNodeToBack`, `bringNodeForward`, `sendNodeBackward`, `duplicateNode`, `removeNode`, `removeEdge`).

**Tech Stack:** React, TypeScript, Zustand, react-konva, Konva, Vitest, Testing Library, Tailwind CSS, Lucide React.

Spec: `docs/superpowers/specs/2026-06-16-node-edge-context-menu-design.md`

---

### Task 1: Reorder nodes command

**Files:**
- Modify: `src/utils/flowchartCommands.ts`
- Test: `src/utils/flowchartCommands.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the existing import in `src/utils/flowchartCommands.test.ts`:

```ts
import {
  createAddNodeCommand,
  createRemoveNodeCommand,
  createMoveNodeCommand,
  createAddEdgeCommand,
  createUpdateEdgeCommand,
  createReorderNodesCommand,
} from './flowchartCommands';
```

Add a new test inside `describe('flowchartCommands', ...)`:

```ts
  it('reorders nodes and restores the original order', () => {
    const n1: FlowchartNode = {
      id: 'n1',
      type: 'process',
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      style: {},
    };
    const n2: FlowchartNode = { ...n1, id: 'n2' };
    const n3: FlowchartNode = { ...n1, id: 'n3' };
    const state: FlowchartGraph = {
      nodes: { n1, n2, n3 },
      edges: {},
    };
    const cmd = createReorderNodesCommand(['n1', 'n2', 'n3'], ['n3', 'n1', 'n2']);

    cmd.do(state);
    expect(Object.keys(state.nodes)).toEqual(['n3', 'n1', 'n2']);

    cmd.undo(state);
    expect(Object.keys(state.nodes)).toEqual(['n1', 'n2', 'n3']);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/flowchartCommands.test.ts`
Expected: FAIL — `createReorderNodesCommand` is not exported from `./flowchartCommands`.

- [ ] **Step 3: Implement `createReorderNodesCommand`**

Append to `src/utils/flowchartCommands.ts`:

```ts
export function createReorderNodesCommand(
  prevOrder: string[],
  nextOrder: string[]
): Command {
  return {
    do: (state) => {
      reorderNodes(state.nodes, nextOrder);
    },
    undo: (state) => {
      reorderNodes(state.nodes, prevOrder);
    },
  };
}

function reorderNodes(
  nodes: Record<string, FlowchartNode>,
  order: string[]
): void {
  const entries = order.map((id) => [id, nodes[id]] as const);
  for (const id of Object.keys(nodes)) {
    delete nodes[id];
  }
  for (const [id, node] of entries) {
    if (node) nodes[id] = node;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/flowchartCommands.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Commit**

```bash
git add src/utils/flowchartCommands.ts src/utils/flowchartCommands.test.ts
git commit -m "feat: add reorder nodes command"
```

---

### Task 2: Store ordering and duplicate actions

**Files:**
- Modify: `src/store/flowchartStore.ts`
- Test: `src/store/flowchartStore.test.ts`

- [ ] **Step 1: Write failing tests**

Add new tests at the end of `describe('flowchartStore', ...)` in `src/store/flowchartStore.test.ts`:

```ts
  it('brings a node to front and sends it to back', () => {
    useFlowchartStore.setState({
      nodes: { a: nodeA, b: nodeB, c: nodeC },
      edges: {},
      undoStack: [],
      redoStack: [],
    });

    useFlowchartStore.getState().bringNodeToFront('a');
    expect(Object.keys(useFlowchartStore.getState().nodes)).toEqual([
      'b',
      'c',
      'a',
    ]);

    useFlowchartStore.getState().sendNodeToBack('a');
    expect(Object.keys(useFlowchartStore.getState().nodes)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('brings a node forward and sends it backward', () => {
    useFlowchartStore.setState({
      nodes: { a: nodeA, b: nodeB, c: nodeC },
      edges: {},
      undoStack: [],
      redoStack: [],
    });

    useFlowchartStore.getState().bringNodeForward('a');
    expect(Object.keys(useFlowchartStore.getState().nodes)).toEqual([
      'b',
      'a',
      'c',
    ]);

    useFlowchartStore.getState().sendNodeBackward('c');
    expect(Object.keys(useFlowchartStore.getState().nodes)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('does not push boundary ordering actions to undo stack', () => {
    useFlowchartStore.setState({
      nodes: { a: nodeA, b: nodeB },
      edges: {},
      undoStack: [],
      redoStack: [],
    });

    useFlowchartStore.getState().bringNodeForward('b');
    useFlowchartStore.getState().sendNodeBackward('a');
    expect(useFlowchartStore.getState().undoStack).toHaveLength(0);
  });

  it('duplicates a node with an offset and selects it', () => {
    useFlowchartStore.setState({
      nodes: { a: { ...nodeA, style: { fill: '#fff' } } },
      edges: {},
      undoStack: [],
      redoStack: [],
    });

    useFlowchartStore.getState().duplicateNode('a');
    const state = useFlowchartStore.getState();
    const copy = Object.values(state.nodes).find((n) => n.id !== 'a');
    expect(copy).toBeDefined();
    expect(copy?.type).toBe(nodeA.type);
    expect(copy?.id).not.toBe('a');
    expect(copy?.x).toBe(nodeA.x + 20);
    expect(copy?.y).toBe(nodeA.y + 20);
    expect(copy?.style).toEqual({ fill: '#fff' });
    expect(state.selection).toEqual({ type: 'node', id: copy!.id });
    expect(state.tool).toBe('select');
  });

  it('undoes duplicate', () => {
    useFlowchartStore.setState({
      nodes: { a: nodeA },
      edges: {},
      undoStack: [],
      redoStack: [],
    });

    useFlowchartStore.getState().duplicateNode('a');
    const copyId = useFlowchartStore.getState().selection!.id;

    useFlowchartStore.getState().undo();
    expect(useFlowchartStore.getState().nodes[copyId]).toBeUndefined();
    expect(useFlowchartStore.getState().selection).toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/store/flowchartStore.test.ts`
Expected: FAIL — `bringNodeToFront`, `sendNodeToBack`, `bringNodeForward`, `sendNodeBackward`, and `duplicateNode` do not exist on the store.

- [ ] **Step 3: Import `createReorderNodesCommand` and add actions**

Update the import in `src/store/flowchartStore.ts`:

```ts
import {
  createAddEdgeCommand,
  createAddNodeCommand,
  createMoveNodeCommand,
  createRemoveEdgeCommand,
  createRemoveNodeCommand,
  createReorderNodesCommand,
  createUpdateEdgeCommand,
  createUpdateNodeCommand,
} from '@/utils/flowchartCommands';
```

Add to the `FlowchartActions` interface (after `removeEdge`):

```ts
  bringNodeToFront: (id: string) => void;
  sendNodeToBack: (id: string) => void;
  bringNodeForward: (id: string) => void;
  sendNodeBackward: (id: string) => void;
  duplicateNode: (id: string) => void;
```

Add the implementations inside `create<FlowchartState & FlowchartActions>` after `removeEdge`:

```ts
    bringNodeToFront: (id) => {
      const { nodes, execute } = get();
      const node = nodes[id];
      if (!node) return;
      const order = Object.keys(nodes);
      const idx = order.indexOf(id);
      if (idx === -1 || idx === order.length - 1) return;
      const nextOrder = [...order.slice(0, idx), ...order.slice(idx + 1), id];
      execute(createReorderNodesCommand(order, nextOrder));
    },

    sendNodeToBack: (id) => {
      const { nodes, execute } = get();
      const node = nodes[id];
      if (!node) return;
      const order = Object.keys(nodes);
      const idx = order.indexOf(id);
      if (idx <= 0) return;
      const nextOrder = [id, ...order.slice(0, idx), ...order.slice(idx + 1)];
      execute(createReorderNodesCommand(order, nextOrder));
    },

    bringNodeForward: (id) => {
      const { nodes, execute } = get();
      const node = nodes[id];
      if (!node) return;
      const order = Object.keys(nodes);
      const idx = order.indexOf(id);
      if (idx === -1 || idx === order.length - 1) return;
      const nextOrder = [...order];
      [nextOrder[idx], nextOrder[idx + 1]] = [nextOrder[idx + 1], nextOrder[idx]];
      execute(createReorderNodesCommand(order, nextOrder));
    },

    sendNodeBackward: (id) => {
      const { nodes, execute } = get();
      const node = nodes[id];
      if (!node) return;
      const order = Object.keys(nodes);
      const idx = order.indexOf(id);
      if (idx <= 0) return;
      const nextOrder = [...order];
      [nextOrder[idx], nextOrder[idx - 1]] = [nextOrder[idx - 1], nextOrder[idx]];
      execute(createReorderNodesCommand(order, nextOrder));
    },

    duplicateNode: (id) => {
      const { nodes, execute, setSelection } = get();
      const node = nodes[id];
      if (!node) return;
      const copy: FlowchartNode = {
        ...node,
        id: crypto.randomUUID(),
        x: node.x + 20,
        y: node.y + 20,
      };
      execute(createAddNodeCommand(copy));
      setSelection({ type: 'node', id: copy.id });
      set({ tool: 'select' });
    },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/store/flowchartStore.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Commit**

```bash
git add src/store/flowchartStore.ts src/store/flowchartStore.test.ts
git commit -m "feat: add node ordering and duplicate actions"
```

---

### Task 3: Add `onContextMenu` prop to renderers

**Files:**
- Modify: `src/components/flowchart/NodeRenderer.tsx`
- Modify: `src/components/flowchart/EdgeRenderer.tsx`
- Test: `src/components/flowchart/NodeRenderer.test.tsx` (create if missing)
- Test: `src/components/flowchart/EdgeRenderer.test.tsx` (create if missing)

- [ ] **Step 1: Update `NodeRenderer.tsx`**

Add `onContextMenu` to the interface and destructure it:

```ts
interface NodeRendererProps {
  node: FlowchartNode;
  isSelected?: boolean;
  interactive?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onMouseDown?: () => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  onDragStart?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
}
```

```ts
export function NodeRenderer({
  node,
  isSelected,
  interactive = true,
  draggable = interactive,
  onClick,
  onDoubleClick,
  onMouseDown,
  onContextMenu,
  onDragStart,
  onDragMove,
  onDragEnd,
}: NodeRendererProps) {
```

Add the event handler to the `<Group>`:

```ts
      onContextMenu={(event) => {
        event.cancelBubble = true;
        onContextMenu?.(event);
      }}
```

- [ ] **Step 2: Update `EdgeRenderer.tsx`**

Add `onContextMenu` to the interface and destructure it:

```ts
interface EdgeRendererProps {
  edge: FlowchartEdge;
  nodes: Record<string, FlowchartNode>;
  isSelected?: boolean;
  previewPoints?: number[];
  onClick?: () => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
}
```

```ts
export function EdgeRenderer({
  edge,
  nodes,
  isSelected,
  previewPoints,
  onClick,
  onContextMenu,
}: EdgeRendererProps) {
```

Add the event handler to the hit `<Line>` inside the `<Group>`:

```ts
      <Line
        data-testid="edge-hit-path"
        points={points}
        stroke="rgba(0,0,0,0.001)"
        strokeWidth={Math.max(strokeWidth + 12, 14)}
        hitStrokeWidth={Math.max(strokeWidth + 12, 14)}
        onClick={(event) => {
          event.cancelBubble = true;
          onClick?.();
        }}
        onTap={(event) => {
          event.cancelBubble = true;
          onClick?.();
        }}
        onContextMenu={(event) => {
          event.cancelBubble = true;
          onContextMenu?.(event);
        }}
      />
```

- [ ] **Step 3: Write/update renderer tests**

Create `src/components/flowchart/NodeRenderer.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { NodeRenderer } from './NodeRenderer';
import type { FlowchartNode } from '@/types/flowchart';

vi.mock('react-konva', () => ({
  Group: ({ children, onContextMenu }: { children: React.ReactNode; onContextMenu?: (e: unknown) => void }) => (
    <div data-testid="group" onContextMenu={(e) => onContextMenu?.({ evt: e.nativeEvent, cancelBubble: false } as unknown)}>{children}</div>
  ),
  Rect: () => <div data-testid="rect" />,
  Text: () => null,
  Path: () => null,
}));

describe('NodeRenderer', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    style: {},
  };

  it('forwards context menu events', () => {
    const handleContextMenu = vi.fn();
    const { getByTestId } = render(
      <NodeRenderer node={node} onContextMenu={handleContextMenu} />
    );

    const event = new MouseEvent('contextmenu', { bubbles: true });
    getByTestId('group').dispatchEvent(event);

    expect(handleContextMenu).toHaveBeenCalled();
  });
});
```

Create `src/components/flowchart/EdgeRenderer.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { EdgeRenderer } from './EdgeRenderer';
import type { FlowchartEdge, FlowchartNode } from '@/types/flowchart';

vi.mock('react-konva', () => ({
  Group: ({ children }: { children: React.ReactNode }) => <div data-testid="group">{children}</div>,
  Line: ({ onContextMenu }: { onContextMenu?: (e: unknown) => void }) => (
    <div data-testid="line" onContextMenu={(e) => onContextMenu?.({ evt: e.nativeEvent, cancelBubble: false } as unknown)} />
  ),
  Arrow: () => <div data-testid="arrow" />,
  Text: () => null,
}));

vi.mock('@/utils/orthogonalRouter', () => ({
  computeOrthogonalPath: () => [0, 0, 100, 0],
}));

describe('EdgeRenderer', () => {
  const nodes: Record<string, FlowchartNode> = {
    a: { id: 'a', type: 'process', x: 0, y: 0, width: 100, height: 60, style: {} },
    b: { id: 'b', type: 'process', x: 200, y: 0, width: 100, height: 60, style: {} },
  };

  const edge: FlowchartEdge = {
    id: 'e1',
    fromNodeId: 'a',
    toNodeId: 'b',
    fromPort: 'right',
    toPort: 'left',
    style: {},
  };

  it('forwards context menu events', () => {
    const handleContextMenu = vi.fn();
    const { getByTestId } = render(
      <EdgeRenderer edge={edge} nodes={nodes} onContextMenu={handleContextMenu} />
    );

    const event = new MouseEvent('contextmenu', { bubbles: true });
    getByTestId('line').dispatchEvent(event);

    expect(handleContextMenu).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run renderer tests**

Run: `npm run test -- src/components/flowchart/NodeRenderer.test.tsx src/components/flowchart/EdgeRenderer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/NodeRenderer.tsx src/components/flowchart/EdgeRenderer.tsx src/components/flowchart/NodeRenderer.test.tsx src/components/flowchart/EdgeRenderer.test.tsx
git commit -m "feat: forward context menu events from node and edge renderers"
```

---

### Task 4: Build `CanvasContextMenu` component

**Files:**
- Create: `src/components/flowchart/CanvasContextMenu.tsx`
- Test: `src/components/flowchart/CanvasContextMenu.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/flowchart/CanvasContextMenu.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasContextMenu } from './CanvasContextMenu';

describe('CanvasContextMenu', () => {
  it('renders node menu items', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    render(
      <CanvasContextMenu
        x={100}
        y={100}
        target={{ type: 'node', id: 'n1' }}
        canForward
        canBackward
        onAction={onAction}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Bring to Front')).toBeInTheDocument();
    expect(screen.getByText('Bring Forward')).toBeInTheDocument();
    expect(screen.getByText('Send Backward')).toBeInTheDocument();
    expect(screen.getByText('Send to Back')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('renders edge menu with delete only', () => {
    const onAction = vi.fn();
    render(
      <CanvasContextMenu
        x={100}
        y={100}
        target={{ type: 'edge', id: 'e1' }}
        canForward={false}
        canBackward={false}
        onAction={onAction}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.queryByText('Bring to Front')).not.toBeInTheDocument();
    expect(screen.queryByText('Duplicate')).not.toBeInTheDocument();
  });

  it('disables forward/backward when requested', () => {
    render(
      <CanvasContextMenu
        x={100}
        y={100}
        target={{ type: 'node', id: 'n1' }}
        canForward={false}
        canBackward={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Bring Forward')).toBeDisabled();
    expect(screen.getByText('Send Backward')).toBeDisabled();
  });

  it('fires action and closes on item click', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    render(
      <CanvasContextMenu
        x={100}
        y={100}
        target={{ type: 'node', id: 'n1' }}
        canForward
        canBackward
        onAction={onAction}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Duplicate'));
    expect(onAction).toHaveBeenCalledWith('duplicate');
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/flowchart/CanvasContextMenu.test.tsx`
Expected: FAIL — `CanvasContextMenu` does not exist.

- [ ] **Step 3: Implement `CanvasContextMenu.tsx`**

Create `src/components/flowchart/CanvasContextMenu.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  CornerLeftDown,
  CornerLeftUp,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ContextMenuAction =
  | 'front'
  | 'forward'
  | 'backward'
  | 'back'
  | 'duplicate'
  | 'delete';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  target: { type: 'node' | 'edge'; id: string };
  canForward: boolean;
  canBackward: boolean;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
}

const MENU_WIDTH = 180;
const MENU_HEIGHT = 260; // approximate max height for node menu

export function CanvasContextMenu({
  x,
  y,
  target,
  canForward,
  canBackward,
  onAction,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  function handleAction(action: ContextMenuAction) {
    onAction(action);
    onClose();
  }

  const clampedX = Math.min(x, window.innerWidth - MENU_WIDTH);
  const clampedY = Math.min(y, window.innerHeight - MENU_HEIGHT);

  const isNode = target.type === 'node';

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: clampedX, top: clampedY }}
      role="menu"
    >
      {isNode && (
        <>
          <MenuItem
            icon={<CornerLeftUp className="h-4 w-4" />}
            label="Bring to Front"
            onClick={() => handleAction('front')}
          />
          <MenuItem
            icon={<ArrowUp className="h-4 w-4" />}
            label="Bring Forward"
            disabled={!canForward}
            onClick={() => handleAction('forward')}
          />
          <MenuItem
            icon={<ArrowDown className="h-4 w-4" />}
            label="Send Backward"
            disabled={!canBackward}
            onClick={() => handleAction('backward')}
          />
          <MenuItem
            icon={<CornerLeftDown className="h-4 w-4" />}
            label="Send to Back"
            onClick={() => handleAction('back')}
          />
          <div className="my-1 h-px bg-border" />
          <MenuItem
            icon={<Copy className="h-4 w-4" />}
            label="Duplicate"
            onClick={() => handleAction('duplicate')}
          />
          <div className="my-1 h-px bg-border" />
        </>
      )}
      <MenuItem
        icon={<Trash2 className="h-4 w-4" />}
        label="Delete"
        destructive
        onClick={() => handleAction('delete')}
      />
    </div>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function MenuItem({ icon, label, destructive, disabled, onClick }: MenuItemProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      className={cn(
        'w-full justify-start gap-2 px-2 py-1 text-sm font-normal',
        destructive && 'text-destructive hover:text-destructive'
      )}
      onClick={onClick}
      role="menuitem"
    >
      {icon}
      {label}
    </Button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/flowchart/CanvasContextMenu.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/CanvasContextMenu.tsx src/components/flowchart/CanvasContextMenu.test.tsx
git commit -m "feat: add canvas context menu component"
```

---

### Task 5: Wire menu into `FlowchartCanvas`

**Files:**
- Modify: `src/components/flowchart/FlowchartCanvas.tsx`
- Test: `src/components/flowchart/FlowchartCanvas.test.tsx`

- [ ] **Step 1: Update test mocks**

In `src/components/flowchart/FlowchartCanvas.test.tsx`, update the `NodeRenderer` mock to accept and expose `onContextMenu`:

```ts
vi.mock('./NodeRenderer', () => ({
  NodeRenderer: ({
    node,
    onMouseDown,
    onContextMenu,
  }: {
    node: FlowchartNode;
    onMouseDown?: () => void;
    onContextMenu?: (e: { evt: MouseEvent; cancelBubble: boolean }) => void;
  }) => (
    <button
      type="button"
      data-testid={`node-${node.id}`}
      onMouseDown={onMouseDown}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.({ evt: e.nativeEvent, cancelBubble: false });
      }}
    />
  ),
}));
```

Update the `EdgeRenderer` mock similarly:

```ts
vi.mock('./EdgeRenderer', () => ({
  EdgeRenderer: (props: Record<string, unknown>) => {
    componentMock.edgeRendererProps = props;
    return (
      <button
        type="button"
        data-testid="edge"
        onClick={() => (props.onClick as (() => void) | undefined)?.()}
        onContextMenu={(e) => {
          e.preventDefault();
          (
            props.onContextMenu as
              | ((event: { evt: MouseEvent; cancelBubble: boolean }) => void)
              | undefined
          )?.({ evt: e.nativeEvent, cancelBubble: false });
        }}
      />
    );
  },
}));
```

Add a new test to `describe('FlowchartCanvas', ...)`:

```ts
  it('opens context menu on right-clicking a node', () => {
    seedEditableGraph();
    render(<FlowchartCanvas />);

    fireEvent.contextMenu(screen.getByTestId('node-a'));

    expect(screen.getByText('Bring to Front')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
  });

  it('opens context menu with delete only on right-clicking an edge', () => {
    seedEditableGraph();
    render(<FlowchartCanvas />);

    fireEvent.contextMenu(screen.getByTestId('edge'));

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.queryByText('Bring to Front')).not.toBeInTheDocument();
  });

  it('closes context menu on stage click', () => {
    seedEditableGraph();
    render(<FlowchartCanvas />);

    fireEvent.contextMenu(screen.getByTestId('node-a'));
    expect(screen.getByText('Bring to Front')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'stage click' }));
    expect(screen.queryByText('Bring to Front')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/components/flowchart/FlowchartCanvas.test.tsx`
Expected: FAIL — context menu does not appear yet.

- [ ] **Step 3: Wire menu into `FlowchartCanvas.tsx`**

Add imports at the top:

```ts
import type { ContextMenuAction } from './CanvasContextMenu';
import { CanvasContextMenu } from './CanvasContextMenu';
```

Add `removeNode`, `removeEdge`, and the new actions to the destructured store:

```ts
  const {
    nodes,
    edges,
    selection,
    tool,
    viewport,
    showGrid,
    snap,
    editingNodeId,
    addNode,
    liveMoveNode,
    moveNode,
    addEdge,
    removeNode,
    removeEdge,
    setSelection,
    setViewport,
    setEditingNodeId,
    updateNode,
    setEdgeWaypoints,
    reconnectEdge,
    bringNodeToFront,
    sendNodeToBack,
    bringNodeForward,
    sendNodeBackward,
    duplicateNode,
  } = useFlowchartStore();
```

Add local state for the menu after the other state declarations:

```ts
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: { type: 'node' | 'edge'; id: string };
  } | null>(null);
```

Add helper to compute `canForward`/`canBackward`:

```ts
  const nodeOrder = Object.keys(nodes);
  const contextMenuTarget = contextMenu?.target;
  const canForward =
    contextMenuTarget?.type === 'node'
      ? nodeOrder.indexOf(contextMenuTarget.id) < nodeOrder.length - 1
      : false;
  const canBackward =
    contextMenuTarget?.type === 'node'
      ? nodeOrder.indexOf(contextMenuTarget.id) > 0
      : false;
```

Add handlers:

```ts
  function handleNodeContextMenu(
    nodeId: string,
    event: Konva.KonvaEventObject<PointerEvent>
  ) {
    event.evt.preventDefault();
    setSelection({ type: 'node', id: nodeId });
    setContextMenu({
      x: event.evt.clientX,
      y: event.evt.clientY,
      target: { type: 'node', id: nodeId },
    });
  }

  function handleEdgeContextMenu(
    edgeId: string,
    event: Konva.KonvaEventObject<PointerEvent>
  ) {
    event.evt.preventDefault();
    setSelection({ type: 'edge', id: edgeId });
    setContextMenu({
      x: event.evt.clientX,
      y: event.evt.clientY,
      target: { type: 'edge', id: edgeId },
    });
  }

  function handleContextMenuAction(action: ContextMenuAction) {
    if (!contextMenu) return;
    const { target } = contextMenu;

    if (target.type === 'node') {
      switch (action) {
        case 'front':
          bringNodeToFront(target.id);
          break;
        case 'forward':
          bringNodeForward(target.id);
          break;
        case 'backward':
          sendNodeBackward(target.id);
          break;
        case 'back':
          sendNodeToBack(target.id);
          break;
        case 'duplicate':
          duplicateNode(target.id);
          break;
        case 'delete':
          removeNode(target.id);
          break;
      }
    } else if (target.type === 'edge' && action === 'delete') {
      removeEdge(target.id);
    }

    setContextMenu(null);
  }
```

Close the menu on stage click. Update `handleStageClick` to clear the menu at the top:

```ts
  function handleStageClick() {
    setContextMenu(null);
    const point = getPointerPosition();
    if (!point) return;
    // ... rest of existing function
  }
```

Close the menu on wheel. Update `handleWheel`:

```ts
  function handleWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    setContextMenu(null);
    // ... rest of existing function
  }
```

Wire `onContextMenu` into `NodeRenderer` and `EdgeRenderer`:

```tsx
          {Object.values(edges).map((edge) => (
            <EdgeRenderer
              key={edge.id}
              edge={edge}
              nodes={nodes}
              isSelected={edge.id === selectedEdgeId}
              previewPoints={
                activeEdgePreview?.edgeId === edge.id
                  ? activeEdgePreview.points
                  : undefined
              }
              onClick={() => setSelection({ type: 'edge', id: edge.id })}
              onContextMenu={(event) => handleEdgeContextMenu(edge.id, event)}
            />
          ))}
```

```tsx
            <NodeRenderer
              key={node.id}
              node={node}
              isSelected={node.id === selectedNodeId}
              draggable={tool === 'select'}
              onClick={() => setSelection({ type: 'node', id: node.id })}
              onDoubleClick={() => setEditingNodeId(node.id)}
              onContextMenu={(event) => handleNodeContextMenu(node.id, event)}
              // ... rest
            />
```

Render the menu at the end of the component return, as a sibling of the `Stage`:

```tsx
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          canForward={canForward}
          canBackward={canBackward}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/components/flowchart/FlowchartCanvas.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `npm run test`
Expected: PASS (all tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/flowchart/FlowchartCanvas.tsx src/components/flowchart/FlowchartCanvas.test.tsx
git commit -m "feat: wire context menu into flowchart canvas"
```

---

## Self-Review

**Spec coverage:**
- Right-click menu on nodes with 6 items → Tasks 3, 4, 5.
- Right-click menu on edges with Delete only → Tasks 3, 4, 5.
- Ordering undoable → Tasks 1, 2.
- Duplicate undoable → Task 2.
- Menu closes on action/Escape/outside click/pan/zoom → Task 4 (close logic), Task 5 (wheel/stage click).
- No empty canvas menu → out of scope; menu only wired on nodes/edges.
- Single item only → implemented per-target, no multi-select logic.

**Placeholder scan:** No TBD/TODO/fill-in details. Each step contains code, file paths, and commands.

**Type consistency:** `ContextMenuAction`, `createReorderNodesCommand`, store action names, and prop names are consistent across tasks.
