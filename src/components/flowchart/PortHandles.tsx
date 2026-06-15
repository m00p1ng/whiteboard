import { Circle, Group } from 'react-konva';
import type { FlowchartNode, PortId } from '@/types/flowchart';
import { getPortPoint } from '@/utils/portGeometry';

interface PortHandlesProps {
  node: FlowchartNode;
  visible: boolean;
  onDragStart: (port: PortId, x: number, y: number) => void;
}

const PORTS: PortId[] = ['top', 'right', 'bottom', 'left'];

export function PortHandles({ node, visible, onDragStart }: PortHandlesProps) {
  if (!visible) return null;

  return (
    <Group>
      {PORTS.map((port) => {
        const point = getPortPoint(node, port);
        return (
          <Circle
            key={port}
            x={point.x}
            y={point.y}
            radius={5}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2}
            draggable
            onMouseDown={(event) => event.cancelBubble = true}
            onTouchStart={(event) => event.cancelBubble = true}
            onDragStart={() => onDragStart(port, point.x, point.y)}
          />
        );
      })}
    </Group>
  );
}
