import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { EdgeRenderer } from './EdgeRenderer';
import type { FlowchartEdge, FlowchartNode } from '@/types/flowchart';

vi.mock('react-konva', () => ({
  Group: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="group">{children}</div>
  ),
  Line: ({ onContextMenu }: { onContextMenu?: (e: unknown) => void }) => (
    <div
      data-testid="line"
      onContextMenu={(e) =>
        onContextMenu?.({ evt: e.nativeEvent, cancelBubble: false } as unknown)
      }
    />
  ),
  Arrow: () => <div data-testid="arrow" />,
  Text: () => null,
}));

vi.mock('@/utils/orthogonalRouter', () => ({
  computeOrthogonalPath: () => [0, 0, 100, 0],
}));

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
      y: 0,
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

  it('forwards context menu events', () => {
    const handleContextMenu = vi.fn();
    const { getByTestId } = render(
      <EdgeRenderer edge={edge} nodes={nodes} onContextMenu={handleContextMenu} />
    );

    const event = new MouseEvent('contextmenu', { bubbles: true });
    getByTestId('line').dispatchEvent(event);

    expect(handleContextMenu).toHaveBeenCalled();
  });
});
