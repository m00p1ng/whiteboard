# Board Flowchart Editor Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the board page as a focused flowchart editor using a node/edge graph model, orthogonal connectors, snap-to-grid with smart guides, and a symbol palette.

**Architecture:** Replace the generic `Shape` model with `FlowchartNode`/`FlowchartEdge` types and a `FlowchartStore`. Canvas rendering is split into layers (grid, edges, nodes, draft, interaction). A small utility layer handles port geometry, orthogonal routing, snapping, and command objects. UI chrome (toolbar, palette, properties panel) talks only to the store.

**Tech Stack:** Vite, React 19, TypeScript, React-Konva, Zustand, Tailwind CSS, shadcn/ui, IndexedDB via `idb`, Vitest.

---

## File Structure

New files to create and existing files to modify:

| File | Responsibility |
| --- | --- |
| `src/types/flowchart.ts` | Core node/edge/selection/viewport types. |
| `src/utils/portGeometry.ts` | Port point calculation, node bounds, default sizes, label centering. |
| `src/utils/orthogonalRouter.ts` | Manhattan orthogonal path computation between node ports. |
| `src/utils/snapEngine.ts` | Grid snapping and smart alignment guides. |
| `src/utils/flowchartCommands.ts` | Command objects for undo/redo (add/remove/move/update nodes and edges). |
| `src/store/flowchartStore.ts` | Zustand store: nodes, edges, selection, tool, viewport, history. |
| `src/hooks/useFlowchartHotkeys.ts` | Keyboard shortcuts for tools, delete, undo/redo, zoom, pan. |
| `src/components/flowchart/NodeRenderer.tsx` | Renders any `FlowchartNode` type with label and selection highlight. |
| `src/components/flowchart/EdgeRenderer.tsx` | Renders an orthogonal edge with arrowhead and optional label. |
| `src/components/flowchart/PortHandles.tsx` | Hover/drag handles for node ports. |
| `src/components/flowchart/DraftLayer.tsx` | Ghost node and draft edge previews. |
| `src/components/flowchart/FlowchartCanvas.tsx` | Konva stage, event handling, layer composition. |
| `src/components/flowchart/LeftToolbar.tsx` | Primary vertical tool rail. |
| `src/components/flowchart/SymbolPalette.tsx` | Expandable advanced/BPMN symbol palette. |
| `src/components/flowchart/PropertiesPanel.tsx` | Right-side context-aware inspector. |
| `src/components/flowchart/TopBar.tsx` | Top chrome with undo/redo/delete/zoom. |
| `src/components/flowchart/Minimap.tsx` | Simplified overview of nodes/edges. |
| `src/pages/BoardPage.tsx` | Hydrates/persists the flowchart graph and lays out chrome. |
| `src/store/boardStore.ts` | Update `Board` shape from `shapes` to `nodes`/`edges`. |
| `src/App.tsx` | Initialize `FlowchartStore` on board open instead of `EditorStore`. |

---

### Task 1: Flowchart types

**Files:**
- Create: `src/types/flowchart.ts`
- Test: `src/types/flowchart.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  FLOWCHART_NODE_TYPES,
  BASIC_TOOLBAR_TYPES,
  ADVANCED_PALETTE_TYPES,
  BPMN_PALETTE_TYPES,
} from './flowchart';

describe('flowchart types', () => {
  it('exports all expected node types', () => {
    expect(FLOWCHART_NODE_TYPES).toContain('process');
    expect(FLOWCHART_NODE_TYPES).toContain('decision');
    expect(FLOWCHART_NODE_TYPES).toContain('terminal');
    expect(FLOWCHART_NODE_TYPES).toContain('gateway');
  });

  it('basic toolbar contains the four primary symbols', () => {
    expect(BASIC_TOOLBAR_TYPES).toEqual(['terminal', 'process', 'decision', 'data']);
  });

  it('advanced and BPMN palettes are non-empty', () => {
    expect(ADVANCED_PALETTE_TYPES.length).toBeGreaterThan(0);
    expect(BPMN_PALETTE_TYPES.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/flowchart.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
export type PortId = 'top' | 'right' | 'bottom' | 'left';

export type FlowchartNodeType =
  | 'terminal'
  | 'process'
  | 'decision'
  | 'data'
  | 'delay'
  | 'preparation'
  | 'display'
  | 'manualInput'
  | 'document'
  | 'storedData'
  | 'merge'
  | 'offPage'
  | 'startEvent'
  | 'task'
  | 'gateway'
  | 'dataObject';

export const FLOWCHART_NODE_TYPES: FlowchartNodeType[] = [
  'terminal',
  'process',
  'decision',
  'data',
  'delay',
  'preparation',
  'display',
  'manualInput',
  'document',
  'storedData',
  'merge',
  'offPage',
  'startEvent',
  'task',
  'gateway',
  'dataObject',
];

export const BASIC_TOOLBAR_TYPES: FlowchartNodeType[] = [
  'terminal',
  'process',
  'decision',
  'data',
];

export const ADVANCED_PALETTE_TYPES: FlowchartNodeType[] = [
  'delay',
  'preparation',
  'display',
  'manualInput',
  'document',
  'storedData',
  'merge',
  'offPage',
];

export const BPMN_PALETTE_TYPES: FlowchartNodeType[] = [
  'startEvent',
  'task',
  'gateway',
  'dataObject',
];

export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  textColor?: string;
}

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  arrowhead?: 'arrow' | 'open' | 'none';
}

export interface FlowchartNode {
  id: string;
  type: FlowchartNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  label?: string;
  style: NodeStyle;
}

export interface FlowchartEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort: PortId;
  toPort: PortId;
  label?: string;
  style: EdgeStyle;
}

export type FlowchartSelection =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | null;

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface FlowchartGraph {
  nodes: Record<string, FlowchartNode>;
  edges: Record<string, FlowchartEdge>;
}

export type FlowchartTool = 'select' | 'connector' | FlowchartNodeType;

export interface Command {
  do: (state: FlowchartGraph) => void;
  undo: (state: FlowchartGraph) => void;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/flowchart.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/flowchart.ts src/types/flowchart.test.ts
git commit -m "feat(types): add flowchart node/edge/tool/selection types"
```

---

### Task 2: Port geometry

**Files:**
- Create: `src/utils/portGeometry.ts`
- Test: `src/utils/portGeometry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  getPortPoint,
  getPortDirection,
  getDefaultNodeSize,
  getNodeBounds,
} from './portGeometry';
import type { FlowchartNode } from '@/types/flowchart';

describe('portGeometry', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 100,
    y: 50,
    width: 140,
    height: 80,
    style: {},
  };

  it('returns correct port points', () => {
    expect(getPortPoint(node, 'top')).toEqual({ x: 170, y: 50 });
    expect(getPortPoint(node, 'right')).toEqual({ x: 240, y: 90 });
    expect(getPortPoint(node, 'bottom')).toEqual({ x: 170, y: 130 });
    expect(getPortPoint(node, 'left')).toEqual({ x: 100, y: 90 });
  });

  it('returns outward port directions', () => {
    expect(getPortDirection('top')).toEqual({ x: 0, y: -1 });
    expect(getPortDirection('right')).toEqual({ x: 1, y: 0 });
    expect(getPortDirection('bottom')).toEqual({ x: 0, y: 1 });
    expect(getPortDirection('left')).toEqual({ x: -1, y: 0 });
  });

  it('returns default sizes', () => {
    expect(getDefaultNodeSize('process')).toEqual({ width: 140, height: 80 });
    expect(getDefaultNodeSize('decision')).toEqual({ width: 120, height: 120 });
    expect(getDefaultNodeSize('terminal')).toEqual({ width: 120, height: 60 });
  });

  it('returns node bounds', () => {
    expect(getNodeBounds(node)).toEqual({
      x: 100,
      y: 50,
      x2: 240,
      y2: 130,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/portGeometry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { FlowchartNode, FlowchartNodeType, PortId } from '@/types/flowchart';

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  x2: number;
  y2: number;
}

export function getDefaultNodeSize(type: FlowchartNodeType): {
  width: number;
  height: number;
} {
  switch (type) {
    case 'terminal':
      return { width: 120, height: 60 };
    case 'process':
      return { width: 140, height: 80 };
    case 'decision':
      return { width: 120, height: 120 };
    case 'data':
      return { width: 140, height: 80 };
    default:
      return { width: 120, height: 80 };
  }
}

export function getPortPoint(node: FlowchartNode, port: PortId): Point {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  switch (port) {
    case 'top':
      return { x: cx, y: node.y };
    case 'right':
      return { x: node.x + node.width, y: cy };
    case 'bottom':
      return { x: cx, y: node.y + node.height };
    case 'left':
      return { x: node.x, y: cy };
  }
}

export function getPortDirection(port: PortId): Point {
  switch (port) {
    case 'top':
      return { x: 0, y: -1 };
    case 'right':
      return { x: 1, y: 0 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
  }
}

export function getNodeBounds(node: FlowchartNode): Bounds {
  return {
    x: node.x,
    y: node.y,
    x2: node.x + node.width,
    y2: node.y + node.height,
  };
}

export function getLabelCenter(node: FlowchartNode): Point {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/portGeometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/portGeometry.ts src/utils/portGeometry.test.ts
git commit -m "feat(geometry): add port points, directions, and default node sizes"
```

---

### Task 3: Orthogonal router

