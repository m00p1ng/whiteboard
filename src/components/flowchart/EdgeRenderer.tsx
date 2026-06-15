import { Arrow, Group, Text } from 'react-konva';
import type { FlowchartEdge, FlowchartNode } from '@/types/flowchart';
import { computeOrthogonalPath } from '@/utils/orthogonalRouter';

interface EdgeRendererProps {
  edge: FlowchartEdge;
  nodes: Record<string, FlowchartNode>;
  isSelected?: boolean;
  onClick?: () => void;
}

export function EdgeRenderer({
  edge,
  nodes,
  isSelected,
  onClick,
}: EdgeRendererProps) {
  const source = nodes[edge.fromNodeId];
  const target = nodes[edge.toNodeId];
  if (!source || !target) return null;

  const points = computeOrthogonalPath(
    source,
    edge.fromPort,
    target,
    edge.toPort
  );

  const stroke = edge.style.stroke ?? '#334155';
  const strokeWidth = edge.style.strokeWidth ?? 2;
  const dash = edge.style.dash;
  const hasArrow = edge.style.arrowhead !== 'none';

  const midX = points[points.length - 4] ?? points[0];
  const midY = points[points.length - 3] ?? points[1];

  return (
    <Group
      onClick={(event) => {
        event.cancelBubble = true;
        onClick?.();
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        onClick?.();
      }}
    >
      <Arrow
        points={points}
        stroke={isSelected ? '#3b82f6' : stroke}
        strokeWidth={strokeWidth}
        dash={dash}
        fill={stroke}
        pointerLength={hasArrow ? 10 : 0}
        pointerWidth={hasArrow ? 10 : 0}
        pointerAtEnding={hasArrow}
        listening={false}
      />
      {edge.label && (
        <Text
          x={midX - 40}
          y={midY - 10}
          width={80}
          text={edge.label}
          fontSize={12}
          fill={stroke}
          align="center"
          listening={false}
        />
      )}
    </Group>
  );
}
