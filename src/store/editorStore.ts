import { create } from 'zustand';
import type { Shape } from '@/types/shape';

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
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  setTool: (tool: Tool) => void;
  setSelectedId: (id: string | null) => void;
  setViewport: (updates: Partial<Viewport>) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  shapes: {},
  tool: 'select',
  selectedId: null,
  viewport: { scale: 1, offsetX: 0, offsetY: 0 },
  addShape: (shape) =>
    set((state) => ({
      shapes: { ...state.shapes, [shape.id]: shape },
    })),
  updateShape: (id, updates) =>
    set((state) => {
      const shape = state.shapes[id];
      if (!shape) return state;
      return {
        shapes: { ...state.shapes, [id]: { ...shape, ...updates } as Shape },
      };
    }),
  removeShape: (id) =>
    set((state) => {
      const next = { ...state.shapes };
      delete next[id];
      return { shapes: next };
    }),
  setTool: (tool) => set({ tool }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setViewport: (updates) =>
    set((state) => ({ viewport: { ...state.viewport, ...updates } })),
}));
