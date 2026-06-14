import type { Shape } from '@/types/shape';

export interface CommandState {
  shapes: Record<string, Shape>;
}

export interface Command {
  do: (state: CommandState) => void;
  undo: (state: CommandState) => void;
}

export function createAddShapeCommand(shape: Shape): Command {
  return {
    do: (state) => {
      state.shapes[shape.id] = shape;
    },
    undo: (state) => {
      delete state.shapes[shape.id];
    },
  };
}

export function createRemoveShapeCommand(shape: Shape): Command {
  return {
    do: (state) => {
      delete state.shapes[shape.id];
    },
    undo: (state) => {
      state.shapes[shape.id] = shape;
    },
  };
}

export function createReorderCommand(
  prevOrder: string[],
  nextOrder: string[]
): Command {
  return {
    do: (state) => {
      state.shapes = reorderShapes(state.shapes, nextOrder);
    },
    undo: (state) => {
      state.shapes = reorderShapes(state.shapes, prevOrder);
    },
  };
}

function reorderShapes(
  shapes: Record<string, Shape>,
  order: string[]
): Record<string, Shape> {
  const next: Record<string, Shape> = {};
  for (const id of order) {
    if (shapes[id]) next[id] = shapes[id];
  }
  return next;
}

export function createUpdateShapeCommand(
  id: string,
  prev: Partial<Shape>,
  next: Partial<Shape>
): Command {
  return {
    do: (state) => {
      const shape = state.shapes[id];
      if (shape) Object.assign(shape, next);
    },
    undo: (state) => {
      const shape = state.shapes[id];
      if (shape) Object.assign(shape, prev);
    },
  };
}
