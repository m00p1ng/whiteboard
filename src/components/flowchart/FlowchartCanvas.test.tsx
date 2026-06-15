import type { PropsWithChildren, Ref } from 'react';
import { forwardRef, useImperativeHandle } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FlowchartCanvas } from './FlowchartCanvas';
import { useFlowchartStore } from '@/store/flowchartStore';

const konvaMock = vi.hoisted(() => ({
  pointer: { x: 120, y: 80 },
}));
const componentMock = vi.hoisted(() => ({
  edgeRendererProps: undefined as Record<string, unknown> | undefined,
  edgeHandleProps: undefined as Record<string, unknown> | undefined,
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
  EdgeRenderer: (props: Record<string, unknown>) => {
    componentMock.edgeRendererProps = props;
    return (
      <button
        type="button"
        data-testid="edge"
        onClick={() => (props.onClick as (() => void) | undefined)?.()}
      />
    );
  },
}));

vi.mock('./EdgeHandles', () => ({
  EdgeHandles: (props: Record<string, unknown>) => {
    componentMock.edgeHandleProps = props;
    return <div data-testid="edge-handles" />;
  },
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
  componentMock.edgeRendererProps = undefined;
  componentMock.edgeHandleProps = undefined;
  konvaMock.pointer = { x: 120, y: 80 };
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

function seedEditableGraph() {
  useFlowchartStore.setState({
    nodes: {
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
      c: {
        id: 'c',
        type: 'process',
        x: 400,
        y: 100,
        width: 100,
        height: 60,
        style: {},
      },
    },
    edges: {
      e1: {
        id: 'e1',
        fromNodeId: 'a',
        fromPort: 'right',
        toNodeId: 'b',
        toPort: 'left',
        style: {},
      },
    },
    selection: { type: 'edge', id: 'e1' },
    undoStack: [],
    redoStack: [],
  });
}

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

  it('shows handles only for the selected edge', () => {
    seedEditableGraph();

    render(<FlowchartCanvas />);

    expect(screen.getByTestId('edge-handles')).toBeInTheDocument();
  });

  it('commits one waypoint update after a bend preview', () => {
    seedEditableGraph();
    render(<FlowchartCanvas />);

    act(() => {
      (
        componentMock.edgeHandleProps?.onWaypointPreview as (
          index: number,
          point: { x: number; y: number }
        ) => void
      )(0, { x: 150, y: 80 });
    });
    expect(componentMock.edgeRendererProps?.previewPoints).toBeDefined();

    act(() => {
      (
        componentMock.edgeHandleProps?.onWaypointCommit as () => void
      )();
    });
    expect(useFlowchartStore.getState().edges.e1.waypoints).toContainEqual({
      x: 150,
      y: 80,
    });
    expect(useFlowchartStore.getState().undoStack).toHaveLength(1);
  });

  it('cancels an endpoint drop outside a port', () => {
    seedEditableGraph();
    render(<FlowchartCanvas />);

    act(() => {
      (
        componentMock.edgeHandleProps?.onEndpointCommit as (
          endpoint: 'source' | 'target',
          point: { x: number; y: number }
        ) => void
      )('target', { x: 1000, y: 1000 });
    });

    expect(useFlowchartStore.getState().edges.e1.toNodeId).toBe('b');
    expect(useFlowchartStore.getState().undoStack).toHaveLength(0);
  });

  it('reconnects an endpoint dropped on a visible port', () => {
    seedEditableGraph();
    render(<FlowchartCanvas />);

    act(() => {
      (
        componentMock.edgeHandleProps?.onEndpointCommit as (
          endpoint: 'source' | 'target',
          point: { x: number; y: number }
        ) => void
      )('target', { x: 450, y: 100 });
    });

    expect(useFlowchartStore.getState().edges.e1).toMatchObject({
      toNodeId: 'c',
      toPort: 'top',
    });
    expect(useFlowchartStore.getState().undoStack).toHaveLength(1);
  });
});
