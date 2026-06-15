import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { NodeRenderer } from './NodeRenderer';
import type { FlowchartNode } from '@/types/flowchart';

vi.mock('react-konva', () => ({
  Group: ({
    children,
    onContextMenu,
  }: {
    children: React.ReactNode;
    onContextMenu?: (e: unknown) => void;
  }) => (
    <div
      data-testid="group"
      onContextMenu={(e) =>
        onContextMenu?.({ evt: e.nativeEvent, cancelBubble: false } as unknown)
      }
    >
      {children}
    </div>
  ),
  Rect: () => <div data-testid="rect" />,
  Text: () => null,
  Path: () => null,
}));

describe('NodeRenderer', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    style: {},
  };

  it('forwards context menu events', () => {
    const handleContextMenu = vi.fn();
    const { getByTestId } = render(
      <NodeRenderer node={node} onContextMenu={handleContextMenu} />
    );

    const event = new MouseEvent('contextmenu', { bubbles: true });
    getByTestId('group').dispatchEvent(event);

    expect(handleContextMenu).toHaveBeenCalled();
  });
});
