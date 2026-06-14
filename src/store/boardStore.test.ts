import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBoardStore } from './boardStore';

beforeEach(() => {
  localStorage.removeItem('whiteboard:boards');
  useBoardStore.setState({ boards: [], currentBoardId: null });
});

describe('boardStore', () => {
  it('creates a board with a default name', () => {
    const id = useBoardStore.getState().createBoard();
    const board = useBoardStore.getState().boards[0];
    expect(board).toBeDefined();
    expect(board.id).toBe(id);
    expect(board.name).toBe('Untitled board');
    expect(board.shapes).toEqual({});
    expect(useBoardStore.getState().currentBoardId).toBe(id);
  });

  it('creates a board with a custom name', () => {
    const id = useBoardStore.getState().createBoard('My board');
    const board = useBoardStore.getState().boards.find((b) => b.id === id);
    expect(board?.name).toBe('My board');
  });

  it('renames a board', () => {
    const id = useBoardStore.getState().createBoard('Old');
    useBoardStore.getState().renameBoard(id, 'New');
    const board = useBoardStore.getState().boards.find((b) => b.id === id);
    expect(board?.name).toBe('New');
  });

  it('ignores empty rename', () => {
    const id = useBoardStore.getState().createBoard('Old');
    useBoardStore.getState().renameBoard(id, '   ');
    const board = useBoardStore.getState().boards.find((b) => b.id === id);
    expect(board?.name).toBe('Old');
  });

  it('deletes a board', () => {
    const id = useBoardStore.getState().createBoard();
    useBoardStore.getState().deleteBoard(id);
    expect(useBoardStore.getState().boards).toHaveLength(0);
  });

  it('clears current board id when deleting the active board', () => {
    const id = useBoardStore.getState().createBoard();
    useBoardStore.getState().deleteBoard(id);
    expect(useBoardStore.getState().currentBoardId).toBeNull();
  });

  it('persists boards to localStorage', () => {
    const id = useBoardStore.getState().createBoard('Persisted');
    const raw = localStorage.getItem('whiteboard:boards');
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(id);
    expect(parsed[0].name).toBe('Persisted');
  });

  it('loads boards from localStorage on import', async () => {
    const stored = [
      {
        id: 'existing-id',
        name: 'Existing',
        createdAt: 1,
        updatedAt: 2,
        shapes: {},
      },
    ];
    localStorage.setItem('whiteboard:boards', JSON.stringify(stored));
    vi.resetModules();
    const { useBoardStore: fresh } = await import('./boardStore');
    expect(fresh.getState().boards).toHaveLength(1);
    expect(fresh.getState().boards[0].id).toBe('existing-id');
  });
});