**Files:**
- Create: `src/utils/orthogonalRouter.ts`
- Test: `src/utils/orthogonalRouter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { computeOrthogonalPath } from './orthogonalRouter';
import type { FlowchartNode } from '@/types/flowchart';

function makeNode(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): FlowchartNode {
  return { id, type: 'process', x, y, width, height, style: {} };
}

describe('orthogonalRouter', () => {
  const source = makeNode('s', 0, 0, 100, 60);
  const target = makeNode('t', 200, 150, 100, 60);

  it('routes top-to-bottom with three orthogonal segments', () => {
    const path = computeOrthogonalPath(source, 'top', target, 'bottom');
    expect(path).toEqual([
      50, 0, 50, -8, 150, -8, 150, 218, 250, 218, 250, 210,
    ]);
  });

  it('routes right-to-left with five points', () => {
    const path = computeOrthogonalPath(source, 'right', target, 'left');
    expect(path).toEqual([
      100, 30, 108, 30, 108, 105, 192, 105, 192, 180, 200, 180,
    ]);
  });

  it('routes left-to-top with three segments', () => {
    const path = computeOrthogonalPath(source, 'left', target, 'top');
    expect(path).toEqual([
      0, 30, -8, 30, 250, 30, 250, 142, 250, 150,
    ]);
  });

  it('falls back to a straight line when nodes overlap', () => {
    const overlapping = makeNode('o', 10, 10, 100, 60);
    const path = computeOrthogonalPath(source, 'right', overlapping, 'left', 8);
    expect(path).toEqual([100, 30, 10, 30]);
  });

  it('produces an axis-aligned path', () => {
    const path = computeOrthogonalPath(source, 'bottom', target, 'right');
    for (let i = 2; i < path.length - 2; i += 2) {
      const x1 = path[i];
      const y1 = path[i + 1];
      const x2 = path[i + 2];
      const y2 = path[i + 3];
      expect(x1 === x2 || y1 === y2).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/orthogonalRouter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { FlowchartNode, PortId } from '@/types/flowchart';
import { getNodeBounds, getPortDirection, getPortPoint } from './portGeometry';

export function computeOrthogonalPath(
  source: FlowchartNode,
  sourcePort: PortId,
  target: FlowchartNode,
  targetPort: PortId,
  margin = 8
): number[] {
  const sourcePoint = getPortPoint(source, sourcePort);
  const targetPoint = getPortPoint(target, targetPort);
  const sourceDir = getPortDirection(sourcePort);
  const targetDir = getPortDirection(targetPort);

  const p1 = {
    x: sourcePoint.x + sourceDir.x * margin,
    y: sourcePoint.y + sourceDir.y * margin,
  };
  const p2 = {
    x: targetPoint.x + targetDir.x * margin,
    y: targetPoint.y + targetDir.y * margin,
  };

  const sourceBounds = inflateBounds(getNodeBounds(source), margin);
  const targetBounds = inflateBounds(getNodeBounds(target), margin);

  if (boundsOverlap(sourceBounds, targetBounds)) {
    return [sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y];
  }

  const points: number[] = [sourcePoint.x, sourcePoint.y];

  if (p1.x === p2.x || p1.y === p2.y) {
    points.push(p1.x, p1.y, p2.x, p2.y);
  } else {
    const sourceIsHorizontal = sourcePort === 'left' || sourcePort === 'right';
    const targetIsVertical = targetPort === 'top' || targetPort === 'bottom';

    if (sourceIsHorizontal && targetIsVertical) {
      points.push(p1.x, p1.y, p2.x, p1.y, p2.x, p2.y);
    } else if (!sourceIsHorizontal && !targetIsVertical) {
      points.push(p1.x, p1.y, p1.x, p2.y, p2.x, p2.y);
    } else if (sourceIsHorizontal) {
      const midY = (p1.y + p2.y) / 2;
      points.push(p1.x, p1.y, p1.x, midY, p2.x, midY, p2.x, p2.y);
    } else {
      const midX = (p1.x + p2.x) / 2;
      points.push(p1.x, p1.y, midX, p1.y, midX, p2.y, p2.x, p2.y);
    }
  }

  points.push(targetPoint.x, targetPoint.y);
  return points;
}

function inflateBounds(
  bounds: { x: number; y: number; x2: number; y2: number },
  amount: number
) {
  return {
    x: bounds.x - amount,
    y: bounds.y - amount,
    x2: bounds.x2 + amount,
    y2: bounds.y2 + amount,
  };
}

function boundsOverlap(
  a: { x: number; y: number; x2: number; y2: number },
  b: { x: number; y: number; x2: number; y2: number }
): boolean {
  return a.x < b.x2 && a.x2 > b.x && a.y < b.y2 && a.y2 > b.y;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/orthogonalRouter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/orthogonalRouter.ts src/utils/orthogonalRouter.test.ts
git commit -m "feat(routing): add orthogonal edge router"
```

---

### Task 4: Snap engine

**Files:**
- Create: `src/utils/snapEngine.ts`
- Test: `src/utils/snapEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { snapToGrid, snapPoint, computeSmartGuides } from './snapEngine';
import type { FlowchartNode } from '@/types/flowchart';

describe('snapEngine', () => {
  it('snaps a value to the grid', () => {
    expect(snapToGrid(14, 10)).toBe(10);
    expect(snapToGrid(16, 10)).toBe(20);
    expect(snapToGrid(15, 10)).toBe(20);
  });

  it('snaps a point to the grid', () => {
    expect(snapPoint(14, 26, 10)).toEqual({ x: 10, y: 30 });
  });

  it('computes horizontal center alignment guide', () => {
    const moving: FlowchartNode = {
      id: 'm',
      type: 'process',
      x: 98,
      y: 0,
      width: 40,
      height: 40,
      style: {},
    };
    const other: FlowchartNode = {
      id: 'o',
      type: 'process',
      x: 100,
      y: 100,
      width: 40,
      height: 40,
      style: {},
    };
    const guides = computeSmartGuides(moving, [other], 5);
    expect(guides.dx).toBe(2);
  });

  it('returns no guide when outside threshold', () => {
    const moving: FlowchartNode = {
      id: 'm',
      type: 'process',
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      style: {},
    };
    const other: FlowchartNode = {
      id: 'o',
      type: 'process',
      x: 200,
      y: 200,
      width: 40,
      height: 40,
      style: {},
    };
    const guides = computeSmartGuides(moving, [other], 5);
    expect(guides.dx).toBeUndefined();
    expect(guides.dy).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/snapEngine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { FlowchartNode } from '@/types/flowchart';

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPoint(
  x: number,
  y: number,
  gridSize: number
): { x: number; y: number } {
  return { x: snapToGrid(x, gridSize), y: snapToGrid(y, gridSize) };
}

export interface SnapGuides {
  dx?: number;
  dy?: number;
}

export function computeSmartGuides(
  movingNode: FlowchartNode,
  otherNodes: FlowchartNode[],
  threshold = 8
): SnapGuides {
  const guides: SnapGuides = {};
  const movingX = movingNode.x;
  const movingY = movingNode.y;
  const movingCenterX = movingNode.x + movingNode.width / 2;
  const movingCenterY = movingNode.y + movingNode.height / 2;
  const movingRight = movingNode.x + movingNode.width;
  const movingBottom = movingNode.y + movingNode.height;

  for (const other of otherNodes) {
    if (other.id === movingNode.id) continue;

    const otherX = other.x;
    const otherY = other.y;
    const otherCenterX = other.x + other.width / 2;
    const otherCenterY = other.y + other.height / 2;
    const otherRight = other.x + other.width;
    const otherBottom = other.y + other.height;

    const candidates = [
      { value: movingX, target: otherX },
      { value: movingCenterX, target: otherCenterX },
      { value: movingRight, target: otherRight },
    ];

    for (const { value, target } of candidates) {
      const diff = target - value;
      if (Math.abs(diff) <= threshold) {
        if (guides.dx === undefined || Math.abs(diff) < Math.abs(guides.dx)) {
          guides.dx = diff;
        }
      }
    }

    const yCandidates = [
      { value: movingY, target: otherY },
      { value: movingCenterY, target: otherCenterY },
      { value: movingBottom, target: otherBottom },
    ];

    for (const { value, target } of yCandidates) {
      const diff = target - value;
      if (Math.abs(diff) <= threshold) {
        if (guides.dy === undefined || Math.abs(diff) < Math.abs(guides.dy)) {
          guides.dy = diff;
        }
      }
    }
  }

  return guides;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/snapEngine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/snapEngine.ts src/utils/snapEngine.test.ts
git commit -m "feat(snap): add grid snapping and smart alignment guides"
```

---

### Task 5: Flowchart commands

**Files:**
- Create: `src/utils/flowchartCommands.ts`
- Test: `src/utils/flowchartCommands.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  createAddNodeCommand,
  createRemoveNodeCommand,
  createMoveNodeCommand,
  createAddEdgeCommand,
} from './flowchartCommands';
import type { FlowchartEdge, FlowchartNode } from '@/types/flowchart';

describe('flowchartCommands', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    style: {},
  };

  it('adds and removes a node', () => {
    const cmd = createAddNodeCommand(node);
    const state = { nodes: {}, edges: {} };
    cmd.do(state);
    expect(state.nodes['n1']).toBeDefined();
    cmd.undo(state);
    expect(state.nodes['n1']).toBeUndefined();
  });

  it('removes attached edges when removing a node', () => {
    const a: FlowchartNode = { ...node, id: 'a' };
    const b: FlowchartNode = { ...node, id: 'b', x: 200 };
    const edge: FlowchartEdge = {
      id: 'e1',
      fromNodeId: 'a',
      toNodeId: 'b',
      fromPort: 'right',
      toPort: 'left',
      style: {},
    };
    const state = { nodes: { a, b }, edges: { e1: edge } };
    const cmd = createRemoveNodeCommand('a', state);
    cmd.do(state);
    expect(state.nodes['a']).toBeUndefined();
    expect(state.edges['e1']).toBeUndefined();
    cmd.undo(state);
    expect(state.nodes['a']).toBeDefined();
    expect(state.edges['e1']).toBeDefined();
  });

  it('moves a node and undoes the move', () => {
    const cmd = createMoveNodeCommand('n1', { x: 0, y: 0 }, { x: 50, y: 80 });
    const state = { nodes: { n1: node }, edges: {} };
    cmd.do(state);
    expect(state.nodes['n1'].x).toBe(50);
    expect(state.nodes['n1'].y).toBe(80);
    cmd.undo(state);
    expect(state.nodes['n1'].x).toBe(0);
    expect(state.nodes['n1'].y).toBe(0);
  });

  it('adds and removes an edge', () => {
    const edge: FlowchartEdge = {
      id: 'e1',
      fromNodeId: 'a',
      toNodeId: 'b',
      fromPort: 'right',
      toPort: 'left',
      style: {},
    };
    const cmd = createAddEdgeCommand(edge);
    const state = { nodes: {}, edges: {} };
    cmd.do(state);
    expect(state.edges['e1']).toBeDefined();
    cmd.undo(state);
    expect(state.edges['e1']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/flowchartCommands.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type {
  Command,
  FlowchartEdge,
  FlowchartGraph,
  FlowchartNode,
} from '@/types/flowchart';

export function createAddNodeCommand(node: FlowchartNode): Command {
  return {
    do: (state) => {
      state.nodes[node.id] = node;
    },
    undo: (state) => {
      delete state.nodes[node.id];
    },
  };
}

export function createRemoveNodeCommand(
  nodeId: string,
  state: FlowchartGraph
): Command {
  const node = state.nodes[nodeId];
  const attachedEdges = Object.values(state.edges).filter(
    (edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId
  );

  return {
    do: (s) => {
      delete s.nodes[nodeId];
      for (const edge of attachedEdges) {
        delete s.edges[edge.id];
      }
    },
    undo: (s) => {
      s.nodes[nodeId] = node;
      for (const edge of attachedEdges) {
        s.edges[edge.id] = edge;
      }
    },
  };
}

export function createMoveNodeCommand(
  nodeId: string,
  from: { x: number; y: number },
  to: { x: number; y: number }
): Command {
  return {
    do: (state) => {
      const node = state.nodes[nodeId];
      if (node) {
        node.x = to.x;
        node.y = to.y;
      }
    },
    undo: (state) => {
      const node = state.nodes[nodeId];
      if (node) {
        node.x = from.x;
        node.y = from.y;
      }
    },
  };
}

export function createUpdateNodeCommand(
  nodeId: string,
  from: Partial<FlowchartNode>,
  to: Partial<FlowchartNode>
): Command {
  return {
    do: (state) => {
      const node = state.nodes[nodeId];
      if (node) Object.assign(node, to);
    },
    undo: (state) => {
      const node = state.nodes[nodeId];
      if (node) Object.assign(node, from);
    },
  };
}

export function createAddEdgeCommand(edge: FlowchartEdge): Command {
  return {
    do: (state) => {
      state.edges[edge.id] = edge;
    },
    undo: (state) => {
      delete state.edges[edge.id];
    },
  };
}

export function createRemoveEdgeCommand(edgeId: string, state: FlowchartGraph): Command {
  const edge = state.edges[edgeId];
  return {
    do: (s) => {
      delete s.edges[edgeId];
    },
    undo: (s) => {
      s.edges[edgeId] = edge;
    },
  };
}

export function createUpdateEdgeCommand(
  edgeId: string,
  from: Partial<FlowchartEdge>,
  to: Partial<FlowchartEdge>
): Command {
  return {
    do: (state) => {
      const edge = state.edges[edgeId];
      if (edge) Object.assign(edge, to);
    },
    undo: (state) => {
      const edge = state.edges[edgeId];
      if (edge) Object.assign(edge, from);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/flowchartCommands.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/flowchartCommands.ts src/utils/flowchartCommands.test.ts
git commit -m "feat(commands): add undo/redo commands for nodes and edges"
```

