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
