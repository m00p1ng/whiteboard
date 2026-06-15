import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFlowchartStore, createDefaultNode } from './flowchartStore';
import type { FlowchartEdge, FlowchartNode } from '@/types/flowchart';

const nodeA: FlowchartNode = {
  id: 'a',
  type: 'process',
  x: 0,
  y: 0,
  width: 100,
  height: 60,
  style: {},
};
const nodeB: FlowchartNode = { ...nodeA, id: 'b', x: 200 };
const nodeC: FlowchartNode = { ...nodeA, id: 'c', x: 400 };

function seedEdge(overrides: Partial<FlowchartEdge> = {}) {
  const edge: FlowchartEdge = {
    id: 'e1',
    fromNodeId: 'a',
    fromPort: 'right',
    toNodeId: 'b',
    toPort: 'left',
    style: {},
    ...overrides,
  };
  useFlowchartStore.setState({
    nodes: { a: nodeA, b: nodeB, c: nodeC },
    edges: { e1: edge },
    selection: { type: 'edge', id: 'e1' },
    undoStack: [],
    redoStack: [],
  });
}

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

  it('produces new nodes and edges references on mutations', () => {
    const a = createDefaultNode('process', 0, 0);
    const b = createDefaultNode('process', 200, 0);
    const { addNode, addEdge, removeNode, undo, redo } =
      useFlowchartStore.getState();

    addNode(a);
    addNode(b);
    addEdge(a.id, 'right', b.id, 'left');

    const nodesAfterAdd = useFlowchartStore.getState().nodes;
    const edgesAfterAdd = useFlowchartStore.getState().edges;

    removeNode(a.id);

    const nodesAfterRemove = useFlowchartStore.getState().nodes;
    const edgesAfterRemove = useFlowchartStore.getState().edges;

    expect(nodesAfterRemove).not.toBe(nodesAfterAdd);
    expect(edgesAfterRemove).not.toBe(edgesAfterAdd);

    undo();

    const nodesAfterUndo = useFlowchartStore.getState().nodes;
    const edgesAfterUndo = useFlowchartStore.getState().edges;

    expect(nodesAfterUndo).not.toBe(nodesAfterRemove);
    expect(edgesAfterUndo).not.toBe(edgesAfterRemove);

    redo();

    expect(useFlowchartStore.getState().nodes).not.toBe(nodesAfterUndo);
    expect(useFlowchartStore.getState().edges).not.toBe(edgesAfterUndo);
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

  it('updates waypoints with undo and redo', () => {
    seedEdge();

    useFlowchartStore
      .getState()
      .setEdgeWaypoints('e1', [{ x: 140, y: 90 }]);
    expect(useFlowchartStore.getState().edges.e1.waypoints).toEqual([
      { x: 140, y: 90 },
    ]);

    useFlowchartStore.getState().undo();
    expect(useFlowchartStore.getState().edges.e1.waypoints).toBeUndefined();

    useFlowchartStore.getState().redo();
    expect(useFlowchartStore.getState().edges.e1.waypoints).toEqual([
      { x: 140, y: 90 },
    ]);
  });

  it('clears waypoints when no manual bends remain', () => {
    seedEdge({ waypoints: [{ x: 140, y: 90 }] });

    useFlowchartStore.getState().setEdgeWaypoints('e1', []);

    expect(useFlowchartStore.getState().edges.e1.waypoints).toBeUndefined();
  });

  it('reconnects one endpoint and preserves waypoints', () => {
    seedEdge({ waypoints: [{ x: 140, y: 90 }] });

    useFlowchartStore.getState().reconnectEdge('e1', 'target', 'c', 'top');

    expect(useFlowchartStore.getState().edges.e1).toMatchObject({
      toNodeId: 'c',
      toPort: 'top',
      waypoints: [{ x: 140, y: 90 }],
    });
  });

  it('rejects self and duplicate reconnections without history', () => {
    seedEdge();
    useFlowchartStore.setState((state) => ({
      edges: {
        ...state.edges,
        e2: {
          id: 'e2',
          fromNodeId: 'a',
          fromPort: 'right',
          toNodeId: 'c',
          toPort: 'left',
          style: {},
        },
      },
    }));
    const before = useFlowchartStore.getState().undoStack.length;

    useFlowchartStore
      .getState()
      .reconnectEdge('e1', 'target', 'a', 'left');
    useFlowchartStore
      .getState()
      .reconnectEdge('e1', 'target', 'c', 'left');

    expect(useFlowchartStore.getState().edges.e1.toNodeId).toBe('b');
    expect(useFlowchartStore.getState().undoStack).toHaveLength(before);
  });
});