---

### Task 6: Flowchart store

**Files:**
- Create: `src/store/flowchartStore.ts`
- Test: `src/store/flowchartStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFlowchartStore, createDefaultNode } from './flowchartStore';
import type { FlowchartNode } from '@/types/flowchart';

describe('flowchartStore', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      get length() {
        return values.size;
      },
      clear: vi.fn(() => values.clear()),
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      key: vi.fn((index: number) => [...values.keys()][index] ?? null),
      removeItem: vi.fn((key: string) => values.delete(key)),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    } satisfies Storage);

    useFlowchartStore.setState({
      nodes: {},
      edges: {},
      selection: null,
      tool: 'select',
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      showGrid: true,
      snap: true,
      editingNodeId: null,
      undoStack: [],
      redoStack: [],
    });
  });

  it('adds a node and selects it', () => {
    const node = createDefaultNode('process', 100, 100);
    useFlowchartStore.getState().addNode(node);
    expect(useFlowchartStore.getState().nodes[node.id]).toEqual(node);
    expect(useFlowchartStore.getState().selection).toEqual({
      type: 'node',
      id: node.id,
    });
  });

  it('removes a node and its edges', () => {
    const a = createDefaultNode('process', 0, 0);
    const b = createDefaultNode('process', 200, 0);
    const { addNode, addEdge, removeNode } = useFlowchartStore.getState();
    addNode(a);
    addNode(b);
    addEdge(a.id, 'right', b.id, 'left');
    removeNode(a.id);
    expect(useFlowchartStore.getState().nodes[a.id]).toBeUndefined();
    expect(Object.values(useFlowchartStore.getState().edges)).toHaveLength(0);
  });

  it('undoes and redoes', () => {
    const node = createDefaultNode('process', 0, 0);
    const { addNode, undo, redo } = useFlowchartStore.getState();
    addNode(node);
    expect(useFlowchartStore.getState().nodes[node.id]).toBeDefined();
    undo();
    expect(useFlowchartStore.getState().nodes[node.id]).toBeUndefined();
    redo();
    expect(useFlowchartStore.getState().nodes[node.id]).toBeDefined();
  });

  it('rejects self-connecting edges', () => {
    const a = createDefaultNode('process', 0, 0);
    useFlowchartStore.getState().addNode(a);
    useFlowchartStore.getState().addEdge(a.id, 'right', a.id, 'left');
    expect(Object.values(useFlowchartStore.getState().edges)).toHaveLength(0);
  });

  it('defaults showGrid from localStorage', () => {
    expect(useFlowchartStore.getState().showGrid).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/flowchartStore.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { create } from 'zustand';
import {
  createAddEdgeCommand,
  createAddNodeCommand,
  createMoveNodeCommand,
  createRemoveEdgeCommand,
  createRemoveNodeCommand,
  createUpdateEdgeCommand,
  createUpdateNodeCommand,
} from '@/utils/flowchartCommands';
import { getDefaultNodeSize } from '@/utils/portGeometry';
import type {
  Command,
  FlowchartEdge,
  FlowchartGraph,
  FlowchartNode,
  FlowchartSelection,
  FlowchartTool,
  PortId,
  Viewport,
} from '@/types/flowchart';

export interface FlowchartState extends FlowchartGraph {
  selection: FlowchartSelection;
  tool: FlowchartTool;
  viewport: Viewport;
  showGrid: boolean;
  snap: boolean;
  editingNodeId: string | null;
  undoStack: Command[];
  redoStack: Command[];
}

interface FlowchartActions {
  execute: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  addNode: (node: FlowchartNode) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  updateNode: (id: string, updates: Partial<FlowchartNode>) => void;
  updateNodeStyle: (id: string, style: Partial<FlowchartNode['style']>) => void;
  liveMoveNode: (id: string, position: { x: number; y: number }) => void;
  addEdge: (
    fromNodeId: string,
    fromPort: PortId,
    toNodeId: string,
    toPort: PortId
  ) => void;
  removeEdge: (id: string) => void;
  updateEdge: (id: string, updates: Partial<FlowchartEdge>) => void;
  updateEdgeStyle: (id: string, style: Partial<FlowchartEdge['style']>) => void;
  setTool: (tool: FlowchartTool) => void;
  setSelection: (selection: FlowchartSelection) => void;
  setViewport: (viewport: Viewport) => void;
  setShowGrid: (show: boolean) => void;
  setSnap: (snap: boolean) => void;
  setEditingNodeId: (id: string | null) => void;
  reset: () => void;
}

const GRID_STORAGE_KEY = 'whiteboard:showGrid';

function readGridSetting(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(GRID_STORAGE_KEY) !== 'false';
}

function persistGridSetting(show: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GRID_STORAGE_KEY, String(show));
}

const initialState: FlowchartState = {
  nodes: {},
  edges: {},
  selection: null,
  tool: 'select',
  viewport: { scale: 1, offsetX: 0, offsetY: 0 },
  showGrid: readGridSetting(),
  snap: true,
  editingNodeId: null,
  undoStack: [],
  redoStack: [],
};

export function createDefaultNode(
  type: FlowchartNode['type'],
  x: number,
  y: number
): FlowchartNode {
  const { width, height } = getDefaultNodeSize(type);
  return {
    id: crypto.randomUUID(),
    type,
    x,
    y,
    width,
    height,
    label: '',
    style: {
      fill: '#ffffff',
      stroke: '#334155',
      strokeWidth: 2,
      fontSize: 14,
      textColor: '#0f172a',
    },
  };
}

export const useFlowchartStore = create<FlowchartState & FlowchartActions>(
  (set, get) => ({
    ...initialState,

    execute: (command) => {
      command.do(get());
      set((state) => ({
        undoStack: [...state.undoStack, command],
        redoStack: [],
      }));
    },

    undo: () => {
      const command = get().undoStack.at(-1);
      if (!command) return;
      command.undo(get());
      set((state) => ({
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, command],
      }));
    },

    redo: () => {
      const command = get().redoStack.at(-1);
      if (!command) return;
      command.do(get());
      set((state) => ({
        undoStack: [...state.undoStack, command],
        redoStack: state.redoStack.slice(0, -1),
      }));
    },

    addNode: (node) => {
      get().execute(createAddNodeCommand(node));
      set({ selection: { type: 'node', id: node.id }, tool: 'select' });
    },

    removeNode: (id) => {
      const { execute, setSelection } = get();
      execute(createRemoveNodeCommand(id, get()));
      setSelection(null);
    },

    moveNode: (id, position) => {
      const node = get().nodes[id];
      if (!node) return;
      get().execute(
        createMoveNodeCommand(id, { x: node.x, y: node.y }, position)
      );
    },

    updateNode: (id, updates) => {
      const node = get().nodes[id];
      if (!node) return;
      const from: Partial<FlowchartNode> = {};
      for (const key of Object.keys(updates) as (keyof FlowchartNode)[]) {
        (from as Record<string, unknown>)[key] = node[key];
      }
      get().execute(createUpdateNodeCommand(id, from, updates));
    },

    updateNodeStyle: (id, style) => {
      const node = get().nodes[id];
      if (!node) return;
      get().updateNode(id, { style: { ...node.style, ...style } });
    },

    liveMoveNode: (id, position) => {
      set((state) => {
        const node = state.nodes[id];
        if (!node) return state;
        return {
          nodes: {
            ...state.nodes,
            [id]: { ...node, x: position.x, y: position.y },
          },
        };
      });
    },

    addEdge: (fromNodeId, fromPort, toNodeId, toPort) => {
      if (fromNodeId === toNodeId) return;
      const existing = Object.values(get().edges).find(
        (edge) =>
          edge.fromNodeId === fromNodeId &&
          edge.fromPort === fromPort &&
          edge.toNodeId === toNodeId &&
          edge.toPort === toPort
      );
      if (existing) return;

      const edge: FlowchartEdge = {
        id: crypto.randomUUID(),
        fromNodeId,
        toNodeId,
        fromPort,
        toPort,
        style: { stroke: '#334155', strokeWidth: 2, arrowhead: 'arrow' },
      };
      get().execute(createAddEdgeCommand(edge));
      set({ selection: { type: 'edge', id: edge.id }, tool: 'select' });
    },

    removeEdge: (id) => {
      get().execute(createRemoveEdgeCommand(id, get()));
      set({ selection: null });
    },

    updateEdge: (id, updates) => {
      const edge = get().edges[id];
      if (!edge) return;
      const from: Partial<FlowchartEdge> = {};
      for (const key of Object.keys(updates) as (keyof FlowchartEdge)[]) {
        (from as Record<string, unknown>)[key] = edge[key];
      }
      get().execute(createUpdateEdgeCommand(id, from, updates));
    },

    updateEdgeStyle: (id, style) => {
      const edge = get().edges[id];
      if (!edge) return;
      get().updateEdge(id, { style: { ...edge.style, ...style } });
    },

    setTool: (tool) => set({ tool }),
    setSelection: (selection) => set({ selection }),
    setViewport: (viewport) => set({ viewport }),
    setShowGrid: (show) => {
      persistGridSetting(show);
      set({ showGrid: show });
    },
    setSnap: (snap) => set({ snap }),
    setEditingNodeId: (id) => set({ editingNodeId: id }),
    reset: () => set({ ...initialState, showGrid: get().showGrid }),
  })
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/flowchartStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/flowchartStore.ts src/store/flowchartStore.test.ts
git commit -m "feat(store): add flowchart store with nodes, edges, selection, and history"
```

