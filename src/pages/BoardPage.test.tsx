import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardPage } from './BoardPage';
import { putBoard } from '@/db/boardDb';
import { useBoardStore } from '@/store/boardStore';
import { useEditorStore } from '@/store/editorStore';
import type { RectShape } from '@/types/shape';

vi.mock('@/db/boardDb', () => ({
  loadBoards: vi.fn(),
  putBoard: vi.fn().mockResolvedValue(undefined),
  deleteBoard: vi.fn(),
}));
vi.mock('@/components/Canvas', () => ({
  Canvas: () => <div>Canvas</div>,
}));
vi.mock('@/components/LeftToolbar', () => ({
  LeftToolbar: () => null,
}));
vi.mock('@/components/Minimap', () => ({
  Minimap: () => null,
}));
vi.mock('@/components/TopBar', () => ({
  TopBar: () => null,
}));
vi.mock('@/components/ZoomControls', () => ({
  ZoomControls: () => null,
}));
vi.mock('@/hooks/useHotkeys', () => ({
  useHotkeys: () => undefined,
}));

const mockedPutBoard = vi.mocked(putBoard);

const savedShape: RectShape = {
  id: 'saved',
  type: 'rect',
  x: 10,
  y: 20,
  width: 100,
  height: 60,
};

beforeEach(() => {
  mockedPutBoard.mockClear();
  useEditorStore.getState().reset();
  useBoardStore.setState({
    boards: [
      {
        id: 'board-1',
        name: 'Persisted board',
        createdAt: 100,
        updatedAt: 200,
        shapes: { [savedShape.id]: savedShape },
      },
    ],
    currentBoardId: 'board-1',
  });
});

describe('BoardPage persistence', () => {
  it('hydrates saved shapes without overwriting storage with the initial editor state', () => {
    render(<BoardPage />);

    expect(useEditorStore.getState().shapes).toEqual({
      [savedShape.id]: savedShape,
    });

    expect(mockedPutBoard).not.toHaveBeenCalled();
    expect(useBoardStore.getState().boards[0]).toMatchObject({
      shapes: { [savedShape.id]: savedShape },
      updatedAt: 200,
    });
  });

  it('persists the first shape change after hydration', () => {
    vi.spyOn(Date, 'now').mockReturnValue(500);
    render(<BoardPage />);

    act(() => {
      useEditorStore.getState().addShape({
        id: 'new-shape',
        type: 'circle',
        x: 30,
        y: 40,
        radiusX: 20,
        radiusY: 20,
      });
    });

    const board = useBoardStore.getState().boards[0];
    expect(board.shapes).toHaveProperty('saved');
    expect(board.shapes).toHaveProperty('new-shape');
    expect(board.updatedAt).toBe(500);

    expect(mockedPutBoard).toHaveBeenCalledWith(board);
  });
});

describe('BoardPage shape properties panel', () => {
  it('shows fields for the selected shape and swaps when selection changes', () => {
    const shapeA: RectShape = {
      id: 'a',
      type: 'rect',
      x: 1,
      y: 2,
      width: 10,
      height: 20,
      fill: '#111111',
    };
    const shapeB: RectShape = {
      id: 'b',
      type: 'rect',
      x: 3,
      y: 4,
      width: 30,
      height: 40,
      fill: '#222222',
    };

    useBoardStore.setState({
      boards: [
        {
          id: 'board-1',
          name: 'Persisted board',
          createdAt: 100,
          updatedAt: 200,
          shapes: { a: shapeA, b: shapeB },
        },
      ],
      currentBoardId: 'board-1',
    });

    render(<BoardPage />);

    act(() => {
      useEditorStore.getState().setSelectedId('a');
    });
    expect(screen.getByLabelText('X')).toHaveValue(1);

    act(() => {
      useEditorStore.getState().setSelectedId('b');
    });
    expect(screen.getByLabelText('X')).toHaveValue(3);
  });
});
