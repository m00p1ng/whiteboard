# Viewport Persistence and Minimap Panning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each board's viewport (scale, offsetX, offsetY) with its nodes and edges, restore it on open, and make the minimap's blue viewport rectangle draggable and clickable.

**Architecture:** Add an optional `viewport` field to the `Board` record, extend `saveCurrentBoard` to accept it, update `BoardPage` to restore and subscribe to viewport changes, and add pointer event handlers to `Minimap` that convert canvas pixels back to world coordinates to update the store viewport.

**Tech Stack:** React, TypeScript, Zustand, Vitest, React Testing Library, IndexedDB (idb).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/store/boardStore.ts` | `Board` type and `saveCurrentBoard` signature |
| `src/store/boardStore.test.ts` | Tests for viewport persistence in board store |
| `src/pages/BoardPage.tsx` | Restore saved viewport on load; save viewport changes |
| `src/pages/BoardPage.test.tsx` | Tests for viewport restore/save behavior |
| `src/components/flowchart/Minimap.tsx` | Interactive drag and click panning |
| `src/components/flowchart/Minimap.test.tsx` | Tests for minimap interactions |

---

## Task 1: Persist viewport in the board record

**Files:**
- Modify: `src/store/boardStore.ts`
- Test: `src/store/boardStore.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new test at the end of `src/store/boardStore.test.ts`:

```ts
it('saves the current viewport with the board', () => {
  vi.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValue(300);
  const id = useBoardStore.getState().createBoard('Diagram');
  mockedPutBoard.mockClear();

  const viewport = { scale: 1.5, offsetX: -200, offsetY: -100 };
  useBoardStore.getState().saveCurrentBoard({ nodes: {}, edges: {}, viewport });

  const board = useBoardStore.getState().boards[0];
  expect(board.viewport).toEqual(viewport);
  expect(mockedPutBoard).toHaveBeenCalledWith(board);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/store/boardStore.test.ts`

Expected: FAIL — `saveCurrentBoard` does not accept a `viewport` argument.

- [ ] **Step 3: Update the Board type and save signature**

In `src/store/boardStore.ts`:

```ts
import type { FlowchartEdge, FlowchartGraph, FlowchartNode, Viewport } from '@/types/flowchart';

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: Record<string, FlowchartNode>;
  edges: Record<string, FlowchartEdge>;
  viewport?: Viewport;
}
```

Change the `saveCurrentBoard` action signature:

```ts
saveCurrentBoard: (graph: FlowchartGraph & { viewport?: Viewport }) => void;
```

The existing implementation already spreads `...graph` into the board, so no further change is needed inside `saveCurrentBoard`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/store/boardStore.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/boardStore.ts src/store/boardStore.test.ts
git commit -m "feat(store): persist viewport in board record"
```

---

## Task 2: Restore and auto-save viewport from BoardPage

**Files:**
- Modify: `src/pages/BoardPage.tsx`
- Test: `src/pages/BoardPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add two tests to `src/pages/BoardPage.test.tsx`:

```ts
import { act } from '@testing-library/react';

it('restores the saved viewport when a board is opened', () => {
  const id = useBoardStore.getState().createBoard('Test');
  useBoardStore.setState({
    boards: [
      {
        id,
        name: 'Test',
        createdAt: 1,
        updatedAt: 2,
        nodes: {},
        edges: {},
        viewport: { scale: 1.5, offsetX: -100, offsetY: -50 },
      },
    ],
  });
  useBoardStore.getState().openBoard(id);

  render(<BoardPage />);

  expect(useFlowchartStore.getState().viewport).toEqual({
    scale: 1.5,
    offsetX: -100,
    offsetY: -50,
  });
});

it('saves viewport changes back to the board', () => {
  const id = useBoardStore.getState().createBoard('Test');
  useBoardStore.getState().openBoard(id);

  render(<BoardPage />);

  act(() => {
    useFlowchartStore.getState().setViewport({ scale: 2, offsetX: -300, offsetY: -200 });
  });

  const board = useBoardStore.getState().boards.find((b) => b.id === id);
  expect(board?.viewport).toEqual({ scale: 2, offsetX: -300, offsetY: -200 });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/pages/BoardPage.test.tsx`

