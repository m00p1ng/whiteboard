import { useEffect } from 'react';
import { Canvas } from '@/components/Canvas';
import { LeftToolbar } from '@/components/LeftToolbar';
import { Minimap } from '@/components/Minimap';
import { ShapePropertiesPanel } from '@/components/ShapePropertiesPanel';
import { TopBar } from '@/components/TopBar';
import { ZoomControls } from '@/components/ZoomControls';
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
  const selectedId = useEditorStore((state) => state.selectedId);

  useEffect(() => {
    const board = useBoardStore
      .getState()
      .boards.find((candidate) => candidate.id === currentBoardId);

    if (!board) return;

    useEditorStore.getState().setShapes(board.shapes);

    return useEditorStore.subscribe((state, previousState) => {
      if (state.shapes !== previousState.shapes) {
        saveCurrentBoard(state.shapes);
      }
    });
  }, [currentBoardId, saveCurrentBoard]);

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
      <ShapePropertiesPanel key={selectedId ?? 'none'} />
    </div>
  );
}
