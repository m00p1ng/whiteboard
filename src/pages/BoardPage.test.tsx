import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BoardPage } from './BoardPage';
import { useBoardStore } from '@/store/boardStore';
import { useFlowchartStore } from '@/store/flowchartStore';
import { vi, beforeEach } from 'vitest';

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
});
