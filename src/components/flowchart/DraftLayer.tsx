import { Arrow, Rect } from 'react-konva';
import type { FlowchartNode } from '@/types/flowchart';
import { NodeRenderer } from './NodeRenderer';

interface DraftLayerProps {
  draftNode?: FlowchartNode | null;
  draftEdgePoints?: number[] | null;
}

export function DraftLayer({ draftNode, draftEdgePoints }: DraftLayerProps) {
  return (
    <>
      {draftNode && <NodeRenderer node={draftNode} interactive={false} />}
      {draftEdgePoints && (
        <>
          <Arrow
            points={draftEdgePoints}
            stroke="#3b82f6"
            strokeWidth={2}
            dash={[4, 4]}
            fill="#3b82f6"
            pointerLength={10}
            pointerWidth={10}
            pointerAtEnding
            listening={false}
          />
          <Rect
            x={draftEdgePoints[draftEdgePoints.length - 2] - 4}
            y={draftEdgePoints[draftEdgePoints.length - 1] - 4}
            width={8}
            height={8}
            fill="#3b82f6"
            listening={false}
          />
        </>
      )}
    </>
  );
}