---

### Task 7: Flowchart hotkeys

**Files:**
- Create: `src/hooks/useFlowchartHotkeys.ts`
- Test: `src/hooks/useFlowchartHotkeys.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowchartHotkeys } from './useFlowchartHotkeys';
import { useFlowchartStore } from '@/store/flowchartStore';

function pressKey(key: string, meta = false, shift = false) {
  const event = new KeyboardEvent('keydown', {
    key,
    metaKey: meta,
    shiftKey: shift,
    bubbles: true,
  });
  document.dispatchEvent(event);
}

describe('useFlowchartHotkeys', () => {
  beforeEach(() => {
    useFlowchartStore.setState({
      nodes: {},
      edges: {},
      selection: null,
      tool: 'select',
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      showGrid: true,
      snap: true,
      editingNodeId: null,
      undoStack: [],
      redoStack: [],
    });
  });

  it('switches tool to process on P', () => {
    renderHook(() => useFlowchartHotkeys());
    pressKey('p');
    expect(useFlowchartStore.getState().tool).toBe('process');
  });

  it('deletes selected node on Delete', () => {
    useFlowchartStore.setState({
      nodes: {
        n1: {
          id: 'n1',
          type: 'process',
          x: 0,
          y: 0,
          width: 100,
          height: 60,
          style: {},
        },
      },
      selection: { type: 'node', id: 'n1' },
    });
    renderHook(() => useFlowchartHotkeys());
    pressKey('Delete');
    expect(useFlowchartStore.getState().nodes['n1']).toBeUndefined();
  });

  it('undoes on Cmd+Z', () => {
    const node = {
      id: 'n1',
      type: 'process',
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      style: {},
    };
    useFlowchartStore.getState().addNode(node);
    renderHook(() => useFlowchartHotkeys());
    pressKey('z', true);
    expect(useFlowchartStore.getState().nodes['n1']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useFlowchartHotkeys.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { useEffect } from 'react';
import { useFlowchartStore } from '@/store/flowchartStore';
import type { FlowchartTool } from '@/types/flowchart';

const TOOL_KEYS: Record<string, FlowchartTool> = {
  v: 'select',
  p: 'process',
  d: 'decision',
  i: 'data',
  t: 'terminal',
  k: 'connector',
};

export function useFlowchartHotkeys() {
  const {
    selection,
    tool,
    removeNode,
    removeEdge,
    undo,
    redo,
    setTool,
    setViewport,
    setEditingNodeId,
    viewport,
  } = useFlowchartStore();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (event.key === 'Escape') {
        setTool('select');
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selection?.type === 'node') {
          removeNode(selection.id);
        } else if (selection?.type === 'edge') {
          removeEdge(selection.id);
        }
        return;
      }

      if (
        tool === 'select' &&
        selection?.type === 'node' &&
        event.key.length === 1 &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        setEditingNodeId(selection.id);
        return;
      }

      const nextTool = TOOL_KEYS[event.key.toLowerCase()];
      if (nextTool) {
        setTool(nextTool);
        return;
      }

      if (event.key === '+' || event.key === '=') {
        setViewport({ ...viewport, scale: Math.min(viewport.scale * 1.1, 4) });
        return;
      }
      if (event.key === '-') {
        setViewport({ ...viewport, scale: Math.max(viewport.scale / 1.1, 0.1) });
        return;
      }
      if (event.key === '0') {
        setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    selection,
    tool,
    removeNode,
    removeEdge,
    undo,
    redo,
    setTool,
    setEditingNodeId,
    setViewport,
    viewport,
  ]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useFlowchartHotkeys.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFlowchartHotkeys.ts src/hooks/useFlowchartHotkeys.test.ts
git commit -m "feat(hotkeys): add keyboard shortcuts for flowchart tools and actions"
```

---

### Task 8: Node renderer

**Files:**
- Create: `src/components/flowchart/NodeRenderer.tsx`
- Test: `src/components/flowchart/NodeRenderer.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Stage, Layer } from 'react-konva';
import { NodeRenderer } from './NodeRenderer';
import type { FlowchartNode } from '@/types/flowchart';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <Stage width={400} height={400}>
      <Layer>{children}</Layer>
    </Stage>
  );
}

describe('NodeRenderer', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 10,
    y: 20,
    width: 100,
    height: 60,
    label: 'Step 1',
    style: { fill: '#ffffff', stroke: '#000000', strokeWidth: 2 },
  };

  it('renders without crashing', () => {
    render(
      <Wrapper>
        <NodeRenderer node={node} />
      </Wrapper>
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/flowchart/NodeRenderer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Group, Path, Rect, Text } from 'react-konva';
import type { FlowchartNode, FlowchartNodeType } from '@/types/flowchart';

interface NodeRendererProps {
  node: FlowchartNode;
  isSelected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDragStart?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
}

function buildPath(type: FlowchartNodeType, w: number, h: number): string {
  const r = h / 2;
  const skew = Math.min(20, w / 4);

  switch (type) {
    case 'terminal':
      return `M ${r},0 h ${w - 2 * r} a ${r},${r} 0 0 1 ${r},${r} v ${h - 2 * r} a ${r},${r} 0 0 1 -${r},${r} h -${w - 2 * r} a ${r},${r} 0 0 1 -${r},-${r} v -${h - 2 * r} a ${r},${r} 0 0 1 ${r},-${r} z`;
    case 'decision':
      return `M ${w / 2},0 L ${w},${h / 2} L ${w / 2},${h} L 0,${h / 2} z`;
    case 'data':
      return `M ${skew},0 L ${w},0 L ${w - skew},${h} L 0,${h} z`;
    case 'delay':
      return `M 0,0 h ${w - r} a ${r},${r} 0 0 1 ${r},${r} v ${h - 2 * r} a ${r},${r} 0 0 1 -${r},${r} h -${w - r} z`;
    case 'preparation': {
      const inset = Math.min(15, w / 4);
      return `M ${inset},0 L ${w - inset},0 L ${w},${h / 2} L ${w - inset},${h} L ${inset},${h} L 0,${h / 2} z`;
    }
    case 'display': {
      const arc = Math.min(20, h / 2);
      return `M 0,0 h ${w - arc} a ${arc},${arc} 0 0 1 ${arc},${arc} v ${h - 2 * arc} a ${arc},${arc} 0 0 1 -${arc},${arc} h -${w - arc} z`;
    }
    case 'manualInput':
      return `M 0,0 L ${w},0 L ${w - skew},${h} L 0,${h} z`;
    case 'document':
      return `M 0,0 h ${w} v ${h - 15} c -${w / 3},15 -${(2 * w) / 3},15 -${w},0 z`;
    case 'storedData': {
      const dw = Math.min(20, w / 4);
      return `M ${dw},0 h ${w - dw} v ${h} h -${w - dw} a ${dw},${h / 2} 0 0 1 -${dw},-${h / 2} v -${h / 2} a ${dw},${h / 2} 0 0 1 ${dw},-${h / 2} z`;
    }
    case 'merge':
      return `M 0,0 L ${w},0 L ${w / 2},${h} z`;
    case 'offPage':
      return `M 0,0 h ${w} v ${h - 15} L ${w / 2},${h} L 0,${h - 15} z`;
    case 'startEvent':
    case 'gateway':
      return `M ${w / 2},0 L ${w},${h / 2} L ${w / 2},${h} L 0,${h / 2} z`;
    case 'task':
      return `M 0,0 h ${w} v ${h} h -${w} z`;
    case 'dataObject':
      return `M 0,0 h ${w - 15} l 15,15 v ${h - 15} h -${w} z`;
    case 'process':
    default:
      return `M 0,0 h ${w} v ${h} h -${w} z`;
  }
}

export function NodeRenderer({
  node,
  isSelected,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragMove,
  onDragEnd,
}: NodeRendererProps) {
  const { x, y, width, height, label, style } = node;
  const fill = style.fill ?? '#ffffff';
  const stroke = style.stroke ?? '#334155';
  const strokeWidth = style.strokeWidth ?? 2;
  const fontSize = style.fontSize ?? 14;
  const textColor = style.textColor ?? '#0f172a';
  const path = buildPath(node.type, width, height);

  return (
    <Group
      x={x}
      y={y}
      draggable
      onClick={(event) => {
        event.cancelBubble = true;
        onClick?.();
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        onClick?.();
      }}
      onDblClick={(event) => {
        event.cancelBubble = true;
        onDoubleClick?.();
      }}
      onDragStart={onDragStart}
      onDragMove={(event) => {
        const pos = event.target.position();
        onDragMove?.(pos.x, pos.y);
      }}
      onDragEnd={(event) => {
        const pos = event.target.position();
        onDragEnd?.(pos.x, pos.y);
      }}
    >
      {node.type === 'process' ? (
        <Rect
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : (
        <Path
          data={path}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}
      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={width + 8}
          height={height + 8}
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[4, 4]}
          listening={false}
        />
      )}
      {label && (
        <Text
          width={width}
          height={height}
          text={label}
          fontSize={fontSize}
          fill={textColor}
          align="center"
          verticalAlign="middle"
          wrap="word"
          listening={false}
        />
      )}
    </Group>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/flowchart/NodeRenderer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/NodeRenderer.tsx src/components/flowchart/NodeRenderer.test.tsx
git commit -m "feat(canvas): add flowchart node renderer with symbols and labels"
```

---

### Task 9: Edge renderer

