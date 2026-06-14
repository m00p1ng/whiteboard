import { Rect, Ellipse, Line, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape } from '@/types/shape';
import { Connector } from './Connector';

interface ShapeRendererProps {
  shape: Shape;
  isSelected: boolean;
  draggable?: boolean;
  onSelect: () => void;
  onDblClick?: () => void;
  onChange?: (updates: Partial<Shape>) => void;
  onContextMenu?: (e: KonvaEventObject<PointerEvent>) => void;
}

function renderShapeText(shape: Extract<Shape, { type: 'rect' | 'circle' }>) {
  if (!shape.text) return null;

  const bounds =
    shape.type === 'rect'
      ? {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        }
      : {
          x: shape.x - shape.radiusX,
          y: shape.y - shape.radiusY,
          width: shape.radiusX * 2,
          height: shape.radiusY * 2,
        };

  return (
    <Text
      {...bounds}
      text={shape.text}
      fill={shape.textColor ?? '#000000'}
      fontSize={shape.fontSize ?? 16}
      rotation={shape.rotation ?? 0}
      align="center"
      verticalAlign="middle"
      wrap="word"
      listening={false}
    />
  );
}

export function ShapeRenderer({ shape, isSelected, draggable = true, onSelect, onDblClick, onChange, onContextMenu }: ShapeRendererProps) {
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
        ? {
            radiusX: shape.radiusX * node.scaleX(),
            radiusY: shape.radiusY * node.scaleY(),
          }
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
    draggable,
    onClick: onSelect,
    onTap: onSelect,
    onDblClick: onDblClick,
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd,
    onContextMenu,
  };

  switch (shape.type) {
    case 'rect':
      return (
        <>
          <Rect {...common} width={shape.width} height={shape.height} />
          {renderShapeText(shape)}
        </>
      );
    case 'circle':
      return (
        <>
          <Ellipse
            {...common}
            radiusX={shape.radiusX}
            radiusY={shape.radiusY}
          />
          {renderShapeText(shape)}
        </>
      );
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
