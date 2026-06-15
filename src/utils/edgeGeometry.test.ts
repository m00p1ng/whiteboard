import { describe, expect, it } from 'vitest';
import {
  getManualWaypoints,
  moveWaypoint,
  offsetRouteSegment,
} from './edgeGeometry';

describe('edgeGeometry', () => {
  it('converts an automatic route to interior manual waypoints', () => {
    expect(
      getManualWaypoints([
        100, 30, 108, 30, 108, 105, 192, 105, 192, 180, 200, 180,
      ])
    ).toEqual([
      { x: 108, y: 105 },
      { x: 192, y: 105 },
    ]);
  });

  it('moves one persisted waypoint without mutating the input', () => {
    const input = [
      { x: 120, y: 80 },
      { x: 180, y: 80 },
    ];

    expect(moveWaypoint(input, 0, { x: 130, y: 100 })).toEqual([
      { x: 130, y: 100 },
      { x: 180, y: 80 },
    ]);
    expect(input[0]).toEqual({ x: 120, y: 80 });
  });

  it('offsets an interior horizontal segment with two bends', () => {
    const route = [
      0, 0, 8, 0, 8, 40, 100, 40, 100, 80, 108, 80,
    ];

    expect(offsetRouteSegment(route, 2, { x: 0, y: 20 })).toEqual([
      { x: 8, y: 60 },
      { x: 100, y: 60 },
    ]);
  });

  it('ignores movement parallel to the segment', () => {
    const route = [
      0, 0, 8, 0, 8, 40, 100, 40, 100, 80, 108, 80,
    ];

    expect(offsetRouteSegment(route, 2, { x: 30, y: 0 })).toEqual(
      getManualWaypoints(route)
    );
  });

  it('does not offset endpoint-adjacent segments', () => {
    const route = [0, 0, 8, 0, 8, 40, 100, 40, 108, 40];

    expect(offsetRouteSegment(route, 0, { x: 0, y: 20 })).toEqual(
      getManualWaypoints(route)
    );
  });
});
