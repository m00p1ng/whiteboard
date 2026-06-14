import { describe, expect, it } from 'vitest';
import {
  createShapeFromGesture,
  isClickGesture,
  normalizeDragBounds,
  screenToWorld,
} from './creationGeometry';

describe('creation geometry', () => {
  it('converts screen coordinates through the viewport', () => {
    expect(
      screenToWorld(
        { x: 250, y: 170 },
        { scale: 2, offsetX: 50, offsetY: 10 }
      )
    ).toEqual({ x: 100, y: 80 });
  });

  it('normalizes a drag in any direction', () => {
    expect(normalizeDragBounds({ x: 90, y: 80 }, { x: 30, y: 20 })).toEqual({
      x: 30,
      y: 20,
      width: 60,
      height: 60,
    });
  });

  it('uses a five screen-pixel click threshold', () => {
    expect(isClickGesture({ x: 10, y: 10 }, { x: 13, y: 14 })).toBe(true);
    expect(isClickGesture({ x: 10, y: 10 }, { x: 16, y: 10 })).toBe(false);
  });

  it('creates a dragged rectangle', () => {
    expect(
      createShapeFromGesture({
        id: 'rect',
        tool: 'rect',
        startWorld: { x: 90, y: 80 },
        currentWorld: { x: 30, y: 20 },
        clicked: false,
      })
    ).toMatchObject({
      type: 'rect',
      x: 30,
      y: 20,
      width: 60,
      height: 60,
    });
  });

  it('creates a dragged ellipse from its bounding box', () => {
    expect(
      createShapeFromGesture({
        id: 'ellipse',
        tool: 'circle',
        startWorld: { x: 20, y: 30 },
        currentWorld: { x: 120, y: 70 },
        clicked: false,
      })
    ).toMatchObject({
      type: 'circle',
      x: 70,
      y: 50,
      radiusX: 50,
      radiusY: 20,
    });
  });

  it('creates a dragged line and fixed-position text', () => {
    expect(
      createShapeFromGesture({
        id: 'line',
        tool: 'line',
        startWorld: { x: 10, y: 20 },
        currentWorld: { x: 70, y: 90 },
        clicked: false,
      })
    ).toMatchObject({
      type: 'line',
      points: [10, 20, 70, 90],
    });

    expect(
      createShapeFromGesture({
        id: 'text',
        tool: 'text',
        startWorld: { x: 10, y: 20 },
        currentWorld: { x: 70, y: 90 },
        clicked: false,
      })
    ).toMatchObject({
      type: 'text',
      x: 10,
      y: 20,
      text: 'Text',
      fontSize: 18,
    });
  });

  it.each([
    ['rect', { width: 100, height: 60 }],
    ['circle', { radiusX: 40, radiusY: 40 }],
    ['line', { points: [10, 20, 90, 20] }],
    ['text', { text: 'Text', fontSize: 18 }],
  ] as const)('creates the default %s on click', (tool, expected) => {
    expect(
      createShapeFromGesture({
        id: tool,
        tool,
        startWorld: { x: 10, y: 20 },
        currentWorld: { x: 10, y: 20 },
        clicked: true,
      })
    ).toMatchObject(expected);
  });

  it('rejects non-finite coordinates', () => {
    expect(
      createShapeFromGesture({
        id: 'rect',
        tool: 'rect',
        startWorld: { x: Number.NaN, y: 0 },
        currentWorld: { x: 20, y: 20 },
        clicked: false,
      })
    ).toBeNull();
  });
});
