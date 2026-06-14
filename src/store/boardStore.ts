import { create } from 'zustand';
import type { Shape } from '@/types/shape';

const STORAGE_KEY = 'whiteboard:boards';

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

function loadBoards(): Board[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as Board[]).map(normalizeBoard);
  } catch {
    return [];
  }
}

function persistBoards(boards: Board[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  } catch {
    // Ignore quota/private-mode errors.
  }
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: loadBoards(),
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
    const next = [...get().boards, board];
    set({ boards: next, currentBoardId: id });
    persistBoards(next);
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
    const next = get().boards.map((board) =>
      board.id === id
        ? { ...board, name: trimmed, updatedAt: Date.now() }
        : board
    );
    set({ boards: next });
    persistBoards(next);
  },
  deleteBoard: (id) => {
    const next = get().boards.filter((board) => board.id !== id);
    const updates: Partial<BoardState> = { boards: next };
    if (get().currentBoardId === id) {
      updates.currentBoardId = null;
    }
    set(updates);
    persistBoards(next);
  },
  saveCurrentBoard: (shapes) => {
    const { currentBoardId } = get();
    if (!currentBoardId) return;
    const next = get().boards.map((board) =>
      board.id === currentBoardId
        ? { ...board, shapes, updatedAt: Date.now() }
        : board
    );
    set({ boards: next });
    persistBoards(next);
  },
}));