Expected: FAIL — viewport is not restored and is not saved.

- [ ] **Step 3: Implement viewport restore and save**

In `src/pages/BoardPage.tsx`, update the `useEffect`:

```ts
useEffect(() => {
  const board = useBoardStore
    .getState()
    .boards.find((candidate) => candidate.id === currentBoardId);

  if (!board) return;

  useFlowchartStore.getState().reset();
  useFlowchartStore.setState({
    nodes: board.nodes,
    edges: board.edges,
    viewport: board.viewport ?? { scale: 1, offsetX: 0, offsetY: 0 },
  });

  return useFlowchartStore.subscribe((state, previousState) => {
    if (
      state.nodes !== previousState.nodes ||
      state.edges !== previousState.edges ||
      state.viewport !== previousState.viewport
    ) {
      saveCurrentBoard({
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
      });
    }
  });
}, [currentBoardId, saveCurrentBoard]);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- src/pages/BoardPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/BoardPage.tsx src/pages/BoardPage.test.tsx
git commit -m "feat(board): restore and auto-save viewport"
```

---

## Task 3: Make the minimap interactive

**Files:**
- Modify: `src/components/flowchart/Minimap.tsx`
- Test: `src/components/flowchart/Minimap.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add helper and tests at the end of `src/components/flowchart/Minimap.test.tsx`:

```ts
function getMinimapTransform(nodes: Record<string, { x: number; y: number; width: number; height: number }>) {
  const nodeList = Object.values(nodes);
  const minX = Math.min(...nodeList.map((n) => n.x));
  const minY = Math.min(...nodeList.map((n) => n.y));
  const maxX = Math.max(...nodeList.map((n) => n.x + n.width));
  const maxY = Math.max(...nodeList.map((n) => n.y + n.height));
  const graphWidth = Math.max(maxX - minX, 1);
  const graphHeight = Math.max(maxY - minY, 1);
  const scale = Math.min(144 / graphWidth, 104 / graphHeight);
  return { scale, offsetX: 8 - minX * scale, offsetY: 8 - minY * scale };
}

function mockCanvasRect(canvas: HTMLCanvasElement) {
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 160, height: 120 }),
    configurable: true,
  });
}

it('pans the viewport when the blue rectangle is dragged', () => {
  const nodes = {
    n1: { id: 'n1', type: 'process' as const, x: 0, y: 0, width: 1000, height: 500, style: {} },
    n2: { id: 'n2', type: 'process' as const, x: 1200, y: 0, width: 100, height: 100, style: {} },
  };
  useFlowchartStore.setState({ nodes, viewport: { scale: 1, offsetX: 0, offsetY: 0 } });
  const { container } = render(<Minimap />);
  const canvas = container.querySelector('canvas')!;
  mockCanvasRect(canvas);
  const { scale, offsetX: mx, offsetY: my } = getMinimapTransform(nodes);

  const startWorldX = 300;
  const startPixelX = mx + startWorldX * scale;
  const startPixelY = my + 50 * scale;
  const endPixelX = startPixelX + 50;

  fireEvent.pointerDown(canvas, { clientX: startPixelX, clientY: startPixelY });
  fireEvent.pointerMove(canvas, { clientX: endPixelX, clientY: startPixelY });
  fireEvent.pointerUp(canvas, { clientX: endPixelX, clientY: startPixelY });

  const viewport = useFlowchartStore.getState().viewport;
  const expectedOffsetX = -(50 / scale) * viewport.scale;
  expect(viewport.offsetX).toBeCloseTo(expectedOffsetX, 0);
});

