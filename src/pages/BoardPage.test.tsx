import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardPage } from './BoardPage';
import { useBoardStore } from '@/store/boardStore';
import { useEditorStore } from '@/store/editorStore';
import type { RectShape } from '@/types/shape';

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

const savedShape: RectShape = {
  id: 'saved',
  type: 'rect',
  x: 10,
  y: 20,
  width: 100,
  height: 60,
};

beforeEach(() => {
  localStorage.clear();
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
  localStorage.setItem(
    'whiteboard:boards',
    JSON.stringify(useBoardStore.getState().boards)
  );
});

describe('BoardPage persistence', () => {
  it('hydrates saved shapes without overwriting storage with the initial editor state', () => {
    render(<BoardPage />);

    expect(useEditorStore.getState().shapes).toEqual({
      [savedShape.id]: savedShape,
    });

    const stored = JSON.parse(localStorage.getItem('whiteboard:boards')!);
    expect(stored[0].shapes).toEqual({ [savedShape.id]: savedShape });
    expect(stored[0].updatedAt).toBe(200);
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
        radius: 20,
      });
    });

    const board = useBoardStore.getState().boards[0];
    expect(board.shapes).toHaveProperty('saved');
    expect(board.shapes).toHaveProperty('new-shape');
    expect(board.updatedAt).toBe(500);

    const stored = JSON.parse(localStorage.getItem('whiteboard:boards')!);
    expect(stored[0].shapes).toHaveProperty('new-shape');
    expect(stored[0].updatedAt).toBe(500);
  });
});
