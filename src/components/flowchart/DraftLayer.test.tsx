import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Stage, Layer } from 'react-konva';
import { DraftLayer } from './DraftLayer';
import type { FlowchartNode } from '@/types/flowchart';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <Stage width={400} height={400}>
      <Layer>{children}</Layer>
    </Stage>
  );
}

describe('DraftLayer', () => {
  const node: FlowchartNode = {
    id: 'draft',
    type: 'process',
    x: 50,
    y: 50,
    width: 100,
    height: 60,
    style: {},
  };

  it('renders a draft node', () => {
    render(
      <Wrapper>
        <DraftLayer draftNode={node} />
      </Wrapper>
    );
  });

  it('renders a draft edge', () => {
    render(
      <Wrapper>
        <DraftLayer draftEdgePoints={[0, 0, 100, 100]} />
      </Wrapper>
    );
  });
});
