import type { FlowchartPoint } from '@/types/flowchart';
import {
  expandPoints,
  normalizeOrthogonalPoints,
} from './orthogonalRouter';

export function getManualWaypoints(route: number[]): FlowchartPoint[] {
  const points = normalizeOrthogonalPoints(expandPoints(route));
  return points.slice(2, -2);
}

export function moveWaypoint(
  waypoints: FlowchartPoint[],
  index: number,
  position: FlowchartPoint
): FlowchartPoint[] {
  if (!waypoints[index]) return waypoints;
  return waypoints.map((point, pointIndex) =>
    pointIndex === index ? { ...position } : point
  );
}

export function offsetRouteSegment(
  route: number[],
  segmentIndex: number,
  delta: FlowchartPoint
): FlowchartPoint[] {
  const points = normalizeOrthogonalPoints(expandPoints(route));
  if (segmentIndex <= 0 || segmentIndex >= points.length - 2) {
    return getManualWaypoints(route);
  }

  const start = points[segmentIndex];
  const end = points[segmentIndex + 1];
  const next = points.map((point) => ({ ...point }));

  if (start.y === end.y) {
    next[segmentIndex].y += delta.y;
    next[segmentIndex + 1].y += delta.y;
  } else if (start.x === end.x) {
    next[segmentIndex].x += delta.x;
    next[segmentIndex + 1].x += delta.x;
  }

  const sourceExit = points[1];
  const targetEntry = points.at(-2);
  return normalizeOrthogonalPoints(next.slice(1, -1)).filter(
    (point) =>
      (point.x !== sourceExit.x || point.y !== sourceExit.y) &&
      (!targetEntry ||
        point.x !== targetEntry.x ||
        point.y !== targetEntry.y)
  );
}
