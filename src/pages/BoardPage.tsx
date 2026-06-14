import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@/components/Canvas';
import { LeftToolbar } from '@/components/LeftToolbar';
import { Minimap } from '@/components/Minimap';
import { TopBar } from '@/components/TopBar';
import { ZoomControls } from '@/components/ZoomControls';
import { useBoardStore } from '@/store/boardStore';
import { useEditorStore } from '@/store/editorStore';
import { useHotkeys } from '@/hooks/useHotkeys';
import type { Shape } from '@/types/shape';

export function BoardPage() {
  useHotkeys();
  const currentBoardId = useBoardStore((state) => state.currentBoardId);
  const currentBoard = useBoardStore((state) =>
    state.boards.find((board) => board.id === currentBoardId)
  );
  const saveCurrentBoard = useBoardStore((state) => state.saveCurrentBoard);
  const shapes = useEditorStore((state) => state.shapes);
  const [hydratedBoardId, setHydratedBoardId] = useState<string | null>(null);
  const hydratedShapesRef = useRef<Record<string, Shape> | null>(null);

  useEffect(() => {
    setHydratedBoardId(null);
    const board = useBoardStore
      .getState()
      .boards.find((candidate) => candidate.id === currentBoardId);

    if (!board) {
      hydratedShapesRef.current = null;
      return;
    }

    hydratedShapesRef.current = board.shapes;
    useEditorStore.getState().setShapes(board.shapes);
    setHydratedBoardId(board.id);
  }, [currentBoardId]);

  useEffect(() => {
    if (
      !currentBoardId ||
      hydratedBoardId !== currentBoardId ||
      shapes === hydratedShapesRef.current
    ) {
      return;
    }

    saveCurrentBoard(shapes);
    hydratedShapesRef.current = shapes;
  }, [currentBoardId, hydratedBoardId, shapes, saveCurrentBoard]);

  if (!currentBoard) {
    return null;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-50">
      <Canvas />
      <TopBar />
      <LeftToolbar />
      <Minimap />
      <ZoomControls />
    </div>
  );
}
