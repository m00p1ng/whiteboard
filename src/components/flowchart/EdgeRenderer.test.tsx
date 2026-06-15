import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { Stage, Layer } from 'react-konva';
import { EdgeRenderer } from './EdgeRenderer';
import type { FlowchartEdge, FlowchartNode } from '@/types/flowchart';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <Stage width={400} height={400}>
      <Layer>{children}</Layer>
    </Stage>
  );
}

describe('EdgeRenderer', () => {
  const nodes: Record<string, FlowchartNode> = {
    a: { id: 'a', type: 'process', x: 0, y: 0, width: 100, height: 60, style: {} },
    b: { id: 'b', type: 'process', x: 200, y: 150, width: 100, height: 60, style: {} },
  };

  const edge: FlowchartEdge = {
    id: 'e1',
    fromNodeId: 'a',
    toNodeId: 'b',
    fromPort: 'right',
    toPort: 'left',
    style: {},
  };

  it('renders without crashing', () => {
    render(
      <Wrapper>
        <EdgeRenderer edge={edge} nodes={nodes} />
      </Wrapper>
    );
  });
});
