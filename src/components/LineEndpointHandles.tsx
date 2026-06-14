import { Circle } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import type { LineShape, Shape } from '@/types/shape';
import { computeResizedLinePoints, type ViewportTransform } from '@/utils/geometry';

interface LineEndpointHandlesProps {
  shape: LineShape;
  viewport: ViewportTransform;
  onChange: (updates: Partial<Shape>) => void;
}

const HANDLE_RADIUS = 5;

export function LineEndpointHandles({
  shape,
  viewport,
  onChange,
}: LineEndpointHandlesProps) {
  const radius = HANDLE_RADIUS / viewport.scale;

  const handlePositions: [number, number][] = [
    [shape.x + shape.points[0], shape.y + shape.points[1]],
    [shape.x + shape.points[2], shape.y + shape.points[3]],
  ];

  const resolveDrag = (
    handleIndex: 0 | 1,
    e: KonvaEventObject<DragEvent>
  ) => {
    const node = e.target;
    const pos = node.position();
    const result = computeResizedLinePoints(
      shape.points,
      shape.x,
      shape.y,
      handleIndex,
      pos
    );
    if (!result) {
      const [x, y] = handlePositions[handleIndex];
      node.position({ x, y });
      return null;
    }
    return result;
  };

  const handleDragMove = (handleIndex: 0 | 1, e: KonvaEventObject<DragEvent>) => {
    const result = resolveDrag(handleIndex, e);
    if (!result) return;

    const stage = e.target.getStage();
    const lineNode = stage?.findOne(`#${shape.id}`) as Konva.Line | undefined;
    lineNode?.points(result);
    lineNode?.getLayer()?.batchDraw();
  };

  const handleDragEnd = (handleIndex: 0 | 1, e: KonvaEventObject<DragEvent>) => {
    const result = resolveDrag(handleIndex, e);
    if (!result) return;
    onChange({ points: result });
  };

  return (
    <>
      {handlePositions.map(([x, y], index) => (
        <Circle
          key={index}
          x={x}
          y={y}
          radius={radius}
          fill="#3b82f6"
          draggable
          onDragMove={(e) => handleDragMove(index as 0 | 1, e)}
          onDragEnd={(e) => handleDragEnd(index as 0 | 1, e)}
        />
      ))}
    </>
  );
}
