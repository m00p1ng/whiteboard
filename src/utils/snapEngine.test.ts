import { describe, it, expect } from 'vitest';
import { snapToGrid, snapPoint, computeSmartGuides } from './snapEngine';
import type { FlowchartNode } from '@/types/flowchart';

describe('snapEngine', () => {
  it('snaps a value to the grid', () => {
    expect(snapToGrid(14, 10)).toBe(10);
    expect(snapToGrid(16, 10)).toBe(20);
    expect(snapToGrid(15, 10)).toBe(20);
  });

  it('snaps a point to the grid', () => {
    expect(snapPoint(14, 26, 10)).toEqual({ x: 10, y: 30 });
  });

  it('computes horizontal center alignment guide', () => {
    const moving: FlowchartNode = {
      id: 'm',
      type: 'process',
      x: 98,
      y: 0,
      width: 40,
      height: 40,
      style: {},
    };
    const other: FlowchartNode = {
      id: 'o',
      type: 'process',
      x: 100,
      y: 100,
      width: 40,
      height: 40,
      style: {},
    };
    const guides = computeSmartGuides(moving, [other], 5);
    expect(guides.dx).toBe(2);
  });

  it('returns no guide when outside threshold', () => {
    const moving: FlowchartNode = {
      id: 'm',
      type: 'process',
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      style: {},
    };
    const other: FlowchartNode = {
      id: 'o',
      type: 'process',
      x: 200,
      y: 200,
      width: 40,
      height: 40,
      style: {},
    };
    const guides = computeSmartGuides(moving, [other], 5);
    expect(guides.dx).toBeUndefined();
    expect(guides.dy).toBeUndefined();
  });
});
