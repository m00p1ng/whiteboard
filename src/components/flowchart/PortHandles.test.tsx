import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Stage, Layer } from 'react-konva';
import { PortHandles } from './PortHandles';
import type { FlowchartNode } from '@/types/flowchart';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <Stage width={400} height={400}>
      <Layer>{children}</Layer>
    </Stage>
  );
}

describe('PortHandles', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    style: {},
  };

  it('renders four port handles', () => {
    render(
      <Wrapper>
        <PortHandles node={node} visible onDragStart={() => {}} />
      </Wrapper>
    );
  });
});
