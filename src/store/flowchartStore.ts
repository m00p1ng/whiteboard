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
