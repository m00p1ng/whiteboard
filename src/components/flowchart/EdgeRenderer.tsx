import { Arrow, Group, Line, Text } from 'react-konva';
import type Konva from 'konva';
import type { FlowchartEdge, FlowchartNode } from '@/types/flowchart';
import { computeOrthogonalPath } from '@/utils/orthogonalRouter';

interface EdgeRendererProps {
  edge: FlowchartEdge;
  nodes: Record<string, FlowchartNode>;
  isSelected?: boolean;
  previewPoints?: number[];
  onClick?: () => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
}

export function EdgeRenderer({
  edge,
  nodes,
  isSelected,
  previewPoints,
  onClick,
  onContextMenu,
}: EdgeRendererProps) {
  const source = nodes[edge.fromNodeId];
  const target = nodes[edge.toNodeId];
  if (!source || !target) return null;

  const points =
    previewPoints ??
    computeOrthogonalPath(
      source,
      edge.fromPort,
      target,
      edge.toPort,
      8,
      edge.waypoints
    );

  const stroke = edge.style.stroke ?? '#334155';
  const strokeWidth = edge.style.strokeWidth ?? 2;
  const dash = edge.style.dash;
  const hasArrow = edge.style.arrowhead !== 'none';

  const midpointIndex = Math.floor((points.length / 2 - 1) / 2) * 2;
  const midX = points[midpointIndex] ?? points[0];
  const midY = points[midpointIndex + 1] ?? points[1];

  return (
    <Group>
      <Line
        data-testid="edge-hit-path"
        points={points}
        stroke="rgba(0,0,0,0.001)"
        strokeWidth={Math.max(strokeWidth + 12, 14)}
        hitStrokeWidth={Math.max(strokeWidth + 12, 14)}
        onClick={(event) => {
          event.cancelBubble = true;
          onClick?.();
        }}
        onTap={(event) => {
          event.cancelBubble = true;
          onClick?.();
        }}
        onContextMenu={(event) => {
          event.cancelBubble = true;
          onContextMenu?.(event);
        }}
      />
      <Arrow
        data-testid="edge-visible-path"
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
