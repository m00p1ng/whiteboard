import { describe, it, expect } from 'vitest';
import {
  computeOrthogonalPath,
  normalizeOrthogonalPoints,
} from './orthogonalRouter';
import type { FlowchartNode } from '@/types/flowchart';

function makeNode(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): FlowchartNode {
  return { id, type: 'process', x, y, width, height, style: {} };
}

describe('orthogonalRouter', () => {
  const source = makeNode('s', 0, 0, 100, 60);
  const target = makeNode('t', 200, 150, 100, 60);

  it('routes top-to-bottom with three orthogonal segments', () => {
    const path = computeOrthogonalPath(source, 'top', target, 'bottom');
    expect(path).toEqual([
      50, 0, 50, -8, 150, -8, 150, 218, 250, 218, 250, 210,
    ]);
  });

  it('routes right-to-left with five points', () => {
    const path = computeOrthogonalPath(source, 'right', target, 'left');
    expect(path).toEqual([
      100, 30, 108, 30, 108, 105, 192, 105, 192, 180, 200, 180,
    ]);
  });

  it('routes left-to-top with three segments', () => {
    const path = computeOrthogonalPath(source, 'left', target, 'top');
    expect(path).toEqual([
      0, 30, -8, 30, 250, 30, 250, 142, 250, 150,
    ]);
  });

  it('falls back to a straight line when nodes overlap', () => {
    const overlapping = makeNode('o', 10, 10, 100, 60);
    const path = computeOrthogonalPath(source, 'right', overlapping, 'left', 8);
    expect(path).toEqual([100, 30, 10, 40]);
  });

  it('produces an axis-aligned path', () => {
    const path = computeOrthogonalPath(source, 'bottom', target, 'right');
    for (let i = 2; i < path.length - 2; i += 2) {
      const x1 = path[i];
      const y1 = path[i + 1];
      const x2 = path[i + 2];
      const y2 = path[i + 3];
      expect(x1 === x2 || y1 === y2).toBe(true);
    }
  });

  it('preserves the existing route when no waypoints are provided', () => {
    expect(computeOrthogonalPath(source, 'right', target, 'left')).toEqual([
      100, 30, 108, 30, 108, 105, 192, 105, 192, 180, 200, 180,
    ]);
  });

  it('routes through fixed world-space waypoints', () => {
    expect(
      computeOrthogonalPath(source, 'right', target, 'left', 8, [
        { x: 140, y: 30 },
        { x: 140, y: 180 },
      ])
    ).toEqual([
      100, 30, 108, 30, 140, 30, 140, 180, 192, 180, 200, 180,
    ]);
  });

  it('removes duplicate and collinear interior points', () => {
    expect(
      normalizeOrthogonalPoints([
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 30 },
      ])
    ).toEqual([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 30 },
    ]);
  });

  it('keeps manual waypoints fixed when a node moves', () => {
    const waypoints = [
      { x: 140, y: 30 },
      { x: 140, y: 180 },
    ];
    const movedSource = { ...source, x: 20, y: 40 };

    const path = computeOrthogonalPath(
      movedSource,
      'right',
      target,
      'left',
      8,
      waypoints
    );

    expect(path).toContain(140);
    expect(waypoints).toEqual([
      { x: 140, y: 30 },
      { x: 140, y: 180 },
    ]);
  });
});