it('centers the viewport on the clicked world point', () => {
  const nodes = {
    n1: { id: 'n1', type: 'process' as const, x: 0, y: 0, width: 1000, height: 500, style: {} },
    n2: { id: 'n2', type: 'process' as const, x: 1200, y: 0, width: 100, height: 100, style: {} },
  };
  useFlowchartStore.setState({ nodes, viewport: { scale: 1, offsetX: 0, offsetY: 0 } });
  const { container } = render(<Minimap />);
  const canvas = container.querySelector('canvas')!;
  mockCanvasRect(canvas);
  const { scale, offsetX: mx, offsetY: my } = getMinimapTransform(nodes);

  const clickWorldX = 600;
  const clickWorldY = 200;
  const clickPixelX = mx + clickWorldX * scale;
  const clickPixelY = my + clickWorldY * scale;

  fireEvent.click(canvas, { clientX: clickPixelX, clientY: clickPixelY });

  const viewport = useFlowchartStore.getState().viewport;
  expect(viewport.offsetX).toBeCloseTo(-clickWorldX + 500, 0);
  expect(viewport.offsetY).toBeCloseTo(-clickWorldY + 400, 0);
});
```

Add the `fireEvent` import at the top:

```ts
import { act, render, fireEvent } from '@testing-library/react';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/components/flowchart/Minimap.test.tsx`

Expected: FAIL — pointer events on the canvas do not update the viewport.

- [ ] **Step 3: Implement interactive minimap**

Rewrite `src/components/flowchart/Minimap.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFlowchartStore } from '@/store/flowchartStore';
import type { Viewport } from '@/types/flowchart';

const WIDTH = 160;
const HEIGHT = 120;
const PADDING = 8;