**Files:**
- Create: `src/components/flowchart/EdgeRenderer.tsx`
- Test: `src/components/flowchart/EdgeRenderer.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Stage, Layer } from 'react-konva';
import { EdgeRenderer } from './EdgeRenderer';
import type { FlowchartEdge, FlowchartNode } from '@/types/flowchart';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <Stage width={400} height={400}>
      <Layer>{children}</Layer>
    </Stage>
  );
}

describe('EdgeRenderer', () => {
  const nodes: Record<string, FlowchartNode> = {
    a: { id: 'a', type: 'process', x: 0, y: 0, width: 100, height: 60, style: {} },
    b: { id: 'b', type: 'process', x: 200, y: 150, width: 100, height: 60, style: {} },
  };

  const edge: FlowchartEdge = {
    id: 'e1',
    fromNodeId: 'a',
    toNodeId: 'b',
    fromPort: 'right',
    toPort: 'left',
    style: {},
  };

  it('renders without crashing', () => {
    render(
      <Wrapper>
        <EdgeRenderer edge={edge} nodes={nodes} />
      </Wrapper>
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/flowchart/EdgeRenderer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Arrow, Group, Text } from 'react-konva';
import type { FlowchartEdge, FlowchartNode } from '@/types/flowchart';
import { computeOrthogonalPath } from '@/utils/orthogonalRouter';

interface EdgeRendererProps {
  edge: FlowchartEdge;
  nodes: Record<string, FlowchartNode>;
  isSelected?: boolean;
  onClick?: () => void;
}

export function EdgeRenderer({
  edge,
  nodes,
  isSelected,
  onClick,
}: EdgeRendererProps) {
  const source = nodes[edge.fromNodeId];
  const target = nodes[edge.toNodeId];
  if (!source || !target) return null;

  const points = computeOrthogonalPath(
    source,
    edge.fromPort,
    target,
    edge.toPort
  );

  const stroke = edge.style.stroke ?? '#334155';
  const strokeWidth = edge.style.strokeWidth ?? 2;
  const dash = edge.style.dash;
  const hasArrow = edge.style.arrowhead !== 'none';

  const midX = points[points.length - 4] ?? points[0];
  const midY = points[points.length - 3] ?? points[1];

  return (
    <Group
      onClick={(event) => {
        event.cancelBubble = true;
        onClick?.();
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        onClick?.();
      }}
    >
      <Arrow
        points={points}
        stroke={isSelected ? '#3b82f6' : stroke}
        strokeWidth={strokeWidth}
        dash={dash}
        fill={stroke}
        pointerLength={hasArrow ? 10 : 0}
        pointerWidth={hasArrow ? 10 : 0}
        pointerAtEnding={hasArrow}
        listening={false}
      />
      {edge.label && (
        <Text
          x={midX - 40}
          y={midY - 10}
          width={80}
          text={edge.label}
          fontSize={12}
          fill={stroke}
          align="center"
          listening={false}
        />
      )}
    </Group>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/flowchart/EdgeRenderer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/EdgeRenderer.tsx src/components/flowchart/EdgeRenderer.test.tsx
git commit -m "feat(canvas): add orthogonal edge renderer with arrowheads"
```

---

### Task 10: Port handles

**Files:**
- Create: `src/components/flowchart/PortHandles.tsx`
- Test: `src/components/flowchart/PortHandles.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Stage, Layer } from 'react-konva';
import { PortHandles } from './PortHandles';
import type { FlowchartNode } from '@/types/flowchart';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <Stage width={400} height={400}>
      <Layer>{children}</Layer>
    </Stage>
  );
}

describe('PortHandles', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    style: {},
  };

  it('renders four port handles', () => {
    render(
      <Wrapper>
        <PortHandles node={node} visible onDragStart={() => {}} />
      </Wrapper>
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/flowchart/PortHandles.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Circle, Group } from 'react-konva';
import type { FlowchartNode, PortId } from '@/types/flowchart';
import { getPortPoint } from '@/utils/portGeometry';

interface PortHandlesProps {
  node: FlowchartNode;
  visible: boolean;
  onDragStart: (port: PortId, x: number, y: number) => void;
}

const PORTS: PortId[] = ['top', 'right', 'bottom', 'left'];

export function PortHandles({ node, visible, onDragStart }: PortHandlesProps) {
  if (!visible) return null;

  return (
    <Group>
      {PORTS.map((port) => {
        const point = getPortPoint(node, port);
        return (
          <Circle
            key={port}
            x={point.x}
            y={point.y}
            radius={5}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2}
            draggable
            onMouseDown={(event) => event.cancelBubble = true}
            onTouchStart={(event) => event.cancelBubble = true}
            onDragStart={() => onDragStart(port, point.x, point.y)}
          />
        );
      })}
    </Group>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/flowchart/PortHandles.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/PortHandles.tsx src/components/flowchart/PortHandles.test.tsx
git commit -m "feat(canvas): add node port drag handles"
```

---

### Task 11: Draft layer

**Files:**
- Create: `src/components/flowchart/DraftLayer.tsx`
- Test: `src/components/flowchart/DraftLayer.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Stage, Layer } from 'react-konva';
import { DraftLayer } from './DraftLayer';
import type { FlowchartNode } from '@/types/flowchart';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <Stage width={400} height={400}>
      <Layer>{children}</Layer>
    </Stage>
  );
}

describe('DraftLayer', () => {
  const node: FlowchartNode = {
    id: 'draft',
    type: 'process',
    x: 50,
    y: 50,
    width: 100,
    height: 60,
    style: {},
  };

  it('renders a draft node', () => {
    render(
      <Wrapper>
        <DraftLayer draftNode={node} />
      </Wrapper>
    );
  });

  it('renders a draft edge', () => {
    render(
      <Wrapper>
        <DraftLayer draftEdgePoints={[0, 0, 100, 100]} />
      </Wrapper>
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/flowchart/DraftLayer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Arrow, Rect } from 'react-konva';
import type { FlowchartNode } from '@/types/flowchart';
import { NodeRenderer } from './NodeRenderer';

interface DraftLayerProps {
  draftNode?: FlowchartNode | null;
  draftEdgePoints?: number[] | null;
}

export function DraftLayer({ draftNode, draftEdgePoints }: DraftLayerProps) {
  return (
    <>
      {draftNode && (
        <NodeRenderer
          node={draftNode}
          onClick={() => {}}
          onDragStart={() => {}}
          onDragMove={() => {}}
          onDragEnd={() => {}}
        />
      )}
      {draftEdgePoints && (
        <>
          <Arrow
            points={draftEdgePoints}
            stroke="#3b82f6"
            strokeWidth={2}
            dash={[4, 4]}
            fill="#3b82f6"
            pointerLength={10}
            pointerWidth={10}
            pointerAtEnding
            listening={false}
          />
          <Rect
            x={draftEdgePoints[draftEdgePoints.length - 2] - 4}
            y={draftEdgePoints[draftEdgePoints.length - 1] - 4}
            width={8}
            height={8}
            fill="#3b82f6"
            listening={false}
          />
        </>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/flowchart/DraftLayer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/DraftLayer.tsx src/components/flowchart/DraftLayer.test.tsx
git commit -m "feat(canvas): add draft node and edge preview layer"
```

---

### Task 12: Flowchart canvas

