import { beforeEach, describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { deleteBoard, loadBoards, putBoard } from './boardDb';
import type { Board } from '@/store/boardStore';

const firstBoard: Board = {
  id: 'board-1',
  name: 'First',
  createdAt: 100,
  updatedAt: 100,
  shapes: {},
};

const secondBoard: Board = {
  id: 'board-2',
  name: 'Second',
  createdAt: 200,
  updatedAt: 200,
  shapes: {},
};

beforeEach(async () => {
  const db = await openDB('whiteboard', 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('boards')) {
        database.createObjectStore('boards', { keyPath: 'id' });
      }
    },
  });
  await db.clear('boards');
  db.close();
});

describe('boardDb', () => {
  it('creates the boards store and supports put, load, update, and delete', async () => {
    await putBoard(firstBoard);
    await putBoard(secondBoard);

    expect(await loadBoards()).toEqual(
      expect.arrayContaining([firstBoard, secondBoard])
    );

    await putBoard({ ...firstBoard, name: 'Renamed', updatedAt: 300 });
    expect(
      (await loadBoards()).find((board) => board.id === firstBoard.id)
    ).toMatchObject({
      name: 'Renamed',
      updatedAt: 300,
    });

    await deleteBoard(secondBoard.id);
    expect(await loadBoards()).toEqual([
      { ...firstBoard, name: 'Renamed', updatedAt: 300 },
    ]);
  });
});
