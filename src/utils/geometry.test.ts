import { describe, expect, it } from 'vitest';
import { getAnchorPoint, getShapeBounds, zoomAtPoint } from './geometry';
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

  it('returns right side of a circle', () => {
    const circle: CircleShape = {
      id: 'c',
      type: 'circle',
      x: 0,
      y: 0,
      radius: 30,
    };

    expect(getAnchorPoint(circle, 'right')).toEqual({ x: 30, y: 0 });
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

  it('returns circle bounds from its center and radius', () => {
    const shape: CircleShape = {
      id: 'circle',
      type: 'circle',
      x: 50,
      y: 70,
      radius: 20,
    };

    expect(getShapeBounds(shape)).toEqual({
      x: 30,
      y: 50,
      width: 40,
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
