import type { FlowchartNode } from '@/types/flowchart';

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPoint(
  x: number,
  y: number,
  gridSize: number
): { x: number; y: number } {
  return { x: snapToGrid(x, gridSize), y: snapToGrid(y, gridSize) };
}

export interface SnapGuides {
  dx?: number;
  dy?: number;
}

export function computeSmartGuides(
  movingNode: FlowchartNode,
  otherNodes: FlowchartNode[],
  threshold = 8
): SnapGuides {
  const guides: SnapGuides = {};
  const movingX = movingNode.x;
  const movingY = movingNode.y;
  const movingCenterX = movingNode.x + movingNode.width / 2;
  const movingCenterY = movingNode.y + movingNode.height / 2;
  const movingRight = movingNode.x + movingNode.width;
  const movingBottom = movingNode.y + movingNode.height;

  for (const other of otherNodes) {
    if (other.id === movingNode.id) continue;

    const otherX = other.x;
    const otherY = other.y;
    const otherCenterX = other.x + other.width / 2;
    const otherCenterY = other.y + other.height / 2;
    const otherRight = other.x + other.width;
    const otherBottom = other.y + other.height;

    const candidates = [
      { value: movingX, target: otherX },
      { value: movingCenterX, target: otherCenterX },
      { value: movingRight, target: otherRight },
    ];

    for (const { value, target } of candidates) {
      const diff = target - value;
      if (Math.abs(diff) <= threshold) {
        if (guides.dx === undefined || Math.abs(diff) < Math.abs(guides.dx)) {
          guides.dx = diff;
        }
      }
    }

    const yCandidates = [
      { value: movingY, target: otherY },
      { value: movingCenterY, target: otherCenterY },
      { value: movingBottom, target: otherBottom },
    ];

    for (const { value, target } of yCandidates) {
      const diff = target - value;
      if (Math.abs(diff) <= threshold) {
        if (guides.dy === undefined || Math.abs(diff) < Math.abs(guides.dy)) {
          guides.dy = diff;
        }
      }
    }
  }

  return guides;
}