interface Transform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { nodes, edges, viewport, setViewport } = useFlowchartStore();

  const nodeList = useMemo(() => Object.values(nodes), [nodes]);

  const transform = useMemo<Transform>(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodeList) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    const graphWidth = Math.max(maxX - minX, 1);
    const graphHeight = Math.max(maxY - minY, 1);
    const scale = Math.min(
      (WIDTH - PADDING * 2) / graphWidth,
      (HEIGHT - PADDING * 2) / graphHeight
    );
    return {
      scale,
      offsetX: PADDING - minX * scale,
      offsetY: PADDING - minY * scale,
    };
  }, [nodeList]);

  const visibleWorld = useMemo(
    () => ({
      x: -viewport.offsetX / viewport.scale,
      y: -viewport.offsetY / viewport.scale,
      width: window.innerWidth / viewport.scale,
      height: window.innerHeight / viewport.scale,
    }),
    [viewport]
  );

  const allNodesVisible =
    nodeList.length > 0 &&
    nodeList.every(
      (node) =>
        node.x >= visibleWorld.x &&
        node.y >= visibleWorld.y &&
        node.x + node.width <= visibleWorld.x + visibleWorld.width &&
        node.y + node.height <= visibleWorld.y + visibleWorld.height
    );

  const shouldHide = nodeList.length === 0 || allNodesVisible;

  useEffect(() => {
    if (shouldHide) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = '#94a3b8';
    for (const edge of Object.values(edges)) {
      const source = nodes[edge.fromNodeId];
      const target = nodes[edge.toNodeId];
      if (!source || !target) continue;
      const sx = (source.x + source.width / 2) * transform.scale + transform.offsetX;
      const sy = (source.y + source.height / 2) * transform.scale + transform.offsetY;
      const tx = (target.x + target.width / 2) * transform.scale + transform.offsetX;
      const ty = (target.y + target.height / 2) * transform.scale + transform.offsetY;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    ctx.fillStyle = '#334155';
    for (const node of nodeList) {
      const x = node.x * transform.scale + transform.offsetX;
      const y = node.y * transform.scale + transform.offsetY;
      ctx.fillRect(x, y, node.width * transform.scale, node.height * transform.scale);
    }

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      visibleWorld.x * transform.scale + transform.offsetX,
      visibleWorld.y * transform.scale + transform.offsetY,
      visibleWorld.width * transform.scale,
      visibleWorld.height * transform.scale
    );
  }, [nodes, edges, viewport, nodeList, shouldHide, transform, visibleWorld]);

  function pixelToWorld(pixelX: number, pixelY: number) {
    return {
      x: (pixelX - transform.offsetX) / transform.scale,
      y: (pixelY - transform.offsetY) / transform.scale,
    };
  }

  function isInsideViewportRect(pixelX: number, pixelY: number) {
    const world = pixelToWorld(pixelX, pixelY);
    return (
      world.x >= visibleWorld.x &&
      world.y >= visibleWorld.y &&
      world.x <= visibleWorld.x + visibleWorld.width &&
      world.y <= visibleWorld.y + visibleWorld.height
    );
  }

  const dragState = useRef<{
    startViewport: Viewport;
    startWorld: { x: number; y: number };
    startPixel: { x: number; y: number };
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hoveringRect, setHoveringRect] = useState(false);
  const hasDraggedRef = useRef(false);

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;

    if (isInsideViewportRect(pixelX, pixelY)) {
      dragState.current = {
        startViewport: viewport,
        startWorld: pixelToWorld(pixelX, pixelY),
        startPixel: { x: pixelX, y: pixelY },
      };
      hasDraggedRef.current = false;
      setDragging(true);
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;

    if (!dragState.current) {
      setHoveringRect(isInsideViewportRect(pixelX, pixelY));
      return;
    }

    const world = pixelToWorld(pixelX, pixelY);
    const distance = Math.hypot(
      pixelX - dragState.current.startPixel.x,
      pixelY - dragState.current.startPixel.y
    );
    if (distance > 2) {
      hasDraggedRef.current = true;
    }

    const deltaX = world.x - dragState.current.startWorld.x;
    const deltaY = world.y - dragState.current.startWorld.y;

    setViewport({
      ...dragState.current.startViewport,
      offsetX: dragState.current.startViewport.offsetX - deltaX * dragState.current.startViewport.scale,
      offsetY: dragState.current.startViewport.offsetY - deltaY * dragState.current.startViewport.scale,
    });
  }

  function handlePointerUp() {
    dragState.current = null;
    setDragging(false);
  }

  function handlePointerLeave() {
    dragState.current = null;
    setDragging(false);
    setHoveringRect(false);
  }

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;
    const world = pixelToWorld(pixelX, pixelY);

    setViewport({
      ...viewport,
      offsetX: -world.x * viewport.scale + window.innerWidth / 2,
      offsetY: -world.y * viewport.scale + window.innerHeight / 2,
    });
  }

  if (shouldHide) {
    return null;
  }

  return (
    <div className="absolute bottom-3 right-3 z-20 rounded-lg border bg-background p-1 shadow-md">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        style={{
          cursor: dragging ? 'grabbing' : hoveringRect ? 'grab' : 'default',
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- src/components/flowchart/Minimap.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/Minimap.tsx src/components/flowchart/Minimap.test.tsx
git commit -m "feat(minimap): drag and click to pan viewport"
```

---

## Task 4: Final verification

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`

Expected: All tests pass.

- [ ] **Step 2: Run the linter**

Run: `npm run lint`

Expected: No lint errors.

- [ ] **Step 3: Run the TypeScript build**

Run: `npm run build`

Expected: Build succeeds.

- [ ] **Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: verify viewport persistence and minimap panning"
```

---

## Self-Review

### Spec coverage

- Save current viewport inside `Board` record → Task 1.
- Resume last viewport position on open → Task 2.
- Drag blue rectangle to pan viewport → Task 3 drag behavior.
- Click on minimap to jump viewport → Task 3 click behavior.

### Placeholder scan

No TBDs, TODOs, or vague steps. Each step includes exact file paths, code, and expected test output.

### Type consistency

- `viewport?: Viewport` is added to `Board` and used by `saveCurrentBoard` in Tasks 1 and 2.
- `setViewport` from `flowchartStore` is used consistently in Task 3.
- The `dragState` ref uses `Viewport` from `@/types/flowchart`.
