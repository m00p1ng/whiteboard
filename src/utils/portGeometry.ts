import type { FlowchartNode, FlowchartNodeType, PortId } from '@/types/flowchart';

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  x2: number;
  y2: number;
}

export function getDefaultNodeSize(type: FlowchartNodeType): {
  width: number;
  height: number;
} {
  switch (type) {
    case 'terminal':
      return { width: 120, height: 60 };
    case 'process':
      return { width: 140, height: 80 };
    case 'decision':
      return { width: 120, height: 120 };
    case 'data':
      return { width: 140, height: 80 };
    default:
      return { width: 120, height: 80 };
  }
}

export function getPortPoint(node: FlowchartNode, port: PortId): Point {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  switch (port) {
    case 'top':
      return { x: cx, y: node.y };
    case 'right':
      return { x: node.x + node.width, y: cy };
    case 'bottom':
      return { x: cx, y: node.y + node.height };
    case 'left':
      return { x: node.x, y: cy };
  }
}

export function getPortDirection(port: PortId): Point {
  switch (port) {
    case 'top':
      return { x: 0, y: -1 };
    case 'right':
      return { x: 1, y: 0 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
  }
}

export function getNearestPort(node: FlowchartNode, point: Point): PortId {
  const ports: PortId[] = ['top', 'right', 'bottom', 'left'];
  let best: PortId = 'top';
  let bestDist = Infinity;
  for (const port of ports) {
    const p = getPortPoint(node, port);
    const dist = Math.hypot(p.x - point.x, p.y - point.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = port;
    }
  }
  return best;
}

export function getNodeBounds(node: FlowchartNode): Bounds {
  return {
    x: node.x,
    y: node.y,
    x2: node.x + node.width,
    y2: node.y + node.height,
  };
}

export function getLabelCenter(node: FlowchartNode): Point {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}
