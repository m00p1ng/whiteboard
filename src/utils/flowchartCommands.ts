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
