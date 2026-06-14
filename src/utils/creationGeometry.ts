import type { Tool } from '@/store/editorStore';
import type { Point, ViewportTransform } from './geometry';
import type { Shape } from '@/types/shape';

export type CreationTool = Extract<Tool, 'rect' | 'circle' | 'line' | 'text'>;

export interface ShapeDraft {
  tool: CreationTool;
  startWorld: Point;
  currentWorld: Point;
  startScreen: Point;
  currentScreen: Point;
}

interface CreateShapeInput {
  id: string;
  tool: CreationTool;
  startWorld: Point;
  currentWorld: Point;
  clicked: boolean;
}

const CLICK_THRESHOLD = 5;

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function screenToWorld(
  point: Point,
  viewport: ViewportTransform
): Point {
  return {
    x: (point.x - viewport.offsetX) / viewport.scale,
    y: (point.y - viewport.offsetY) / viewport.scale,
  };
}

export function normalizeDragBounds(start: Point, current: Point) {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };
}

export function isClickGesture(start: Point, current: Point): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) <= CLICK_THRESHOLD;
}

export function createShapeFromGesture({
  id,
  tool,
  startWorld,
  currentWorld,
  clicked,
}: CreateShapeInput): Shape | null {
  if (!isFinitePoint(startWorld) || !isFinitePoint(currentWorld)) return null;

  if (tool === 'rect') {
    if (clicked) {
      return {
        id,
        type: 'rect',
        x: startWorld.x,
        y: startWorld.y,
        width: 100,
        height: 60,
        fill: '#fff',
      };
    }
    return {
      id,
      type: 'rect',
      ...normalizeDragBounds(startWorld, currentWorld),
      fill: '#fff',
    };
  }

  if (tool === 'circle') {
    if (clicked) {
      return {
        id,
        type: 'circle',
        x: startWorld.x,
        y: startWorld.y,
        radiusX: 40,
        radiusY: 40,
        fill: '#fff',
      };
    }
    const bounds = normalizeDragBounds(startWorld, currentWorld);
    return {
      id,
      type: 'circle',
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      radiusX: bounds.width / 2,
      radiusY: bounds.height / 2,
      fill: '#fff',
    };
  }

  if (tool === 'line') {
    return {
      id,
      type: 'line',
      x: 0,
      y: 0,
      points: clicked
        ? [startWorld.x, startWorld.y, startWorld.x + 80, startWorld.y]
        : [startWorld.x, startWorld.y, currentWorld.x, currentWorld.y],
    };
  }

  return {
    id,
    type: 'text',
    x: startWorld.x,
    y: startWorld.y,
    text: 'Text',
    fontSize: 18,
  };
}
