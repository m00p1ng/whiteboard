import { Rect, Circle, Line, Text } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape } from '@/types/shape';
import { Connector } from './Connector';

interface ShapeRendererProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
  onDblClick?: () => void;
  onChange?: (updates: Partial<Shape>) => void;
}

export function ShapeRenderer({ shape, isSelected, onSelect, onDblClick, onChange }: ShapeRendererProps) {
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    onChange?.({ x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    const node = e.target;
    onChange?.({
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      ...(shape.type === 'rect'
        ? { width: node.width() * node.scaleX(), height: node.height() * node.scaleY() }
        : {}),
      ...(shape.type === 'circle'
        ? { radius: (node as unknown as Konva.Circle).radius() * node.scaleX() }
        : {}),
    });
    node.scaleX(1);
    node.scaleY(1);
  };

  const common = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation ?? 0,
    fill: shape.fill,
    stroke: isSelected ? '#3b82f6' : shape.stroke ?? '#000',
    strokeWidth: shape.strokeWidth ?? 2,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDblClick: onDblClick,
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd,
  };

  switch (shape.type) {
    case 'rect':
      return <Rect {...common} width={shape.width} height={shape.height} />;
    case 'circle':
      return <Circle {...common} radius={shape.radius} />;
    case 'line':
      return <Line {...common} points={shape.points} fill={undefined} />;
    case 'text':
      return (
        <Text
          {...common}
          text={shape.text}
          fontSize={shape.fontSize}
          fill={shape.fill ?? '#000'}
        />
      );
    case 'connector':
      return <Connector connector={shape} />;
    default:
      return null;
  }
}
