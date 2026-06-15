import { Circle, Group, Line } from 'react-konva';
import type Konva from 'konva';
import type { FlowchartPoint } from '@/types/flowchart';
import {
  expandPoints,
  normalizeOrthogonalPoints,
} from '@/utils/orthogonalRouter';

export interface EdgeHandlesProps {
  points: number[];
  waypoints: FlowchartPoint[];
  onWaypointPreview: (index: number, point: FlowchartPoint) => void;
  onWaypointCommit: () => void;
  onSegmentPreview: (
    segmentIndex: number,
    delta: FlowchartPoint
  ) => void;
  onSegmentCommit: () => void;
  onEndpointPreview: (
    endpoint: 'source' | 'target',
    point: FlowchartPoint
  ) => void;
  onEndpointCommit: (
    endpoint: 'source' | 'target',
    point: FlowchartPoint
  ) => void;
}

function stopPointer(event: Konva.KonvaEventObject<Event>) {
  event.cancelBubble = true;
}

export function EdgeHandles({
  points,
  waypoints,
  onWaypointPreview,
  onWaypointCommit,
  onSegmentPreview,
  onSegmentCommit,
  onEndpointPreview,
  onEndpointCommit,
}: EdgeHandlesProps) {
  const route = normalizeOrthogonalPoints(expandPoints(points));
  const source = route[0];
  const target = route.at(-1);
  if (!source || !target) return null;

  return (
    <Group>
      <Circle
        data-testid="edge-endpoint-source"
        x={source.x}
        y={source.y}
        radius={6}
        fill="#ffffff"
        stroke="#3b82f6"
        strokeWidth={2}
        draggable
        onMouseDown={stopPointer}
        onTouchStart={stopPointer}
        onDragMove={(event) =>
          onEndpointPreview('source', {
            x: event.target.x(),
            y: event.target.y(),
          })
        }
        onDragEnd={(event) => {
          const point = { x: event.target.x(), y: event.target.y() };
          event.target.position(source);
          onEndpointCommit('source', point);
        }}
      />

      {waypoints.map((waypoint, index) => (
        <Circle
          key={`bend-${index}`}
          data-testid={`edge-bend-${index}`}
          x={waypoint.x}
          y={waypoint.y}
          radius={5}
          fill="#ffffff"
          stroke="#3b82f6"
          strokeWidth={2}
          draggable
          onMouseDown={stopPointer}
          onTouchStart={stopPointer}
          onDragMove={(event) =>
            onWaypointPreview(index, {
              x: event.target.x(),
              y: event.target.y(),
            })
          }
          onDragEnd={(event) => {
            event.target.position(waypoint);
            onWaypointCommit();
          }}
        />
      ))}

      {route.slice(1, -1).map((start, offset) => {
        const segmentIndex = offset + 1;
        const end = route[segmentIndex + 1];
        if (!end) return null;
        const horizontal = start.y === end.y;

        return (
          <Line
            key={`segment-${segmentIndex}`}
            data-testid={`edge-segment-${segmentIndex}`}
            points={[start.x, start.y, end.x, end.y]}
            stroke="rgba(0,0,0,0.001)"
            strokeWidth={14}
            hitStrokeWidth={14}
            draggable
            onMouseDown={stopPointer}
            onTouchStart={stopPointer}
            onDragMove={(event) =>
              onSegmentPreview(segmentIndex, {
                x: horizontal ? 0 : event.target.x(),
                y: horizontal ? event.target.y() : 0,
              })
            }
            onDragEnd={(event) => {
              event.target.position({ x: 0, y: 0 });
              onSegmentCommit();
            }}
          />
        );
      })}

      <Circle
        data-testid="edge-endpoint-target"
        x={target.x}
        y={target.y}
        radius={6}
        fill="#ffffff"
        stroke="#3b82f6"
        strokeWidth={2}
        draggable
        onMouseDown={stopPointer}
        onTouchStart={stopPointer}
        onDragMove={(event) =>
          onEndpointPreview('target', {
            x: event.target.x(),
            y: event.target.y(),
          })
        }
        onDragEnd={(event) => {
          const point = { x: event.target.x(), y: event.target.y() };
          event.target.position(target);
          onEndpointCommit('target', point);
        }}
      />
    </Group>
  );
}
