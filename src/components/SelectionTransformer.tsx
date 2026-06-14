import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import type { Shape } from '@/types/shape';

interface SelectionTransformerProps {
  selectedShape: Shape | null;
}

export function SelectionTransformer({ selectedShape }: SelectionTransformerProps) {
  const transformerRef = useRef<any>(null);

  useEffect(() => {
    if (transformerRef.current && selectedShape) {
      const node = transformerRef.current.getStage()?.findOne(`#${selectedShape.id}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedShape]);

  if (!selectedShape || selectedShape.type === 'connector' || selectedShape.type === 'line') return null;

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled
      enabledAnchors={[
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'middle-left',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ]}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) return oldBox;
        return newBox;
      }}
    />
  );
}
