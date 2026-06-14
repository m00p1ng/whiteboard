import { useEffect } from 'react';
import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';
import { useBoardStore } from '@/store/boardStore';
import { useEditorStore } from '@/store/editorStore';
import { useHotkeys } from '@/hooks/useHotkeys';

export function BoardPage() {
  useHotkeys();
  const currentBoardId = useBoardStore((state) => state.currentBoardId);
  const currentBoard = useBoardStore((state) =>
    state.boards.find((board) => board.id === currentBoardId)
  );
  const saveCurrentBoard = useBoardStore((state) => state.saveCurrentBoard);
  const shapes = useEditorStore((state) => state.shapes);

  useEffect(() => {
    const board = useBoardStore
      .getState()
      .boards.find((b) => b.id === currentBoardId);
    if (board) {
      useEditorStore.setState({
        shapes: board.shapes,
        undoStack: [],
        redoStack: [],
      });
    }
  }, [currentBoardId]);

  useEffect(() => {
    saveCurrentBoard(shapes);
  }, [shapes, saveCurrentBoard]);

  if (!currentBoard) {
    return null;
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-gray-50">
      <Toolbar />
      <Canvas />
    </div>
  );
}
