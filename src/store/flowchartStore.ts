import { create } from 'zustand';
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
import { getDefaultNodeSize } from '@/utils/portGeometry';
import { normalizeOrthogonalPoints } from '@/utils/orthogonalRouter';
import type {
  Command,
  FlowchartEdge,
  FlowchartGraph,
  FlowchartNode,
  FlowchartPoint,
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
  bringNodeToFront: (id: string) => void;
  sendNodeToBack: (id: string) => void;
  bringNodeForward: (id: string) => void;
  sendNodeBackward: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateEdge: (id: string, updates: Partial<FlowchartEdge>) => void;
  updateEdgeStyle: (id: string, style: Partial<FlowchartEdge['style']>) => void;
  setEdgeWaypoints: (id: string, waypoints: FlowchartPoint[]) => void;
  reconnectEdge: (
    id: string,
    endpoint: 'source' | 'target',
    nodeId: string,
    port: PortId
  ) => void;
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
  if (!window.localStorage || typeof window.localStorage.getItem !== 'function') {
    return true;
  }
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
      fontFamily: 'Inter',
    },
  };
}

export const useFlowchartStore = create<FlowchartState & FlowchartActions>(
  (set, get) => ({
    ...initialState,

    execute: (command) => {
      const state = get();
      const nextNodes = { ...state.nodes };
      const nextEdges = { ...state.edges };
      command.do({ nodes: nextNodes, edges: nextEdges });
      set((current) => ({
        ...state,
        nodes: nextNodes,
        edges: nextEdges,
        undoStack: [...current.undoStack, command],
        redoStack: [],
      }));
    },

    undo: () => {
      const state = get();
      const command = state.undoStack.at(-1);
      if (!command) return;
      const nextNodes = { ...state.nodes };
      const nextEdges = { ...state.edges };
      command.undo({ nodes: nextNodes, edges: nextEdges });
      set((current) => ({
        ...state,
        nodes: nextNodes,
        edges: nextEdges,
        undoStack: current.undoStack.slice(0, -1),
        redoStack: [...current.redoStack, command],
      }));
    },

    redo: () => {
      const state = get();
      const command = state.redoStack.at(-1);
      if (!command) return;
      const nextNodes = { ...state.nodes };
      const nextEdges = { ...state.edges };
      command.do({ nodes: nextNodes, edges: nextEdges });
      set((current) => ({
        ...state,
        nodes: nextNodes,
        edges: nextEdges,
        undoStack: [...current.undoStack, command],
        redoStack: current.redoStack.slice(0, -1),
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

    setEdgeWaypoints: (id, waypoints) => {
      const edge = get().edges[id];
      if (!edge) return;
      const normalized = normalizeOrthogonalPoints(
        waypoints.map((point) => ({ ...point }))
      );
      const next = normalized.length > 0 ? normalized : undefined;
      if (JSON.stringify(edge.waypoints) === JSON.stringify(next)) return;
      get().updateEdge(id, { waypoints: next });
    },

    reconnectEdge: (id, endpoint, nodeId, port) => {
      const { edges, nodes } = get();
      const edge = edges[id];
      if (!edge || !nodes[nodeId]) return;

      const candidate =
        endpoint === 'source'
          ? { ...edge, fromNodeId: nodeId, fromPort: port }
          : { ...edge, toNodeId: nodeId, toPort: port };
      if (candidate.fromNodeId === candidate.toNodeId) return;

      const duplicate = Object.values(edges).some(
        (other) =>
          other.id !== id &&
          other.fromNodeId === candidate.fromNodeId &&
          other.fromPort === candidate.fromPort &&
          other.toNodeId === candidate.toNodeId &&
          other.toPort === candidate.toPort
      );
      if (duplicate) return;

      get().updateEdge(
        id,
        endpoint === 'source'
          ? { fromNodeId: nodeId, fromPort: port }
          : { toNodeId: nodeId, toPort: port }
      );
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
