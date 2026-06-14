import { describe, expect, it } from 'vitest';
import {
  computeResizedLinePoints,
  getAnchorPoint,
  getShapeBounds,
  zoomAtPoint,
} from './geometry';
import type {
  CircleShape,
  ConnectorShape,
  LineShape,
  RectShape,
  TextShape,
} from '@/types/shape';

describe('geometry', () => {
  it('returns center of a rectangle', () => {
    const rect: RectShape = {
      id: 'r',
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    };

    expect(getAnchorPoint(rect, 'center')).toEqual({ x: 50, y: 25 });
  });

  it('uses the matching ellipse radius for each anchor', () => {
    const ellipse: CircleShape = {
      id: 'ellipse',
      type: 'circle',
      x: 100,
      y: 80,
      radiusX: 30,
      radiusY: 15,
    };

    expect(getAnchorPoint(ellipse, 'top')).toEqual({ x: 100, y: 65 });
    expect(getAnchorPoint(ellipse, 'right')).toEqual({ x: 130, y: 80 });
    expect(getAnchorPoint(ellipse, 'bottom')).toEqual({ x: 100, y: 95 });
    expect(getAnchorPoint(ellipse, 'left')).toEqual({ x: 70, y: 80 });
  });
});

describe('getShapeBounds', () => {
  it('returns rectangle bounds', () => {
    const shape: RectShape = {
      id: 'rect',
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 60,
    };

    expect(getShapeBounds(shape)).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 60,
    });
  });

  it('returns ellipse bounds from its center and radii', () => {
    const shape: CircleShape = {
      id: 'ellipse',
      type: 'circle',
      x: 50,
      y: 70,
      radiusX: 30,
      radiusY: 20,
    };

    expect(getShapeBounds(shape)).toEqual({
      x: 20,
      y: 50,
      width: 60,
      height: 40,
    });
  });

  it('returns line bounds including the line node position', () => {
    const shape: LineShape = {
      id: 'line',
      type: 'line',
      x: 10,
      y: -5,
      points: [-20, 40, 80, -10],
    };

    expect(getShapeBounds(shape)).toEqual({
      x: -10,
      y: -15,
      width: 100,
      height: 50,
    });
  });

  it('returns approximate text bounds', () => {
    const shape: TextShape = {
      id: 'text',
      type: 'text',
      x: 15,
      y: 25,
      text: 'Hello',
      fontSize: 20,
    };

    expect(getShapeBounds(shape)).toEqual({
      x: 15,
      y: 25,
      width: 60,
      height: 24,
    });
  });

  it('skips connectors because connected shapes supply their bounds', () => {
    const shape: ConnectorShape = {
      id: 'connector',
      type: 'connector',
      x: 0,
      y: 0,
      fromId: 'a',
      toId: 'b',
    };

    expect(getShapeBounds(shape)).toBeNull();
  });
});

describe('zoomAtPoint', () => {
  it('keeps the world point under the anchor fixed', () => {
    expect(
      zoomAtPoint(
        { scale: 2, offsetX: 100, offsetY: 50 },
        { x: 500, y: 300 },
        3
      )
    ).toEqual({
      scale: 3,
      offsetX: -100,
      offsetY: -75,
    });
  });

  it('clamps zoom below the minimum scale', () => {
    expect(
      zoomAtPoint(
        { scale: 1, offsetX: 0, offsetY: 0 },
        { x: 100, y: 100 },
        0.01
      )
    ).toEqual({
      scale: 0.1,
      offsetX: 90,
      offsetY: 90,
    });
  });

  it('clamps zoom above the maximum scale', () => {
    expect(
      zoomAtPoint(
        { scale: 1, offsetX: 0, offsetY: 0 },
        { x: 100, y: 100 },
        10
      )
    ).toEqual({
      scale: 4,
      offsetX: -300,
      offsetY: -300,
    });
  });

  it('resets to 100 percent around the supplied anchor', () => {
    expect(
      zoomAtPoint(
        { scale: 2, offsetX: -200, offsetY: -100 },
        { x: 400, y: 300 },
        1
      )
    ).toEqual({
      scale: 1,
      offsetX: 100,
      offsetY: 100,
    });
  });
});

describe('computeResizedLinePoints', () => {
  it('updates the first endpoint when dragging handle 0', () => {
    const result = computeResizedLinePoints([0, 0, 100, 0], 0, 0, 0, { x: 20, y: 30 });
    expect(result).toEqual([20, 30, 100, 0]);
  });

  it('updates the second endpoint when dragging handle 1', () => {
    const result = computeResizedLinePoints([0, 0, 100, 0], 0, 0, 1, { x: 80, y: 40 });
    expect(result).toEqual([0, 0, 80, 40]);
  });

  it('accounts for a nonzero shape offset', () => {
    const result = computeResizedLinePoints([0, 0, 100, 0], 10, 5, 0, { x: 30, y: 25 });
    expect(result).toEqual([20, 20, 100, 0]);
  });

  it('rejects a resize that would shrink the line below the minimum length', () => {
    const result = computeResizedLinePoints([0, 0, 100, 0], 0, 0, 0, { x: 95, y: 0 });
    expect(result).toBeNull();
  });

  it('allows a resize exactly at the minimum length', () => {
    const result = computeResizedLinePoints([0, 0, 100, 0], 0, 0, 0, { x: 90, y: 0 });
    expect(result).toEqual([90, 0, 100, 0]);
  });
});
