import type { FlowchartNode, PortId } from '@/types/flowchart';
import { getNodeBounds, getPortDirection, getPortPoint } from './portGeometry';

export function computeOrthogonalPath(
  source: FlowchartNode,
  sourcePort: PortId,
  target: FlowchartNode,
  targetPort: PortId,
  margin = 8
): number[] {
  const sourcePoint = getPortPoint(source, sourcePort);
  const targetPoint = getPortPoint(target, targetPort);
  const sourceDir = getPortDirection(sourcePort);
  const targetDir = getPortDirection(targetPort);

  const p1 = {
    x: sourcePoint.x + sourceDir.x * margin,
    y: sourcePoint.y + sourceDir.y * margin,
  };
  const p2 = {
    x: targetPoint.x + targetDir.x * margin,
    y: targetPoint.y + targetDir.y * margin,
  };

  const sourceBounds = inflateBounds(getNodeBounds(source), margin);
  const targetBounds = inflateBounds(getNodeBounds(target), margin);

  if (boundsOverlap(sourceBounds, targetBounds)) {
    return [sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y];
  }

  const points: number[] = [sourcePoint.x, sourcePoint.y];

  if (p1.x === p2.x || p1.y === p2.y) {
    points.push(p1.x, p1.y, p2.x, p2.y);
  } else {
    const sourceIsHorizontal = sourcePort === 'left' || sourcePort === 'right';
    const targetIsVertical = targetPort === 'top' || targetPort === 'bottom';

    if (sourceIsHorizontal && targetIsVertical) {
      points.push(p1.x, p1.y, p2.x, p1.y, p2.x, p2.y);
    } else if (!sourceIsHorizontal && !targetIsVertical) {
      points.push(p1.x, p1.y, p1.x, p2.y, p2.x, p2.y);
    } else if (sourceIsHorizontal) {
      const midY = (p1.y + p2.y) / 2;
      points.push(p1.x, p1.y, p1.x, midY, p2.x, midY, p2.x, p2.y);
    } else {
      const midX = (p1.x + p2.x) / 2;
      points.push(p1.x, p1.y, midX, p1.y, midX, p2.y, p2.x, p2.y);
    }
  }

  points.push(targetPoint.x, targetPoint.y);
  return points;
}

function inflateBounds(
  bounds: { x: number; y: number; x2: number; y2: number },
  amount: number
) {
  return {
    x: bounds.x - amount,
    y: bounds.y - amount,
    x2: bounds.x2 + amount,
    y2: bounds.y2 + amount,
  };
}

function boundsOverlap(
  a: { x: number; y: number; x2: number; y2: number },
  b: { x: number; y: number; x2: number; y2: number }
): boolean {
  return a.x < b.x2 && a.x2 > b.x && a.y < b.y2 && a.y2 > b.y;
}
