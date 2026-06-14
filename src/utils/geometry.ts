import type { Shape } from '@/types/shape';

export interface Point {
  x: number;
  y: number;
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
          return { x: shape.x, y: shape.y - shape.radius };
        case 'right':
          return { x: shape.x + shape.radius, y: shape.y };
        case 'bottom':
          return { x: shape.x, y: shape.y + shape.radius };
        case 'left':
          return { x: shape.x - shape.radius, y: shape.y };
        default:
          return { x: shape.x, y: shape.y };
      }
    default:
      return { x: shape.x, y: shape.y };
  }
}