**Files:**
- Create: `src/components/flowchart/FlowchartCanvas.tsx`
- Test: `src/components/flowchart/FlowchartCanvas.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FlowchartCanvas } from './FlowchartCanvas';
import { useFlowchartStore } from '@/store/flowchartStore';
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  useFlowchartStore.setState({
    nodes: {},
    edges: {},
    selection: null,
    tool: 'select',
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    showGrid: true,
    snap: true,
    editingNodeId: null,
    undoStack: [],
    redoStack: [],
  });
});

describe('FlowchartCanvas', () => {
  it('renders the canvas', () => {
    const { container } = render(<FlowchartCanvas />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/flowchart/FlowchartCanvas.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useEffect, useRef, useState } from 'react';
import { Layer, Stage } from 'react-konva';
import type Konva from 'konva';
import type { FlowchartNode, FlowchartTool, PortId } from '@/types/flowchart';
import { useFlowchartStore } from '@/store/flowchartStore';
import { GridBackground } from '@/components/GridBackground';
import { computeOrthogonalPath } from '@/utils/orthogonalRouter';
import { getDefaultNodeSize, getPortPoint } from '@/utils/portGeometry';
import { snapPoint, computeSmartGuides } from '@/utils/snapEngine';
import { NodeRenderer } from './NodeRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import { PortHandles } from './PortHandles';
import { DraftLayer } from './DraftLayer';
import { LabelEditor } from './LabelEditor';

const GRID_SIZE = 20;

export function FlowchartCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

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
    setSelection,
    setViewport,
    setEditingNodeId,
    updateNode,
  } = useFlowchartStore();

  const [draftNode, setDraftNode] = useState<FlowchartNode | null>(null);
  const [draftEdge, setDraftEdge] = useState<{
    fromNodeId: string;
    fromPort: PortId;
    points: number[];
  } | null>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function pointerToCanvas(pointer: { x: number; y: number }) {
    return {
      x: (pointer.x - viewport.offsetX) / viewport.scale,
      y: (pointer.y - viewport.offsetY) / viewport.scale,
    };
  }

  function getPointerPosition() {
    const stage = stageRef.current;
    if (!stage) return null;
    return pointerToCanvas(stage.getPointerPosition() ?? { x: 0, y: 0 });
  }

  function snapPosition(x: number, y: number) {
    if (!snap) return { x, y };
    return snapPoint(x, y, GRID_SIZE);
  }

  function nodeAtPoint(point: { x: number; y: number }, excludeId?: string) {
    for (const node of Object.values(nodes)) {
      if (node.id === excludeId) continue;
      if (
        point.x >= node.x &&
        point.x <= node.x + node.width &&
        point.y >= node.y &&
        point.y <= node.y + node.height
      ) {
        return node;
      }
    }
    return null;
  }

  function closestPort(node: FlowchartNode, point: { x: number; y: number }): PortId {
    const ports: PortId[] = ['top', 'right', 'bottom', 'left'];
    let best: PortId = 'top';
    let bestDist = Infinity;
    for (const port of ports) {
      const p = getPortPoint(node, port);
      const dist = Math.hypot(p.x - point.x, p.y - point.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = port;
      }
    }
    return best;
  }

  function handleMouseMove() {
    const point = getPointerPosition();
    if (!point) return;

    if (draftEdge) {
      const source = nodes[draftEdge.fromNodeId];
      if (!source) return;
      const sourcePoint = getPortPoint(source, draftEdge.fromPort);
      const targetSnap = snapPosition(point.x, point.y);
      const preview = computeOrthogonalPath(
        source,
        draftEdge.fromPort,
        {
          id: 'preview',
          type: 'process',
          x: targetSnap.x - 1,
          y: targetSnap.y - 1,
          width: 2,
          height: 2,
          style: {},
        },
        'top'
      );
      setDraftEdge({ ...draftEdge, points: preview });
      return;
    }

    if (panning) {
      const dx = point.x - panStart.current.x;
      const dy = point.y - panStart.current.y;
      setViewport({
        ...viewport,
        offsetX: viewport.offsetX + dx * viewport.scale,
        offsetY: viewport.offsetY + dy * viewport.scale,
      });
      return;
    }

    if (isNodeTool(tool)) {
      const size = getDefaultNodeSize(tool);
      const snapped = snapPosition(point.x - size.width / 2, point.y - size.height / 2);
      setDraftNode({
        id: 'draft',
        type: tool,
        x: snapped.x,
        y: snapped.y,
        width: size.width,
        height: size.height,
        label: '',
        style: {
          fill: '#ffffff',
          stroke: '#334155',
          strokeWidth: 2,
          fontSize: 14,
          textColor: '#0f172a',
        },
      });
    }
  }

  function handleMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    if (event.target !== stageRef.current) return;
    if (tool === 'select') {
      setPanning(true);
      const point = getPointerPosition();
      if (point) panStart.current = point;
    }
  }

  function handleMouseUp() {
    if (draftEdge) {
      const point = getPointerPosition();
      if (point) {
        const target = nodeAtPoint(point, draftEdge.fromNodeId);
        if (target) {
          const toPort = closestPort(target, point);
          addEdge(draftEdge.fromNodeId, draftEdge.fromPort, target.id, toPort);
        }
      }
      setDraftEdge(null);
      return;
    }

    setPanning(false);
  }

  function handleStageClick() {
    const point = getPointerPosition();
    if (!point) return;

    if (isNodeTool(tool)) {
      const size = getDefaultNodeSize(tool);
      const snapped = snapPosition(point.x - size.width / 2, point.y - size.height / 2);
      const node = {
        id: crypto.randomUUID(),
        type: tool,
        x: snapped.x,
        y: snapped.y,
        width: size.width,
        height: size.height,
        label: '',
        style: {
          fill: '#ffffff',
          stroke: '#334155',
          strokeWidth: 2,
          fontSize: 14,
          textColor: '#0f172a',
        },
      };
      addNode(node);
      setDraftNode(null);
      return;
    }

    if (tool === 'select') {
      setSelection(null);
    }
  }

  function handleWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    event.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const worldBefore = pointerToCanvas(pointer);
    const newScale = Math.min(
      Math.max(viewport.scale * (event.evt.deltaY < 0 ? 1.1 : 0.9), 0.1),
      4
    );
    const offsetX = pointer.x - worldBefore.x * newScale;
    const offsetY = pointer.y - worldBefore.y * newScale;
    setViewport({ scale: newScale, offsetX, offsetY });
  }

  function handleNodeDragMove(id: string, x: number, y: number) {
    const node = nodes[id];
    if (!node) return;
    let nextX = x;
    let nextY = y;
    if (snap) {
      const guides = computeSmartGuides(
        { ...node, x: nextX, y: nextY },
        Object.values(nodes).filter((n) => n.id !== id),
        8
      );
      nextX += guides.dx ?? 0;
      nextY += guides.dy ?? 0;
      nextX = Math.round(nextX / GRID_SIZE) * GRID_SIZE;
      nextY = Math.round(nextY / GRID_SIZE) * GRID_SIZE;
    }
    liveMoveNode(id, { x: nextX, y: nextY });
  }

  function handleNodeDragEnd(id: string, x: number, y: number) {
    moveNode(id, { x, y });
  }

  function handlePortDragStart(nodeId: string, port: PortId) {
    const source = nodes[nodeId];
    if (!source) return;
    const point = getPortPoint(source, port);
    setDraftEdge({
      fromNodeId: nodeId,
      fromPort: port,
      points: [point.x, point.y, point.x, point.y],
    });
  }

  const selectedNodeId = selection?.type === 'node' ? selection.id : null;
  const selectedEdgeId = selection?.type === 'edge' ? selection.id : null;

  return (
    <div ref={containerRef} className="absolute inset-0">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.offsetX}
        y={viewport.offsetY}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
        onWheel={handleWheel}
        draggable={false}
      >
        <GridBackground
          viewport={viewport}
          visible={showGrid}
          width={size.width}
          height={size.height}
        />

        <Layer>
          {Object.values(edges).map((edge) => (
            <EdgeRenderer
              key={edge.id}
              edge={edge}
              nodes={nodes}
              isSelected={edge.id === selectedEdgeId}
              onClick={() => setSelection({ type: 'edge', id: edge.id })}
            />
          ))}
        </Layer>

        <Layer>
          {Object.values(nodes).map((node) => (
            <NodeRenderer
              key={node.id}
              node={node}
              isSelected={node.id === selectedNodeId}
              onClick={() => setSelection({ type: 'node', id: node.id })}
              onDoubleClick={() => setEditingNodeId(node.id)}
              onDragMove={(x, y) => handleNodeDragMove(node.id, x, y)}
              onDragEnd={(x, y) => handleNodeDragEnd(node.id, x, y)}
            />
          ))}
          {selectedNodeId && nodes[selectedNodeId] && (
            <PortHandles
              node={nodes[selectedNodeId]}
              visible
              onDragStart={(port) => handlePortDragStart(selectedNodeId, port)}
            />
          )}
          <DraftLayer draftNode={draftNode} draftEdgePoints={draftEdge?.points ?? null} />
        </Layer>
      </Stage>

      {editingNodeId && nodes[editingNodeId] && (
        <LabelEditor
          node={nodes[editingNodeId]}
          viewport={viewport}
          onCommit={(label) => {
            updateNode(editingNodeId, { label });
            setEditingNodeId(null);
          }}
          onCancel={() => setEditingNodeId(null)}
        />
      )}
    </div>
  );
}

function isNodeTool(tool: FlowchartTool): tool is FlowchartNode['type'] {
  return tool !== 'select' && tool !== 'connector';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/flowchart/FlowchartCanvas.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/FlowchartCanvas.tsx src/components/flowchart/FlowchartCanvas.test.tsx
git commit -m "feat(canvas): add flowchart canvas with interactions, pan, zoom, and drafting"
```

---

### Task 13: Label editor overlay

**Files:**
- Create: `src/components/flowchart/LabelEditor.tsx`
- Test: `src/components/flowchart/LabelEditor.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LabelEditor } from './LabelEditor';
import type { FlowchartNode } from '@/types/flowchart';

describe('LabelEditor', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 0,
    y: 0,
    width: 140,
    height: 80,
    label: 'Old',
    style: {},
  };

  it('commits edited label on blur', () => {
    const onCommit = vi.fn();
    render(
      <LabelEditor
        node={node}
        viewport={{ scale: 1, offsetX: 0, offsetY: 0 }}
        onCommit={onCommit}
        onCancel={() => {}}
      />
    );
    const input = screen.getByDisplayValue('Old');
    fireEvent.change(input, { target: { value: 'New' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith('New');
  });

  it('cancels on Escape', () => {
    const onCancel = vi.fn();
    render(
      <LabelEditor
        node={node}
        viewport={{ scale: 1, offsetX: 0, offsetY: 0 }}
        onCommit={() => {}}
        onCancel={onCancel}
      />
    );
    const input = screen.getByDisplayValue('Old');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/flowchart/LabelEditor.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useEffect, useRef, useState } from 'react';
import type { FlowchartNode, Viewport } from '@/types/flowchart';

interface LabelEditorProps {
  node: FlowchartNode;
  viewport: Viewport;
  onCommit: (label: string) => void;
  onCancel: () => void;
}

export function LabelEditor({ node, viewport, onCommit, onCancel }: LabelEditorProps) {
  const [value, setValue] = useState(node.label ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const screenX = node.x * viewport.scale + viewport.offsetX;
  const screenY = node.y * viewport.scale + viewport.offsetY;
  const width = node.width * viewport.scale;
  const height = node.height * viewport.scale;

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onCancel();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onCommit(value);
    }
  }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={handleKeyDown}
      className="absolute z-50 resize-none overflow-hidden border border-blue-500 bg-white p-1 text-center text-sm outline-none dark:bg-slate-900"
      style={{
        left: screenX,
        top: screenY,
        width,
        height,
        color: node.style.textColor ?? '#0f172a',
        fontSize: (node.style.fontSize ?? 14) * viewport.scale,
      }}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/flowchart/LabelEditor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/LabelEditor.tsx src/components/flowchart/LabelEditor.test.tsx
git commit -m "feat(canvas): add inline label editor overlay"
```

---

### Task 14: Toolbar and symbol palette

**Files:**
- Create: `src/components/flowchart/LeftToolbar.tsx`
- Create: `src/components/flowchart/SymbolPalette.tsx`
- Test: `src/components/flowchart/LeftToolbar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftToolbar } from './LeftToolbar';
import { useFlowchartStore } from '@/store/flowchartStore';
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  useFlowchartStore.setState({
    nodes: {},
    edges: {},
    selection: null,
    tool: 'select',
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    showGrid: true,
    snap: true,
    editingNodeId: null,
    undoStack: [],
    redoStack: [],
  });
});

describe('LeftToolbar', () => {
  it('switches to process tool when clicked', () => {
    render(<LeftToolbar />);
    fireEvent.click(screen.getByLabelText('Process'));
    expect(useFlowchartStore.getState().tool).toBe('process');
  });

  it('opens the symbol palette', () => {
    render(<LeftToolbar />);
    fireEvent.click(screen.getByLabelText('More symbols'));
    expect(screen.getByText('Advanced')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/flowchart/LeftToolbar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`src/components/flowchart/SymbolPalette.tsx`:

```tsx
import {
  BASIC_TOOLBAR_TYPES,
  ADVANCED_PALETTE_TYPES,
  BPMN_PALETTE_TYPES,
  type FlowchartNodeType,
} from '@/types/flowchart';

interface SymbolPaletteProps {
  onSelect: (type: FlowchartNodeType) => void;
}

function SymbolButton({
  type,
  onClick,
}: {
  type: FlowchartNodeType;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded border px-2 py-1 text-xs hover:bg-accent"
      aria-label={type}
    >
      {type}
    </button>
  );
}

export function SymbolPalette({ onSelect }: SymbolPaletteProps) {
  return (
    <div className="absolute left-16 top-1/2 z-30 w-56 -translate-y-1/2 rounded-lg border bg-background p-3 shadow-md">
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        Basic
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {BASIC_TOOLBAR_TYPES.map((type) => (
          <SymbolButton key={type} type={type} onClick={() => onSelect(type)} />
        ))}
      </div>
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        Advanced
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {ADVANCED_PALETTE_TYPES.map((type) => (
          <SymbolButton key={type} type={type} onClick={() => onSelect(type)} />
        ))}
      </div>
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        BPMN
      </div>
      <div className="flex flex-wrap gap-1">
        {BPMN_PALETTE_TYPES.map((type) => (
          <SymbolButton key={type} type={type} onClick={() => onSelect(type)} />
        ))}
      </div>
    </div>
  );
}
```

`src/components/flowchart/LeftToolbar.tsx`:

```tsx
import { useState } from 'react';
import { MousePointer2, Plus } from 'lucide-react';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { useFlowchartStore } from '@/store/flowchartStore';
import { BASIC_TOOLBAR_TYPES, type FlowchartNodeType } from '@/types/flowchart';
import { SymbolPalette } from './SymbolPalette';

