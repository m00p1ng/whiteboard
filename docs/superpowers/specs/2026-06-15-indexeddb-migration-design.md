# IndexedDB Migration Design

## Overview

Migrate board persistence from localStorage to IndexedDB using the `idb` library.

## Motivation

localStorage has a ~5MB storage limit and is synchronous. IndexedDB provides larger storage capacity and async operations, preventing UI blocking during persistence.

## Database Schema

Single object store `boards` with `id` as primary key.

```ts
// src/db/boardDb.ts
import { openDB, type IDBPDatabase } from 'idb';
import type { Board } from '@/store/boardStore';

const DB_NAME = 'whiteboard';
const DB_VERSION = 1;
const STORE = 'boards';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
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
```

## Store Changes

### Initial Load

Export `initBoardStore()` async function that loads boards from IndexedDB and populates the store. App must await this before rendering board list.

```ts
export async function initBoardStore(): Promise<void> {
  const boards = await loadBoards();
  useBoardStore.setState({ boards });
}
```

### Persistence

Replace synchronous `persistBoards()` with fire-and-forget async calls:

- `createBoard`: Call `putBoard(board)` after adding to state
- `renameBoard`: Call `putBoard(updatedBoard)` after updating state
- `deleteBoard`: Call `deleteBoard(id)` after removing from state
- `saveCurrentBoard`: Call `putBoard(updatedBoard)` for targeted update instead of writing entire array

All persistence calls catch errors silently to match current localStorage behavior.

## Cleanup

- Remove `STORAGE_KEY` constant
- Remove `loadBoards()` and `persistBoards()` functions from boardStore.ts
- Remove localStorage references from test setup files
- Update tests to mock IndexedDB or use in-memory implementation

## Data Migration

No migration required. Existing localStorage data is ignored. App starts with empty IndexedDB.

## Dependencies

Add `idb` package (~1KB gzipped).

## Testing

- Mock IndexedDB in tests using `fake-indexeddb` or manual mock
- Verify board CRUD operations persist correctly
- Verify async initialization completes before board list renders
