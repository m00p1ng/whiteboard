import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Stage, Layer } from 'react-konva';
import { NodeRenderer } from './NodeRenderer';
import type { FlowchartNode } from '@/types/flowchart';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <Stage width={400} height={400}>
      <Layer>{children}</Layer>
    </Stage>
  );
}

describe('NodeRenderer', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 10,
    y: 20,
    width: 100,
    height: 60,
    label: 'Step 1',
    style: { fill: '#ffffff', stroke: '#000000', strokeWidth: 2 },
  };

  it('renders without crashing', () => {
    render(
      <Wrapper>
        <NodeRenderer node={node} />
      </Wrapper>
    );
  });
});
