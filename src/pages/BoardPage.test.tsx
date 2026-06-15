import { describe, it, expect, beforeEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { BoardPage } from './BoardPage';
import { useBoardStore } from '@/store/boardStore';
import { useFlowchartStore } from '@/store/flowchartStore';

beforeEach(() => {
  useBoardStore.setState({ boards: [], currentBoardId: null });
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

describe('BoardPage', () => {
  it('renders nothing when no board is open', () => {
    const { container } = render(<BoardPage />);
    expect(container.firstChild).toBeNull();
  });

  it('renders canvas when a board is open', () => {
    const id = useBoardStore.getState().createBoard('Test');
    useBoardStore.getState().openBoard(id);
    const { container } = render(<BoardPage />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('restores the saved viewport when a board is opened', () => {
    const id = useBoardStore.getState().createBoard('Test');
    useBoardStore.setState({
      boards: [
        {
          id,
          name: 'Test',
          createdAt: 1,
          updatedAt: 2,
          nodes: {},
          edges: {},
          viewport: { scale: 1.5, offsetX: -100, offsetY: -50 },
        },
      ],
    });
    useBoardStore.getState().openBoard(id);

    render(<BoardPage />);

    expect(useFlowchartStore.getState().viewport).toEqual({
      scale: 1.5,
      offsetX: -100,
      offsetY: -50,
    });
  });

  it('saves viewport changes back to the board', () => {
    const id = useBoardStore.getState().createBoard('Test');
    useBoardStore.getState().openBoard(id);

    render(<BoardPage />);

    act(() => {
      useFlowchartStore.getState().setViewport({ scale: 2, offsetX: -300, offsetY: -200 });
    });

    const board = useBoardStore.getState().boards.find((b) => b.id === id);
    expect(board?.viewport).toEqual({ scale: 2, offsetX: -300, offsetY: -200 });
  });
});
