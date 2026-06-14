import { Rect, Circle, Line, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape } from '@/types/shape';
import { Connector } from './Connector';

interface ShapeRendererProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
  onChange?: (updates: Partial<Shape>) => void;
}

export function ShapeRenderer({ shape, isSelected, onSelect, onChange }: ShapeRendererProps) {
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    onChange?.({ x: e.target.x(), y: e.target.y() });
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
    onDragEnd: handleDragEnd,
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
