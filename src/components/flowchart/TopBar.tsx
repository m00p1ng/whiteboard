import { Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFlowchartStore } from '@/store/flowchartStore';

export function TopBar() {
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

  return (
    <header className="absolute left-3 right-3 top-3 z-20 flex items-center justify-between rounded-lg border bg-background p-2 shadow-md">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Flowchart</span>
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