const PRIMARY_TOOLS: { value: FlowchartNodeType | 'select' | 'connector'; label: string; icon: React.ReactNode }[] = [
  { value: 'select', label: 'Select', icon: <MousePointer2 className="h-4 w-4" /> },
  { value: 'process', label: 'Process', icon: <span className="text-xs">▭</span> },
  { value: 'decision', label: 'Decision', icon: <span className="text-xs">◊</span> },
  { value: 'data', label: 'Data', icon: <span className="text-xs">▱</span> },
  { value: 'terminal', label: 'Terminal', icon: <span className="text-xs">⬭</span> },
  { value: 'connector', label: 'Connector', icon: <span className="text-xs">→</span> },
];

export function LeftToolbar() {
  const tool = useFlowchartStore((state) => state.tool);
  const setTool = useFlowchartStore((state) => state.setTool);
  const [paletteOpen, setPaletteOpen] = useState(false);

  function selectTool(value: string) {
    if (!value) return;
    setTool(value as FlowchartNodeType | 'select' | 'connector');
    setPaletteOpen(false);
  }

  function selectPaletteType(type: FlowchartNodeType) {
    setTool(type);
    setPaletteOpen(false);
  }

  return (
    <aside className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-lg border bg-background p-1 shadow-md">
      <ToggleGroup
        type="single"
        value={tool}
        onValueChange={selectTool}
        className="flex-col"
        aria-label="Flowchart tools"
      >
        {PRIMARY_TOOLS.map((item) => (
          <ToggleGroupItem
            key={item.value}
            value={item.value}
            aria-label={item.label}
          >
            {item.icon}
          </ToggleGroupItem>
        ))}
        <ToggleGroupItem
          value="more"
          aria-label="More symbols"
          onClick={() => setPaletteOpen((open) => !open)}
        >
          <Plus className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
      {paletteOpen && <SymbolPalette onSelect={selectPaletteType} />}
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/flowchart/LeftToolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/LeftToolbar.tsx src/components/flowchart/SymbolPalette.tsx src/components/flowchart/LeftToolbar.test.tsx
git commit -m "feat(ui): add left toolbar and expandable symbol palette"
```

---

### Task 15: Properties panel

**Files:**
- Create: `src/components/flowchart/PropertiesPanel.tsx`
- Test: `src/components/flowchart/PropertiesPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { useFlowchartStore } from '@/store/flowchartStore';
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  useFlowchartStore.setState({
    nodes: {
      n1: {
        id: 'n1',
        type: 'process',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
        label: 'Step',
        style: { fill: '#ffffff', stroke: '#000000', strokeWidth: 2 },
      },
    },
    edges: {},
    selection: { type: 'node', id: 'n1' },
    tool: 'select',
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    showGrid: true,
    snap: true,
    editingNodeId: null,
    undoStack: [],
    redoStack: [],
  });
});

