import { ArrowLeft, Redo2, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBoardStore } from '@/store/boardStore';
import { useEditorStore } from '@/store/editorStore';

export function TopBar() {
  const currentBoardId = useBoardStore((state) => state.currentBoardId);
  const currentBoard = useBoardStore((state) =>
    state.boards.find((board) => board.id === state.currentBoardId)
  );
  const closeBoard = useBoardStore((state) => state.closeBoard);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const selectedId = useEditorStore((state) => state.selectedId);
  const removeShape = useEditorStore((state) => state.removeShape);
  const reset = useEditorStore((state) => state.reset);

  const handleBack = () => {
    closeBoard();
    reset();
  };

  return (
    <header className="absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-3 shadow-sm backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        {currentBoardId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="Back to boards"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <span className="truncate text-sm font-semibold">
          {currentBoard?.name ?? 'Untitled board'}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={undo} aria-label="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={redo} aria-label="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!selectedId}
          onClick={() => selectedId && removeShape(selectedId)}
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
