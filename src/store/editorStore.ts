import { create } from 'zustand';
import type { Shape } from '@/types/shape';
import type { Command, CommandState } from '@/utils/commands';
import { createReorderCommand } from '@/utils/commands';

export type Tool =
  | 'select'
  | 'rect'
  | 'circle'
  | 'line'
  | 'text'
  | 'connector';

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface EditorState {
  shapes: Record<string, Shape>;
  tool: Tool;
  selectedId: string | null;
  viewport: Viewport;
  undoStack: Command[];
  redoStack: Command[];
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  execute: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: Tool) => void;
  setSelectedId: (id: string | null) => void;
  setViewport: (updates: Partial<Viewport>) => void;
  setShapes: (shapes: Record<string, Shape>) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  shapes: {},
  tool: 'select',
  selectedId: null,
  viewport: { scale: 1, offsetX: 0, offsetY: 0 },
  undoStack: [],
  redoStack: [],
  addShape: (shape) => {
    get().execute({
      do: (state) => {
        state.shapes[shape.id] = shape;
      },
      undo: (state) => {
        delete state.shapes[shape.id];
      },
    });
  },
  updateShape: (id, updates) => {
    const shape = get().shapes[id];
    if (!shape) return;
    const prev = Object.fromEntries(
      Object.keys(updates).map((k) => [k, (shape as never)[k]])
    );
    get().execute({
      do: (state) => Object.assign(state.shapes[id], updates),
      undo: (state) => Object.assign(state.shapes[id], prev),
    });
  },
  removeShape: (id) => {
    const shape = get().shapes[id];
    if (!shape) return;
    get().execute({
      do: (state) => delete state.shapes[id],
      undo: (state) => {
        state.shapes[id] = shape;
      },
    });
  },
  execute: (command) =>
    set((state) => {
      const cmdState: CommandState = { shapes: { ...state.shapes } };
      command.do(cmdState);
      return {
        shapes: cmdState.shapes,
        undoStack: [...state.undoStack, command],
        redoStack: [],
      };
    }),
  undo: () =>
    set((state) => {
      const command = state.undoStack.at(-1);
      if (!command) return state;
      const cmdState: CommandState = { shapes: { ...state.shapes } };
      command.undo(cmdState);
      return {
        shapes: cmdState.shapes,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, command],
      };
    }),
  redo: () =>
    set((state) => {
      const command = state.redoStack.at(-1);
      if (!command) return state;
      const cmdState: CommandState = { shapes: { ...state.shapes } };
      command.do(cmdState);
      return {
        shapes: cmdState.shapes,
        undoStack: [...state.undoStack, command],
        redoStack: state.redoStack.slice(0, -1),
      };
    }),
  setTool: (tool) => set({ tool }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setViewport: (updates) =>
    set((state) => ({ viewport: { ...state.viewport, ...updates } })),
  setShapes: (shapes) => set({ shapes, undoStack: [], redoStack: [] }),
  bringToFront: (id) => {
    const order = Object.keys(get().shapes);
    const idx = order.indexOf(id);
    if (idx === -1 || idx === order.length - 1) return;
    const nextOrder = [...order.slice(0, idx), ...order.slice(idx + 1), id];
    get().execute(createReorderCommand(order, nextOrder));
  },
  sendToBack: (id) => {
    const order = Object.keys(get().shapes);
    const idx = order.indexOf(id);
    if (idx <= 0) return;
    const nextOrder = [id, ...order.slice(0, idx), ...order.slice(idx + 1)];
    get().execute(createReorderCommand(order, nextOrder));
  },
  bringForward: (id) => {
    const order = Object.keys(get().shapes);
    const idx = order.indexOf(id);
    if (idx === -1 || idx === order.length - 1) return;
    const nextOrder = [...order];
    [nextOrder[idx], nextOrder[idx + 1]] = [nextOrder[idx + 1], nextOrder[idx]];
    get().execute(createReorderCommand(order, nextOrder));
  },
  sendBackward: (id) => {
    const order = Object.keys(get().shapes);
    const idx = order.indexOf(id);
    if (idx <= 0) return;
    const nextOrder = [...order];
    [nextOrder[idx], nextOrder[idx - 1]] = [nextOrder[idx - 1], nextOrder[idx]];
    get().execute(createReorderCommand(order, nextOrder));
  },
  reset: () =>
    set({
      shapes: {},
      tool: 'select',
      selectedId: null,
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      undoStack: [],
      redoStack: [],
    }),
}));
