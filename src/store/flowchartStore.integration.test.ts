import { describe, it, expect, beforeEach } from 'vitest';
import { useFlowchartStore, createDefaultNode } from './flowchartStore';
import { computeOrthogonalPath } from '@/utils/orthogonalRouter';

function routeContainsPoint(
  route: number[],
  point: { x: number; y: number }
): boolean {
  for (let index = 0; index < route.length - 2; index += 2) {
    const x1 = route[index];
    const y1 = route[index + 1];
    const x2 = route[index + 2];
    const y2 = route[index + 3];
    if (
      (x1 === x2 &&
        point.x === x1 &&
        point.y >= Math.min(y1, y2) &&
        point.y <= Math.max(y1, y2)) ||
      (y1 === y2 &&
        point.y === y1 &&
        point.x >= Math.min(x1, x2) &&
        point.x <= Math.max(x1, x2))
    ) {
      return true;
    }
  }
  return false;
}

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

  it('reflows edited endpoint sections without moving manual waypoints', () => {
    const { addNode, addEdge, moveNode, setEdgeWaypoints } =
      useFlowchartStore.getState();
    const a = createDefaultNode('process', 0, 0);
    const b = createDefaultNode('process', 240, 160);
    const waypoints = [
      { x: 150, y: 30 },
      { x: 150, y: 190 },
    ];
    addNode(a);
    addNode(b);
    addEdge(a.id, 'right', b.id, 'left');
    const edge = Object.values(useFlowchartStore.getState().edges)[0];
    setEdgeWaypoints(edge.id, waypoints);
    const before = computeOrthogonalPath(
      a,
      edge.fromPort,
      b,
      edge.toPort,
      8,
      waypoints
    );

    moveNode(a.id, { x: 20, y: 60 });
    const state = useFlowchartStore.getState();
    const updatedEdge = state.edges[edge.id];
    const after = computeOrthogonalPath(
      state.nodes[a.id],
      updatedEdge.fromPort,
      b,
      updatedEdge.toPort,
      8,
      updatedEdge.waypoints
    );

    expect(updatedEdge.waypoints).toEqual(waypoints);
    expect(after.slice(0, 4)).not.toEqual(before.slice(0, 4));
    expect(routeContainsPoint(after, waypoints[0])).toBe(true);
    expect(routeContainsPoint(after, waypoints[1])).toBe(true);
  });
});
