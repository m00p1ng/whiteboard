import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteBoard as deleteBoardRecord,
  loadBoards,
  putBoard,
} from '@/db/boardDb';
import { initBoardStore, useBoardStore } from './boardStore';

vi.mock('@/db/boardDb', () => ({
  loadBoards: vi.fn(),
  putBoard: vi.fn(),
  deleteBoard: vi.fn(),
}));

const mockedLoadBoards = vi.mocked(loadBoards);
const mockedPutBoard = vi.mocked(putBoard);
const mockedDeleteBoard = vi.mocked(deleteBoardRecord);

beforeEach(() => {
  vi.clearAllMocks();
  mockedLoadBoards.mockResolvedValue([]);
  mockedPutBoard.mockResolvedValue(undefined);
  mockedDeleteBoard.mockResolvedValue(undefined);
  useBoardStore.setState({ boards: [], currentBoardId: null });
});

describe('boardStore', () => {
  it('hydrates boards from IndexedDB without opening one', async () => {
    mockedLoadBoards.mockResolvedValue([
      {
        id: 'existing-id',
        name: 'Existing',
        createdAt: 1,
        updatedAt: 2,
        shapes: {},
      },
    ]);

    await initBoardStore();

    expect(useBoardStore.getState()).toMatchObject({
      currentBoardId: null,
      boards: [{ id: 'existing-id', name: 'Existing' }],
    });
  });

  it('normalizes legacy circle radii during hydration', async () => {
    mockedLoadBoards.mockResolvedValue([
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
      } as never,
    ]);

    await initBoardStore();

    expect(useBoardStore.getState().boards[0].shapes.circle).toMatchObject({
      radiusX: 25,
      radiusY: 25,
    });
    expect(useBoardStore.getState().boards[0].shapes.circle).not.toHaveProperty(
      'radius'
    );
  });

  it('creates a board and writes only that board', () => {
    const id = useBoardStore.getState().createBoard('My board');
    const board = useBoardStore.getState().boards[0];

    expect(board).toMatchObject({
      id,
      name: 'My board',
      shapes: {},
    });
    expect(useBoardStore.getState().currentBoardId).toBe(id);
    expect(mockedPutBoard).toHaveBeenCalledWith(board);
  });

  it('renames a board and writes the updated record', () => {
    const id = useBoardStore.getState().createBoard('Old');
    mockedPutBoard.mockClear();

    useBoardStore.getState().renameBoard(id, 'New');

    const board = useBoardStore.getState().boards[0];
    expect(board.name).toBe('New');
    expect(mockedPutBoard).toHaveBeenCalledWith(board);
  });

  it('ignores an empty rename without writing', () => {
    const id = useBoardStore.getState().createBoard('Old');
    mockedPutBoard.mockClear();

    useBoardStore.getState().renameBoard(id, '   ');

    expect(useBoardStore.getState().boards[0].name).toBe('Old');
    expect(mockedPutBoard).not.toHaveBeenCalled();
  });

  it('deletes a board and clears the active id', () => {
    const id = useBoardStore.getState().createBoard();
    useBoardStore.getState().deleteBoard(id);

    expect(useBoardStore.getState().boards).toEqual([]);
    expect(useBoardStore.getState().currentBoardId).toBeNull();
    expect(mockedDeleteBoard).toHaveBeenCalledWith(id);
  });

  it('saves only the active board with its new shapes and timestamp', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValue(300);
    const id = useBoardStore.getState().createBoard('Diagram');
    mockedPutBoard.mockClear();

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

    const board = useBoardStore.getState().boards[0];
    expect(board).toMatchObject({
      id,
      updatedAt: 300,
      shapes: {
        rect: {
          type: 'rect',
          x: 10,
          y: 20,
        },
      },
    });
    expect(mockedPutBoard).toHaveBeenCalledWith(board);
  });

  it('keeps optimistic state changes when a database write rejects', async () => {
    mockedPutBoard.mockRejectedValueOnce(new Error('write failed'));

    const id = useBoardStore.getState().createBoard('Still visible');
    await Promise.resolve();

    expect(useBoardStore.getState().boards[0]).toMatchObject({
      id,
      name: 'Still visible',
    });
  });
});
