import { Group, Path, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { FlowchartNode } from '@/types/flowchart';
import { buildShapePath } from '@/utils/shapePaths';

interface NodeRendererProps {
  node: FlowchartNode;
  isSelected?: boolean;
  interactive?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onMouseDown?: () => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  onDragStart?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
}

export function NodeRenderer({
  node,
  isSelected,
  interactive = true,
  draggable = interactive,
  onClick,
  onDoubleClick,
  onMouseDown,
  onContextMenu,
  onDragStart,
  onDragMove,
  onDragEnd,
}: NodeRendererProps) {
  const { x, y, width, height, label, style } = node;
  const fill = style.fill ?? '#ffffff';
  const stroke = style.stroke ?? '#334155';
  const strokeWidth = style.strokeWidth ?? 2;
  const fontSize = style.fontSize ?? 14;
  const textColor = style.textColor ?? '#0f172a';
  const fontFamily = style.fontFamily ?? 'Inter';
  const path = buildShapePath(node.type, width, height);

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      listening={interactive}
      onClick={(event) => {
        event.cancelBubble = true;
        onClick?.();
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        onClick?.();
      }}
      onDblClick={(event) => {
        event.cancelBubble = true;
        onDoubleClick?.();
      }}
      onMouseDown={(event) => {
        event.cancelBubble = true;
        onMouseDown?.();
      }}
      onContextMenu={(event) => {
        event.cancelBubble = true;
        onContextMenu?.(event);
      }}
      onDragStart={onDragStart}
      onDragMove={(event) => {
        const pos = event.target.position();
        onDragMove?.(pos.x, pos.y);
      }}
      onDragEnd={(event) => {
        const pos = event.target.position();
        onDragEnd?.(pos.x, pos.y);
      }}
    >
      {node.type === 'process' ? (
        <Rect
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : (
        <Path
          data={path}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}
      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={width + 8}
          height={height + 8}
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[4, 4]}
          listening={false}
        />
      )}
      {label && (
        <Text
          width={width}
          height={height}
          text={label}
          fontSize={fontSize}
          fill={textColor}
          fontFamily={fontFamily}
          align="center"
          verticalAlign="middle"
          wrap="word"
          listening={false}
        />
      )}
    </Group>
  );
}
