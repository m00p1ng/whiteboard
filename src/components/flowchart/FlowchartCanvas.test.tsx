import type { PropsWithChildren, Ref } from 'react';
import { forwardRef, useImperativeHandle } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FlowchartCanvas } from './FlowchartCanvas';
import { useFlowchartStore } from '@/store/flowchartStore';

const konvaMock = vi.hoisted(() => ({
  pointer: { x: 120, y: 80 },
}));

vi.mock('react-konva', () => ({
  Stage: forwardRef(
    (
      {
        children,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onClick,
      }: PropsWithChildren<{
        onMouseDown: (event: { target: unknown; evt: MouseEvent }) => void;
        onMouseMove: (event: { target: unknown; evt: MouseEvent }) => void;
        onMouseUp: (event: { target: unknown; evt: MouseEvent }) => void;
        onClick: (event: { target: unknown; evt: MouseEvent }) => void;
      }>,
      ref: Ref<{ getPointerPosition: () => { x: number; y: number } }>
    ) => {
      const stage = {
        getStage: () => stage,
        getPointerPosition: () => konvaMock.pointer,
      };
      useImperativeHandle(ref, () => stage);
      const event = () => ({
        target: stage,
        evt: new MouseEvent('click'),
      });

      return (
        <div>
          <button
            type="button"
            aria-label="mouse down"
            onClick={() => onMouseDown(event())}
          />
          <button
            type="button"
            aria-label="mouse move"
            onClick={() => onMouseMove(event())}
          />
          <button
            type="button"
            aria-label="mouse up"
            onClick={() => onMouseUp(event())}
          />
          <button
            type="button"
            aria-label="stage click"
            onClick={() => onClick(event())}
          />
          {children}
        </div>
      );
    }
  ),
  Layer: ({ children }: PropsWithChildren) => <>{children}</>,
}));

vi.mock('./NodeRenderer', () => ({
  NodeRenderer: () => null,
}));

vi.mock('./EdgeRenderer', () => ({
  EdgeRenderer: () => null,
}));

vi.mock('./PortHandles', () => ({
  PortHandles: () => null,
}));

vi.mock('./DraftLayer', () => ({
  DraftLayer: () => null,
}));

vi.mock('@/components/GridBackground', () => ({
  GridBackground: () => null,
}));

vi.mock('./LabelEditor', () => ({
  LabelEditor: () => null,
}));

beforeEach(() => {
  useFlowchartStore.setState({
    nodes: {},
    edges: {},
    selection: null,
    tool: 'select',
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    showGrid: true,
    snap: true,
    editingNodeId: null,
    undoStack: [],
    redoStack: [],
  });
});

describe('FlowchartCanvas', () => {
  it('renders the canvas', () => {
    const { container } = render(<FlowchartCanvas />);
    expect(container.querySelector('canvas')).toBeFalsy();
  });

  it('adds a node when clicking the stage with a node tool selected', () => {
    act(() => {
      useFlowchartStore.getState().setTool('process');
    });
    render(<FlowchartCanvas />);

    fireEvent.click(screen.getByRole('button', { name: 'stage click' }));

    expect(Object.keys(useFlowchartStore.getState().nodes)).toHaveLength(1);
    expect(useFlowchartStore.getState().tool).toBe('select');
  });
});
