import { describe, it, expect } from 'vitest';
import type { RectShape } from './shape';

describe('shape types', () => {
  it('accepts a valid rectangle', () => {
    const rect: RectShape = {
      id: 'r1',
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    };
    expect(rect.type).toBe('rect');
  });
});
