import type { PropsWithChildren } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EdgeRenderer } from './EdgeRenderer';
import type { FlowchartEdge, FlowchartNode } from '@/types/flowchart';

vi.mock('react-konva', () => ({
  Group: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Line: (props: Record<string, unknown>) => (
    <button
      type="button"
      data-testid={props['data-testid'] as string}
      data-props={JSON.stringify(props)}
      onClick={() =>
        (props.onClick as ((event: { cancelBubble: boolean }) => void) | undefined)?.({
          cancelBubble: false,
        })
      }
    />
  ),
  Arrow: (props: Record<string, unknown>) => (
    <div
      data-testid={props['data-testid'] as string}
      data-props={JSON.stringify(props)}
    />
  ),
  Text: (props: Record<string, unknown>) => (
    <div
      data-testid={props['data-testid'] as string}
      data-props={JSON.stringify(props)}
    />
  ),
}));

function readProps(testId: string) {
  return JSON.parse(screen.getByTestId(testId).getAttribute('data-props')!);
}

describe('EdgeRenderer', () => {
  const nodes: Record<string, FlowchartNode> = {
    a: {
      id: 'a',
      type: 'process',
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      style: {},
    },
    b: {
      id: 'b',
      type: 'process',
      x: 200,
      y: 150,
      width: 100,
      height: 60,
      style: {},
    },
  };

  const edge: FlowchartEdge = {
    id: 'e1',
    fromNodeId: 'a',
    toNodeId: 'b',
    fromPort: 'right',
    toPort: 'left',
    style: {},
  };

  it('renders a wide transparent hit path that selects the edge', () => {
    const onClick = vi.fn();

    render(<EdgeRenderer edge={edge} nodes={nodes} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('edge-hit-path'));

    expect(onClick).toHaveBeenCalledOnce();
    expect(readProps('edge-hit-path')).toMatchObject({
      strokeWidth: 14,
    });
  });

  it('renders preview points instead of the stored route', () => {
    const previewPoints = [100, 30, 150, 30, 150, 180, 200, 180];

    render(
      <EdgeRenderer
        edge={edge}
        nodes={nodes}
        previewPoints={previewPoints}
      />
    );

    expect(readProps('edge-visible-path').points).toEqual(previewPoints);
  });
});
