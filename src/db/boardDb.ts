import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Board } from '@/store/boardStore';

const DB_NAME = 'whiteboard';
const DB_VERSION = 1;
const STORE = 'boards';

interface WhiteboardDb extends DBSchema {
  boards: {
    key: string;
    value: Board;
  };
}

let dbPromise: Promise<IDBPDatabase<WhiteboardDb>> | null = null;

function getDb(): Promise<IDBPDatabase<WhiteboardDb>> {
  if (!dbPromise) {
    dbPromise = openDB<WhiteboardDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      },
    });
  }

  return dbPromise;
}

export async function loadBoards(): Promise<Board[]> {
  const db = await getDb();
  return db.getAll(STORE);
}

export async function putBoard(board: Board): Promise<void> {
  const db = await getDb();
  await db.put(STORE, board);
}

export async function deleteBoard(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}
