import { Layer, Shape } from 'react-konva';
import type { Viewport } from '@/store/editorStore';
import { drawGrid } from '@/utils/grid';

export interface GridBackgroundProps {
  viewport: Viewport;
  visible: boolean;
  width: number;
  height: number;
}

export function GridBackground({
  viewport,
  visible,
  width,
  height,
}: GridBackgroundProps) {
  if (!visible) return null;

  return (
    <Layer listening={false}>
      <Shape
        sceneFunc={(context, shape) => {
          drawGrid(context as never, viewport, width, height);
          context.fillStrokeShape(shape);
        }}
      />
    </Layer>
  );
}
