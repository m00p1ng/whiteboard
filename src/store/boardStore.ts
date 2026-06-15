import { create } from 'zustand';
import {
  deleteBoard as deleteBoardRecord,
  loadBoards,
  putBoard,
} from '@/db/boardDb';
import type { FlowchartEdge, FlowchartGraph, FlowchartNode, Viewport } from '@/types/flowchart';

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: Record<string, FlowchartNode>;
  edges: Record<string, FlowchartEdge>;
  viewport?: Viewport;
}

interface BoardState {
  boards: Board[];
  currentBoardId: string | null;
  createBoard: (name?: string) => string;
  openBoard: (id: string) => void;
  closeBoard: () => void;
  renameBoard: (id: string, name: string) => void;
  deleteBoard: (id: string) => void;
  saveCurrentBoard: (graph: FlowchartGraph & { viewport?: Viewport }) => void;
}

function ignorePersistenceError(promise: Promise<void>): void {
  void promise.catch(() => undefined);
}

function normalizeBoard(board: Board & { shapes?: unknown }): Board {
  const hasLegacyShapes =
    board.shapes &&
    typeof board.shapes === 'object' &&
    Object.keys(board.shapes as Record<string, unknown>).length > 0;

  return {
    ...board,
    nodes: hasLegacyShapes ? {} : (board.nodes ?? {}),
    edges: hasLegacyShapes ? {} : (board.edges ?? {}),
  };
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
      nodes: {},
      edges: {},
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
    const updatedBoard = { ...existing, name: trimmed, updatedAt: Date.now() };
    set({
      boards: get().boards.map((board) =>
        board.id === id ? updatedBoard : board
      ),
    });
    ignorePersistenceError(putBoard(updatedBoard));
  },
  deleteBoard: (id) => {
    const current = get().currentBoardId;
    set({
      boards: get().boards.filter((board) => board.id !== id),
      currentBoardId: current === id ? null : current,
    });
    ignorePersistenceError(deleteBoardRecord(id));
  },
  saveCurrentBoard: (graph) => {
    const id = get().currentBoardId;
    if (!id) return;
    const existing = get().boards.find((board) => board.id === id);
    if (!existing) return;
    const updatedBoard = {
      ...existing,
      ...graph,
      updatedAt: Date.now(),
    };
    set({
      boards: get().boards.map((board) =>
        board.id === id ? updatedBoard : board
      ),
    });
    ignorePersistenceError(putBoard(updatedBoard));
  },
}));
