import type { Shape } from '@/types/shape';

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;

export function getShapeBounds(shape: Shape): Bounds | null {
  switch (shape.type) {
    case 'rect':
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      };
    case 'circle':
      return {
        x: shape.x - shape.radiusX,
        y: shape.y - shape.radiusY,
        width: shape.radiusX * 2,
        height: shape.radiusY * 2,
      };
    case 'line': {
      const xs = [shape.points[0], shape.points[2]];
      const ys = [shape.points[1], shape.points[3]];
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      return {
        x: shape.x + minX,
        y: shape.y + minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
    case 'text':
      return {
        x: shape.x,
        y: shape.y,
        width: shape.text.length * shape.fontSize * 0.6,
        height: shape.fontSize * 1.2,
      };
    case 'connector':
      return null;
  }
}

export function zoomAtPoint(
  viewport: ViewportTransform,
  point: Point,
  requestedScale: number
): ViewportTransform {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, requestedScale));
  const worldX = (point.x - viewport.offsetX) / viewport.scale;
  const worldY = (point.y - viewport.offsetY) / viewport.scale;

  return {
    scale,
    offsetX: point.x - worldX * scale,
    offsetY: point.y - worldY * scale,
  };
}

export const MIN_LINE_LENGTH = 10;

export function computeResizedLinePoints(
  points: [number, number, number, number],
  shapeX: number,
  shapeY: number,
  handleIndex: 0 | 1,
  newWorldPos: Point
): [number, number, number, number] | null {
  const local = { x: newWorldPos.x - shapeX, y: newWorldPos.y - shapeY };
  const other =
    handleIndex === 0
      ? { x: points[2], y: points[3] }
      : { x: points[0], y: points[1] };

  if (Math.hypot(local.x - other.x, local.y - other.y) < MIN_LINE_LENGTH) {
    return null;
  }

  return handleIndex === 0
    ? [local.x, local.y, points[2], points[3]]
    : [points[0], points[1], local.x, local.y];
}

export function getAnchorPoint(shape: Shape, anchor: string = 'center'): Point {
  switch (shape.type) {
    case 'rect':
      switch (anchor) {
        case 'top':
          return { x: shape.x + shape.width / 2, y: shape.y };
        case 'right':
          return { x: shape.x + shape.width, y: shape.y + shape.height / 2 };
        case 'bottom':
          return { x: shape.x + shape.width / 2, y: shape.y + shape.height };
        case 'left':
          return { x: shape.x, y: shape.y + shape.height / 2 };
        default:
          return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
      }
    case 'circle':
      switch (anchor) {
        case 'top':
          return { x: shape.x, y: shape.y - shape.radiusY };
        case 'right':
          return { x: shape.x + shape.radiusX, y: shape.y };
        case 'bottom':
          return { x: shape.x, y: shape.y + shape.radiusY };
        case 'left':
          return { x: shape.x - shape.radiusX, y: shape.y };
        default:
          return { x: shape.x, y: shape.y };
      }
    default:
      return { x: shape.x, y: shape.y };
  }
}
