import { describe, it, expect } from 'vitest';
import { getAnchorPoint } from './geometry';
import type { RectShape, CircleShape } from '@/types/shape';

describe('geometry', () => {
  it('returns center of a rectangle', () => {
    const rect: RectShape = { id: 'r', type: 'rect', x: 0, y: 0, width: 100, height: 50 };
    expect(getAnchorPoint(rect, 'center')).toEqual({ x: 50, y: 25 });
  });

  it('returns right side of a circle', () => {
    const circle: CircleShape = { id: 'c', type: 'circle', x: 0, y: 0, radius: 30 };
    expect(getAnchorPoint(circle, 'right')).toEqual({ x: 30, y: 0 });
  });
});
