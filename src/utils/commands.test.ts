import { describe, it, expect } from 'vitest';
import { createAddShapeCommand, createReorderCommand } from './commands';
import type { RectShape } from '@/types/shape';

describe('commands', () => {
  it('creates an inverse add command', () => {
    const rect: RectShape = { id: 'r1', type: 'rect', x: 0, y: 0, width: 10, height: 10 };
    const cmd = createAddShapeCommand(rect);
    const state = { shapes: { r1: rect } };
    cmd.undo(state);
    expect(state.shapes['r1']).toBeUndefined();
  });

  it('creates a reorder command that reorders and restores shape order', () => {
    const r1: RectShape = { id: 'r1', type: 'rect', x: 0, y: 0, width: 10, height: 10 };
    const r2: RectShape = { id: 'r2', type: 'rect', x: 0, y: 0, width: 10, height: 10 };
    const r3: RectShape = { id: 'r3', type: 'rect', x: 0, y: 0, width: 10, height: 10 };
    const state = { shapes: { r1, r2, r3 } };
    const cmd = createReorderCommand(['r1', 'r2', 'r3'], ['r2', 'r3', 'r1']);

    cmd.do(state);
    expect(Object.keys(state.shapes)).toEqual(['r2', 'r3', 'r1']);

    cmd.undo(state);
    expect(Object.keys(state.shapes)).toEqual(['r1', 'r2', 'r3']);
  });
});
