import { Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBoardStore } from '@/store/boardStore';
import { useFlowchartStore } from '@/store/flowchartStore';

export function TopBar() {
  const currentBoard = useBoardStore((state) =>
    state.currentBoardId
      ? state.boards.find((board) => board.id === state.currentBoardId)
      : undefined
  );
  const closeBoard = useBoardStore((state) => state.closeBoard);
  const {
    selection,
    undoStack,
    redoStack,
    undo,
    redo,
    removeNode,
    removeEdge,
    setSelection,
    setViewport,
    viewport,
    reset,
  } = useFlowchartStore();

  function handleDelete() {
    if (selection?.type === 'node') {
      removeNode(selection.id);
    } else if (selection?.type === 'edge') {
      removeEdge(selection.id);
    }
    setSelection(null);
  }

  function zoomIn() {
    setViewport({ ...viewport, scale: Math.min(viewport.scale * 1.1, 4) });
  }

  function zoomOut() {
    setViewport({ ...viewport, scale: Math.max(viewport.scale / 1.1, 0.1) });
  }

  function fitToContent() {
    setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
  }

  function handleBack() {
    closeBoard();
    reset();
  }

  return (
    <header className="absolute left-3 right-3 top-3 z-20 flex items-center justify-between rounded-lg border bg-background p-2 shadow-md">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          aria-label="Back to boards"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="truncate text-sm font-semibold">
          {currentBoard?.name ?? 'Flowchart'}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={undo} disabled={undoStack.length === 0} aria-label="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={redo} disabled={redoStack.length === 0} aria-label="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={!selection}
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={zoomIn} aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={zoomOut} aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={fitToContent} aria-label="Fit to content">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