describe('PropertiesPanel', () => {
  it('updates the node label', () => {
    render(<PropertiesPanel />);
    const input = screen.getByDisplayValue('Step');
    fireEvent.change(input, { target: { value: 'Updated' } });
    fireEvent.blur(input);
    expect(useFlowchartStore.getState().nodes['n1'].label).toBe('Updated');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/flowchart/PropertiesPanel.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFlowchartStore } from '@/store/flowchartStore';

export function PropertiesPanel() {
  const {
    nodes,
    edges,
    selection,
    showGrid,
    snap,
    updateNode,
    updateEdge,
    setShowGrid,
    setSnap,
  } = useFlowchartStore();

  if (!selection) {
    return (
      <aside className="absolute right-3 top-16 z-20 w-60 rounded-lg border bg-background p-3 shadow-md">
        <h3 className="mb-3 text-sm font-semibold">Canvas</h3>
        <div className="flex items-center justify-between py-1">
          <Label htmlFor="grid">Show grid</Label>
          <Switch id="grid" checked={showGrid} onCheckedChange={setShowGrid} />
        </div>
        <div className="flex items-center justify-between py-1">
          <Label htmlFor="snap">Snap to grid</Label>
          <Switch id="snap" checked={snap} onCheckedChange={setSnap} />
        </div>
      </aside>
    );
  }

  if (selection.type === 'node') {
    const node = nodes[selection.id];
    if (!node) return null;

    return (
      <aside className="absolute right-3 top-16 z-20 w-60 rounded-lg border bg-background p-3 shadow-md">
        <h3 className="mb-3 text-sm font-semibold">Node</h3>
        <div className="mb-3">
          <Label htmlFor="node-label">Label</Label>
          <Input
            id="node-label"
            value={node.label ?? ''}
            onChange={(event) =>
              updateNode(node.id, { label: event.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="node-width">W</Label>
            <Input
              id="node-width"
              type="number"
              value={node.width}
              onChange={(event) =>
                updateNode(node.id, { width: Number(event.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="node-height">H</Label>
            <Input
              id="node-height"
              type="number"
              value={node.height}
              onChange={(event) =>
                updateNode(node.id, { height: Number(event.target.value) })
              }
            />
          </div>
        </div>
      </aside>
    );
  }

  const edge = edges[selection.id];
  if (!edge) return null;

  return (
    <aside className="absolute right-3 top-16 z-20 w-60 rounded-lg border bg-background p-3 shadow-md">
      <h3 className="mb-3 text-sm font-semibold">Edge</h3>
      <div className="mb-3">
        <Label htmlFor="edge-label">Label</Label>
        <Input
          id="edge-label"
          value={edge.label ?? ''}
          onChange={(event) => updateEdge(edge.id, { label: event.target.value })}
        />
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/flowchart/PropertiesPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/PropertiesPanel.tsx src/components/flowchart/PropertiesPanel.test.tsx
git commit -m "feat(ui): add context-aware properties panel"
```

---

### Task 16: Top bar

**Files:**
- Create: `src/components/flowchart/TopBar.tsx`
- Test: `src/components/flowchart/TopBar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from './TopBar';
import { useFlowchartStore } from '@/store/flowchartStore';
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  useFlowchartStore.setState({
    nodes: {},
    edges: {},
    selection: null,
    tool: 'select',
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    showGrid: true,
    snap: true,
    editingNodeId: null,
    undoStack: [],
    redoStack: [],
  });
});

describe('TopBar', () => {
  it('zooms in when clicked', () => {
    render(<TopBar />);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(useFlowchartStore.getState().viewport.scale).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/flowchart/TopBar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFlowchartStore } from '@/store/flowchartStore';

export function TopBar() {
  const {
    selection,
    undoStack,
    redoStack,
    undo,
    redo,
    removeNode,
    removeEdge,
    setSelection,
    setViewport,
    viewport,
  } = useFlowchartStore();

  function handleDelete() {
    if (selection?.type === 'node') {
      removeNode(selection.id);
    } else if (selection?.type === 'edge') {
      removeEdge(selection.id);
    }
    setSelection(null);
  }

  function zoomIn() {
    setViewport({ ...viewport, scale: Math.min(viewport.scale * 1.1, 4) });
  }

  function zoomOut() {
    setViewport({ ...viewport, scale: Math.max(viewport.scale / 1.1, 0.1) });
  }

  function fitToContent() {
    setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
  }

  return (
    <header className="absolute left-3 right-3 top-3 z-20 flex items-center justify-between rounded-lg border bg-background p-2 shadow-md">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Flowchart</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={undo} disabled={undoStack.length === 0} aria-label="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={redo} disabled={redoStack.length === 0} aria-label="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={!selection}
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={zoomIn} aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={zoomOut} aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={fitToContent} aria-label="Fit to content">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/flowchart/TopBar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/TopBar.tsx src/components/flowchart/TopBar.test.tsx
git commit -m "feat(ui): add top bar with undo/redo/delete/zoom"
```

---

### Task 17: Minimap

**Files:**
- Create: `src/components/flowchart/Minimap.tsx`
- Test: `src/components/flowchart/Minimap.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Minimap } from './Minimap';
import { useFlowchartStore } from '@/store/flowchartStore';
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  useFlowchartStore.setState({
    nodes: {
      n1: { id: 'n1', type: 'process', x: 0, y: 0, width: 100, height: 60, style: {} },
    },
    edges: {},
    selection: null,
    tool: 'select',
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    showGrid: true,
    snap: true,
    editingNodeId: null,
    undoStack: [],
    redoStack: [],
  });
});

describe('Minimap', () => {
  it('renders a canvas', () => {
    const { container } = render(<Minimap />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/flowchart/Minimap.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useEffect, useRef } from 'react';
import { useFlowchartStore } from '@/store/flowchartStore';

const WIDTH = 160;
const HEIGHT = 120;
const PADDING = 8;

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { nodes, edges, viewport } = useFlowchartStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const nodeList = Object.values(nodes);
    if (nodeList.length === 0) return;

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

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      -viewport.offsetX * scale + offsetX,
      -viewport.offsetY * scale + offsetY,
      (WIDTH / viewport.scale) * scale,
      (HEIGHT / viewport.scale) * scale
    );
  }, [nodes, edges, viewport]);

  return (
    <div className="absolute bottom-3 right-3 z-20 rounded-lg border bg-background p-1 shadow-md">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/flowchart/Minimap.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/Minimap.tsx src/components/flowchart/Minimap.test.tsx
git commit -m "feat(ui): add minimap for flowchart graph"
```

---

### Task 18: Board store, board page, and app wiring

**Files:**
- Modify: `src/store/boardStore.ts`
- Test: `src/store/boardStore.test.ts`
- Modify: `src/pages/BoardPage.tsx`
- Test: `src/pages/BoardPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Replace `src/store/boardStore.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteBoard as deleteBoardRecord,
  loadBoards,
  putBoard,
} from '@/db/boardDb';
import { initBoardStore, useBoardStore } from './boardStore';
import type { FlowchartNode } from '@/types/flowchart';

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
        nodes: {},
        edges: {},
      },
    ]);

    await initBoardStore();

    expect(useBoardStore.getState()).toMatchObject({
      currentBoardId: null,
      boards: [{ id: 'existing-id', name: 'Existing' }],
    });
  });

  it('clears nodes and edges for legacy boards with shapes', async () => {
    mockedLoadBoards.mockResolvedValue([
      {
        id: 'legacy-board',
        name: 'Legacy',
        createdAt: 1,
        updatedAt: 2,
        shapes: { r1: { id: 'r1', type: 'rect' } },
      } as never,
    ]);

    await initBoardStore();

    const board = useBoardStore.getState().boards[0];
    expect(board.nodes).toEqual({});
    expect(board.edges).toEqual({});
  });

  it('creates a board and writes only that board', () => {
    const id = useBoardStore.getState().createBoard('My board');
    const board = useBoardStore.getState().boards[0];

    expect(board).toMatchObject({
      id,
      name: 'My board',
      nodes: {},
      edges: {},
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

  it('saves only the active board with its new graph and timestamp', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValue(300);
    const id = useBoardStore.getState().createBoard('Diagram');
    mockedPutBoard.mockClear();

    const node: FlowchartNode = {
      id: 'n1',
      type: 'process',
      x: 10,
      y: 20,
      width: 100,
      height: 60,
      style: {},
    };
    useBoardStore.getState().saveCurrentBoard({ nodes: { n1: node }, edges: {} });

    const board = useBoardStore.getState().boards[0];
    expect(board).toMatchObject({
      id,
      updatedAt: 300,
      nodes: {
        n1: {
          type: 'process',
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/boardStore.test.ts`
Expected: FAIL — `nodes`/`edges` properties missing.

- [ ] **Step 3: Write minimal implementation**

Update `src/store/boardStore.ts`:

```ts
import { create } from 'zustand';
import {
  deleteBoard as deleteBoardRecord,
  loadBoards,
  putBoard,
} from '@/db/boardDb';
import type { FlowchartEdge, FlowchartGraph, FlowchartNode } from '@/types/flowchart';

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: Record<string, FlowchartNode>;
  edges: Record<string, FlowchartEdge>;
}

interface BoardState {
  boards: Board[];
  currentBoardId: string | null;
  createBoard: (name?: string) => string;
  openBoard: (id: string) => void;
  closeBoard: () => void;
  renameBoard: (id: string, name: string) => void;
  deleteBoard: (id: string) => void;
  saveCurrentBoard: (graph: FlowchartGraph) => void;
}

function ignorePersistenceError(promise: Promise<void>): void {
  void promise.catch(() => undefined);
}

function normalizeBoard(board: Board & { shapes?: unknown }): Board {
  const hasLegacyShapes =
    board.shapes &&
    typeof board.shapes === 'object' &&
    Object.keys(board.shapes as Record<string, unknown>).length > 0;

  return {
    ...board,
    nodes: hasLegacyShapes ? {} : (board.nodes ?? {}),
    edges: hasLegacyShapes ? {} : (board.edges ?? {}),
  };
}

export async function initBoardStore(): Promise<void> {
  const boards = await loadBoards();
  useBoardStore.setState({ boards: boards.map(normalizeBoard) });
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoardId: null,
  createBoard: (name) => {
    const id = crypto.randomUUID();
    const board: Board = {
      id,
      name: name?.trim() || 'Untitled board',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: {},
      edges: {},
    };
    set({ boards: [...get().boards, board], currentBoardId: id });
    ignorePersistenceError(putBoard(board));
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
    const existing = get().boards.find((board) => board.id === id);
    if (!existing) return;
    const updatedBoard = { ...existing, name: trimmed, updatedAt: Date.now() };
    set({
      boards: get().boards.map((board) =>
        board.id === id ? updatedBoard : board
      ),
    });
    ignorePersistenceError(putBoard(updatedBoard));
  },
  deleteBoard: (id) => {
    const current = get().currentBoardId;
    set({
      boards: get().boards.filter((board) => board.id !== id),
      currentBoardId: current === id ? null : current,
    });
    ignorePersistenceError(deleteBoardRecord(id));
  },
  saveCurrentBoard: (graph) => {
    const id = get().currentBoardId;
    if (!id) return;
    const existing = get().boards.find((board) => board.id === id);
    if (!existing) return;
    const updatedBoard = {
      ...existing,
      ...graph,
      updatedAt: Date.now(),
    };
    set({
      boards: get().boards.map((board) =>
        board.id === id ? updatedBoard : board
      ),
    });
    ignorePersistenceError(putBoard(updatedBoard));
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/boardStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the board page**

```tsx
import { useEffect, useState } from 'react';
import { FlowchartCanvas } from '@/components/flowchart/FlowchartCanvas';
import { LeftToolbar } from '@/components/flowchart/LeftToolbar';
import { Minimap } from '@/components/flowchart/Minimap';
import { PropertiesPanel } from '@/components/flowchart/PropertiesPanel';
import { TopBar } from '@/components/flowchart/TopBar';
import { useBoardStore } from '@/store/boardStore';
import { useFlowchartStore } from '@/store/flowchartStore';
import { useFlowchartHotkeys } from '@/hooks/useFlowchartHotkeys';

export function BoardPage() {
  useFlowchartHotkeys();
  const currentBoardId = useBoardStore((state) => state.currentBoardId);
  const currentBoard = useBoardStore((state) =>
    state.boards.find((board) => board.id === currentBoardId)
  );
  const saveCurrentBoard = useBoardStore((state) => state.saveCurrentBoard);
  const [legacyWarning, setLegacyWarning] = useState(false);

  useEffect(() => {
    const board = useBoardStore
      .getState()
      .boards.find((candidate) => candidate.id === currentBoardId);

    if (!board) return;

    useFlowchartStore.getState().reset();
    useFlowchartStore.setState({
      nodes: board.nodes,
      edges: board.edges,
    });

    const legacyShapes = (board as unknown as { shapes?: Record<string, unknown> }).shapes;
    if (legacyShapes && Object.keys(legacyShapes).length > 0) {
      setLegacyWarning(true);
    }

    return useFlowchartStore.subscribe((state, previousState) => {
      if (
        state.nodes !== previousState.nodes ||
        state.edges !== previousState.edges
      ) {
        saveCurrentBoard({ nodes: state.nodes, edges: state.edges });
      }
    });
  }, [currentBoardId, saveCurrentBoard]);

  if (!currentBoard) {
    return null;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-canvas">
      <FlowchartCanvas />
      <TopBar />
      <LeftToolbar />
      <Minimap />
      <PropertiesPanel />
      {legacyWarning && (
        <div className="absolute bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-yellow-100 px-4 py-2 text-sm text-yellow-900 shadow">
          This board was created with an older editor. Some shapes may not display correctly.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Update the board page test**

`src/pages/BoardPage.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BoardPage } from './BoardPage';
import { useBoardStore } from '@/store/boardStore';
import { useFlowchartStore } from '@/store/flowchartStore';
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  useBoardStore.setState({ boards: [], currentBoardId: null });
  useFlowchartStore.setState({
    nodes: {},
    edges: {},
    selection: null,
    tool: 'select',
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    showGrid: true,
    snap: true,
    editingNodeId: null,
    undoStack: [],
    redoStack: [],
  });
});

describe('BoardPage', () => {
  it('renders nothing when no board is open', () => {
    const { container } = render(<BoardPage />);
    expect(container.firstChild).toBeNull();
  });

  it('renders canvas when a board is open', () => {
    const id = useBoardStore.getState().createBoard('Test');
    useBoardStore.getState().openBoard(id);
    const { container } = render(<BoardPage />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
```

- [ ] **Step 7: Run board page test**

Run: `npx vitest run src/pages/BoardPage.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/store/boardStore.ts src/store/boardStore.test.ts src/pages/BoardPage.tsx src/pages/BoardPage.test.tsx
git commit -m "feat(integration): wire flowchart store into board persistence and board page"
```

---

### Task 19: Integration test and final verification

**Files:**
- Create: `src/store/flowchartStore.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useFlowchartStore, createDefaultNode } from './flowchartStore';
import { computeOrthogonalPath } from '@/utils/orthogonalRouter';

describe('flowchartStore integration', () => {
  beforeEach(() => {
    useFlowchartStore.setState({
      nodes: {},
      edges: {},
      selection: null,
      tool: 'select',
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      showGrid: true,
      snap: true,
      editingNodeId: null,
      undoStack: [],
      redoStack: [],
    });
  });

  it('creates two nodes and a connecting edge, then recomputes the edge after moving a node', () => {
    const { addNode, addEdge, moveNode } = useFlowchartStore.getState();

    const a = createDefaultNode('process', 0, 0);
    const b = createDefaultNode('process', 200, 150);
    addNode(a);
    addNode(b);
    addEdge(a.id, 'right', b.id, 'left');

    const edge = Object.values(useFlowchartStore.getState().edges)[0];
    expect(edge).toBeDefined();
    expect(edge.fromNodeId).toBe(a.id);
    expect(edge.toNodeId).toBe(b.id);

    moveNode(a.id, { x: 0, y: 50 });
    const updatedA = useFlowchartStore.getState().nodes[a.id];
    const path = computeOrthogonalPath(updatedA, edge.fromPort, b, edge.toPort);
    expect(path.length).toBeGreaterThan(0);
  });

  it('deletes a node and cascades edge deletion', () => {
    const { addNode, addEdge, removeNode } = useFlowchartStore.getState();

    const a = createDefaultNode('process', 0, 0);
    const b = createDefaultNode('process', 200, 0);
    addNode(a);
    addNode(b);
    addEdge(a.id, 'right', b.id, 'left');

    removeNode(a.id);

    expect(useFlowchartStore.getState().nodes[a.id]).toBeUndefined();
    expect(Object.values(useFlowchartStore.getState().edges)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `npx vitest run src/store/flowchartStore.integration.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/store/flowchartStore.integration.test.ts
git commit -m "test(integration): add flowchart store integration tests"
```

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: PASS with no errors.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass. Any failures related to the old generic-shape grid tests should be addressed by fixing `src/utils/grid.ts` or its tests as a separate cleanup commit.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: Build completes without errors.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: verify lint, tests, and build"
```

---

## Self-Review

### 1. Spec coverage

| Spec section | Implementing task(s) |
| --- | --- |
| Node/edge graph model | Task 1, Task 6 |
| Port geometry | Task 2 |
| Orthogonal routing | Task 3, Task 9 |
| Snap + smart guides | Task 4, Task 12 |
| Click-to-place creation | Task 6, Task 12 |
| Port-to-port connection | Task 10, Task 12 |
| Toolbar + palette | Task 14 |
| Properties panel | Task 15 |
| Top bar / minimap | Task 16, Task 17 |
| Undo/redo | Task 5, Task 6 |
| Persistence / board store | Task 18 |
| Keyboard shortcuts | Task 7 |
| Inline label editing | Task 13, Task 12 |
| Testing | Every task + Task 19 |

### 2. Placeholder scan

No `TBD`, `TODO`, "implement later", or vague instructions found. Each step contains concrete file paths, code, and exact commands.

### 3. Type consistency

- Node/edge types defined in Task 1 are used unchanged everywhere.
- `FlowchartStore` exposes `nodes`, `edges`, `selection`, `tool`, `viewport`, `showGrid`, `snap`, `editingNodeId`, `undoStack`, `redoStack` consistently.
- `FlowchartTool` is `'select' | 'connector' | FlowchartNodeType`.
- `Board` shape is updated to `nodes`/`edges` in Task 18 and matches the `FlowchartGraph` type.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-14-board-flowchart-plan.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach would you like?
