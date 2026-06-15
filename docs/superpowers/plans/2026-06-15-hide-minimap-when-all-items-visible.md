# Hide minimap when all items are visible — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the flowchart minimap so it is hidden when the board is empty or when every node already fits inside the viewport.

**Architecture:** Compute node visibility against the same visible-world rectangle the minimap already uses for drawing. If no nodes exist or all node bounds are contained in that rectangle, return `null` from the component before rendering the canvas.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library, Zustand, Tailwind CSS

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/components/flowchart/Minimap.tsx` | Flowchart minimap component. Add early-return visibility check. |
| `src/components/flowchart/Minimap.test.tsx` | Tests for minimap rendering and visibility behavior. |

---

## Task 1: Add visibility check to the flowchart minimap

**Files:**
- Modify: `src/components/flowchart/Minimap.tsx`
- Test: `src/components/flowchart/Minimap.test.tsx`

### Step 1: Write the failing tests

Open `src/components/flowchart/Minimap.test.tsx` and append these tests inside the existing `describe('Minimap', ...)` block, after the existing tests:

```tsx
  it('hides the minimap when there are no nodes', () => {
    useFlowchartStore.setState({ nodes: {} });
    const { container } = render(<Minimap />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('hides the minimap when all nodes fit inside the viewport', () => {
    useFlowchartStore.setState({
      nodes: {
        n1: { id: 'n1', type: 'process', x: 0, y: 0, width: 1000, height: 500, style: {} },
      },
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    });
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 800);

    const { container } = render(<Minimap />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('shows the minimap when a node is outside the viewport', () => {
    useFlowchartStore.setState({
      nodes: {
        n1: { id: 'n1', type: 'process', x: 1200, y: 0, width: 100, height: 100, style: {} },
      },
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    });
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 800);

    const { container } = render(<Minimap />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });
```

### Step 2: Run the new tests to verify they fail

```bash
npx vitest run src/components/flowchart/Minimap.test.tsx
```

Expected: FAIL — the new tests fail because the component currently always renders the canvas.

### Step 3: Implement the visibility check in Minimap.tsx

Open `src/components/flowchart/Minimap.tsx`. Replace the entire component with the following implementation. The key changes are:

1. Compute `nodeList` once at the top of the component.
2. Compute `visibleWorld` for the visibility check.
3. Return `null` when there are no nodes or when every node fits inside `visibleWorld`.
4. Reuse `nodeList` inside the effect and recompute `visibleWorld` there so the effect does not gain extra object dependencies.

```tsx
import { useEffect, useRef } from 'react';
import { useFlowchartStore } from '@/store/flowchartStore';

const WIDTH = 160;
const HEIGHT = 120;
const PADDING = 8;

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { nodes, edges, viewport } = useFlowchartStore();

  const nodeList = Object.values(nodes);

  const visibleWorld = {
    x: -viewport.offsetX / viewport.scale,
    y: -viewport.offsetY / viewport.scale,
    width: window.innerWidth / viewport.scale,
    height: window.innerHeight / viewport.scale,
  };

  const allNodesVisible =
    nodeList.length > 0 &&
    nodeList.every(
      (node) =>
        node.x >= visibleWorld.x &&
        node.y >= visibleWorld.y &&
        node.x + node.width <= visibleWorld.x + visibleWorld.width &&
        node.y + node.height <= visibleWorld.y + visibleWorld.height
    );

  if (nodeList.length === 0 || allNodesVisible) {
    return null;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

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
    const offsetX = PADDING - minX * scale;
    const offsetY = PADDING - minY * scale;

    ctx.strokeStyle = '#94a3b8';
    for (const edge of Object.values(edges)) {
      const source = nodes[edge.fromNodeId];
      const target = nodes[edge.toNodeId];
      if (!source || !target) continue;
      const sx = (source.x + source.width / 2) * scale + offsetX;
      const sy = (source.y + source.height / 2) * scale + offsetY;
      const tx = (target.x + target.width / 2) * scale + offsetX;
      const ty = (target.y + target.height / 2) * scale + offsetY;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    ctx.fillStyle = '#334155';
    for (const node of nodeList) {
      const x = node.x * scale + offsetX;
      const y = node.y * scale + offsetY;
      ctx.fillRect(x, y, node.width * scale, node.height * scale);
    }

    const effectVisibleWorld = {
      x: -viewport.offsetX / viewport.scale,
      y: -viewport.offsetY / viewport.scale,
      width: window.innerWidth / viewport.scale,
      height: window.innerHeight / viewport.scale,
    };

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      effectVisibleWorld.x * scale + offsetX,
      effectVisibleWorld.y * scale + offsetY,
      effectVisibleWorld.width * scale,
      effectVisibleWorld.height * scale
    );
  }, [nodes, edges, viewport, nodeList]);

  return (
    <div className="absolute bottom-3 right-3 z-20 rounded-lg border bg-background p-1 shadow-md">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
    </div>
  );
}
```

### Step 4: Run the tests to verify they pass

```bash
npx vitest run src/components/flowchart/Minimap.test.tsx
```

Expected: PASS — all tests pass, including the existing drawing tests and the three new visibility tests.

### Step 5: Run the full test suite

```bash
npx vitest run
```

Expected: PASS — no regressions across the project.

### Step 6: Commit

```bash
git add src/components/flowchart/Minimap.tsx src/components/flowchart/Minimap.test.tsx
git commit -m "feat: hide flowchart minimap when all items are visible"
```

---

## Self-review checklist

- [ ] Spec coverage: Visibility rule, empty-board behavior, instant transition, and tests are each implemented by Task 1.
- [ ] Placeholder scan: No TBD, TODO, or vague steps remain.
- [ ] Type consistency: `FlowchartNode` fields (`x`, `y`, `width`, `height`) and `Viewport` fields (`scale`, `offsetX`, `offsetY`) match existing types.
