import { describe, it, expect } from 'vitest';
import { createAddShapeCommand } from './commands';
import type { RectShape } from '@/types/shape';

describe('commands', () => {
  it('creates an inverse add command', () => {
    const rect: RectShape = { id: 'r1', type: 'rect', x: 0, y: 0, width: 10, height: 10 };
    const cmd = createAddShapeCommand(rect);
    const state = { shapes: { r1: rect } };
    cmd.undo(state);
    expect(state.shapes['r1']).toBeUndefined();
  });
});
