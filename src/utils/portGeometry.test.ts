import { describe, it, expect } from 'vitest';
import {
  getPortPoint,
  getPortDirection,
  getDefaultNodeSize,
  getNodeBounds,
} from './portGeometry';
import type { FlowchartNode } from '@/types/flowchart';

describe('portGeometry', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 100,
    y: 50,
    width: 140,
    height: 80,
    style: {},
  };

  it('returns correct port points', () => {
    expect(getPortPoint(node, 'top')).toEqual({ x: 170, y: 50 });
    expect(getPortPoint(node, 'right')).toEqual({ x: 240, y: 90 });
    expect(getPortPoint(node, 'bottom')).toEqual({ x: 170, y: 130 });
    expect(getPortPoint(node, 'left')).toEqual({ x: 100, y: 90 });
  });

  it('returns outward port directions', () => {
    expect(getPortDirection('top')).toEqual({ x: 0, y: -1 });
    expect(getPortDirection('right')).toEqual({ x: 1, y: 0 });
    expect(getPortDirection('bottom')).toEqual({ x: 0, y: 1 });
    expect(getPortDirection('left')).toEqual({ x: -1, y: 0 });
  });

  it('returns default sizes', () => {
    expect(getDefaultNodeSize('process')).toEqual({ width: 140, height: 80 });
    expect(getDefaultNodeSize('decision')).toEqual({ width: 120, height: 120 });
    expect(getDefaultNodeSize('terminal')).toEqual({ width: 120, height: 60 });
  });

  it('returns node bounds', () => {
    expect(getNodeBounds(node)).toEqual({
      x: 100,
      y: 50,
      x2: 240,
      y2: 130,
    });
  });
});
