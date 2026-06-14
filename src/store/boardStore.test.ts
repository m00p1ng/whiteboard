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

  it('persists saved shapes and updates the edit timestamp', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(100);
    const id = useBoardStore.getState().createBoard('Diagram');
    now.mockReturnValue(300);

    useBoardStore.getState().saveCurrentBoard({
      rect: {
        id: 'rect',
        type: 'rect',
        x: 10,
        y: 20,
        width: 100,
        height: 60,
      },
    });

    const stored = JSON.parse(localStorage.getItem('whiteboard:boards')!);
    expect(stored[0].shapes.rect).toMatchObject({
      type: 'rect',
      x: 10,
      y: 20,
    });
    expect(stored[0].updatedAt).toBe(300);
    expect(useBoardStore.getState().boards[0].id).toBe(id);
  });

  it('loads saved shapes on a fresh import without reopening a board', async () => {
    localStorage.setItem(
      'whiteboard:boards',
      JSON.stringify([
        {
          id: 'saved-board',
          name: 'Saved board',
          createdAt: 1,
          updatedAt: 2,
          shapes: {
            text: {
              id: 'text',
              type: 'text',
              x: 5,
              y: 6,
              text: 'Persisted',
              fontSize: 18,
            },
          },
        },
      ])
    );

    vi.resetModules();
    const { useBoardStore: fresh } = await import('./boardStore');

    expect(fresh.getState().currentBoardId).toBeNull();
    expect(fresh.getState().boards[0].shapes.text).toMatchObject({
      text: 'Persisted',
    });
  });

  it('normalizes legacy circle radii on load', async () => {
    localStorage.setItem(
      'whiteboard:boards',
      JSON.stringify([
        {
          id: 'legacy-board',
          name: 'Legacy',
          createdAt: 1,
          updatedAt: 2,
          shapes: {
            circle: {
              id: 'circle',
              type: 'circle',
              x: 20,
              y: 30,
              radius: 25,
            },
          },
        },
      ])
    );

    vi.resetModules();
    const { useBoardStore: fresh } = await import('./boardStore');

    expect(fresh.getState().boards[0].shapes.circle).toMatchObject({
      type: 'circle',
      radiusX: 25,
      radiusY: 25,
    });
    expect(fresh.getState().boards[0].shapes.circle).not.toHaveProperty('radius');
  });

  it('keeps migrated ellipse radii on load', async () => {
    localStorage.setItem(
      'whiteboard:boards',
      JSON.stringify([
        {
          id: 'ellipse-board',
          name: 'Ellipse',
          createdAt: 1,
          updatedAt: 2,
          shapes: {
            ellipse: {
              id: 'ellipse',
              type: 'circle',
              x: 20,
              y: 30,
              radiusX: 50,
              radiusY: 20,
            },
          },
        },
      ])
    );

    vi.resetModules();
    const { useBoardStore: fresh } = await import('./boardStore');

    expect(fresh.getState().boards[0].shapes.ellipse).toMatchObject({
      radiusX: 50,
      radiusY: 20,
    });
  });

  it('uses default radii for invalid persisted circles', async () => {
    localStorage.setItem(
      'whiteboard:boards',
      JSON.stringify([
        {
          id: 'invalid-board',
          name: 'Invalid',
          createdAt: 1,
          updatedAt: 2,
          shapes: {
            circle: {
              id: 'circle',
              type: 'circle',
              x: 20,
              y: 30,
              radius: null,
            },
          },
        },
      ])
    );

    vi.resetModules();
    const { useBoardStore: fresh } = await import('./boardStore');

    expect(fresh.getState().boards[0].shapes.circle).toMatchObject({
      radiusX: 40,
      radiusY: 40,
    });
  });
});
