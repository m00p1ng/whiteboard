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
