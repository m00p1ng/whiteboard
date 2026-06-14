import { Circle, Ellipse, Line, Rect, Text } from 'react-konva';
import type { Shape } from '@/types/shape';

interface CreationPreviewProps {
  shape?: Shape | null;
  connectorPoints?: [number, number, number, number] | null;
}

const common = {
  stroke: '#2563eb',
  strokeWidth: 2,
  dash: [8, 6],
  listening: false,
};

function PreviewEndpoints({
  points,
}: {
  points: [number, number, number, number];
}) {
  return (
    <>
      <Circle
        x={points[0]}
        y={points[1]}
        radius={4}
        fill="#2563eb"
        listening={false}
      />
      <Circle
        x={points[2]}
        y={points[3]}
        radius={4}
        fill="#fff"
        stroke="#2563eb"
        strokeWidth={2}
        listening={false}
      />
    </>
  );
}

export function CreationPreview({
  shape,
  connectorPoints,
}: CreationPreviewProps) {
  if (connectorPoints) {
    return (
      <>
        <Line {...common} points={connectorPoints} />
        <PreviewEndpoints points={connectorPoints} />
      </>
    );
  }

  if (!shape) return null;

  switch (shape.type) {
    case 'rect':
      return (
        <Rect
          {...common}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill="rgba(37, 99, 235, 0.15)"
        />
      );
    case 'circle':
      return (
        <Ellipse
          {...common}
          x={shape.x}
          y={shape.y}
          radiusX={shape.radiusX}
          radiusY={shape.radiusY}
          fill="rgba(37, 99, 235, 0.15)"
        />
      );
    case 'line':
      return (
        <>
          <Line {...common} points={shape.points} />
          <PreviewEndpoints points={shape.points} />
        </>
      );
    case 'text':
      return (
        <Text
          {...common}
          x={shape.x}
          y={shape.y}
          text={shape.text}
          fontSize={shape.fontSize}
          fill="#2563eb"
        />
      );
    default:
      return null;
  }
}
