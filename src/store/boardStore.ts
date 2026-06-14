import { create } from 'zustand';
import {
  deleteBoard as deleteBoardRecord,
  loadBoards,
  putBoard,
} from '@/db/boardDb';
import type { Shape } from '@/types/shape';

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  shapes: Record<string, Shape>;
}

interface BoardState {
  boards: Board[];
  currentBoardId: string | null;
  createBoard: (name?: string) => string;
  openBoard: (id: string) => void;
  closeBoard: () => void;
  renameBoard: (id: string, name: string) => void;
  deleteBoard: (id: string) => void;
  saveCurrentBoard: (shapes: Record<string, Shape>) => void;
}

const DEFAULT_CIRCLE_RADIUS = 40;

function validRadius(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function normalizeShape(shape: unknown): Shape {
  const candidate = shape as Shape & {
    radius?: unknown;
    radiusX?: unknown;
    radiusY?: unknown;
  };

  if (candidate?.type !== 'circle') return candidate;

  const legacyRadius = validRadius(candidate.radius)
    ? candidate.radius
    : DEFAULT_CIRCLE_RADIUS;
  const radiusX = validRadius(candidate.radiusX)
    ? candidate.radiusX
    : legacyRadius;
  const radiusY = validRadius(candidate.radiusY)
    ? candidate.radiusY
    : legacyRadius;
  const normalized = { ...candidate, radiusX, radiusY };
  delete normalized.radius;

  return normalized as Shape;
}

function normalizeBoard(board: Board): Board {
  return {
    ...board,
    shapes: Object.fromEntries(
      Object.entries(board.shapes ?? {}).map(([id, shape]) => [
        id,
        normalizeShape(shape),
      ])
    ),
  };
}

function ignorePersistenceError(promise: Promise<void>): void {
  void promise.catch(() => undefined);
}

export async function initBoardStore(): Promise<void> {
  const boards = await loadBoards();
  useBoardStore.setState({ boards: boards.map(normalizeBoard) });
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoardId: null,
  createBoard: (name) => {
    const id = crypto.randomUUID();
    const board: Board = {
      id,
      name: name?.trim() || 'Untitled board',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      shapes: {},
    };
    set({ boards: [...get().boards, board], currentBoardId: id });
    ignorePersistenceError(putBoard(board));
    return id;
  },
  openBoard: (id) => {
    set({ currentBoardId: id });
  },
  closeBoard: () => {
    set({ currentBoardId: null });
  },
  renameBoard: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const existing = get().boards.find((board) => board.id === id);
    if (!existing) return;

    const updatedBoard = {
      ...existing,
      name: trimmed,
      updatedAt: Date.now(),
    };
    set({
      boards: get().boards.map((board) =>
        board.id === id ? updatedBoard : board
      ),
    });
    ignorePersistenceError(putBoard(updatedBoard));
  },
  deleteBoard: (id) => {
    const updates: Partial<BoardState> = {
      boards: get().boards.filter((board) => board.id !== id),
    };
    if (get().currentBoardId === id) {
      updates.currentBoardId = null;
    }
    set(updates);
    ignorePersistenceError(deleteBoardRecord(id));
  },
  saveCurrentBoard: (shapes) => {
    const { currentBoardId, boards } = get();
    if (!currentBoardId) return;

    const existing = boards.find((board) => board.id === currentBoardId);
    if (!existing) return;

    const updatedBoard = {
      ...existing,
      shapes,
      updatedAt: Date.now(),
    };
    set({
      boards: boards.map((board) =>
        board.id === currentBoardId ? updatedBoard : board
      ),
    });
    ignorePersistenceError(putBoard(updatedBoard));
  },
}));
