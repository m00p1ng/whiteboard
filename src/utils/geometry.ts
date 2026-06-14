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
