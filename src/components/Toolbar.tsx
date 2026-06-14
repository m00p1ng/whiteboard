import { ArrowLeft, MousePointer2, Square, Circle, Minus, Type, GitCommitHorizontal, Undo2, Redo2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useBoardStore } from '@/store/boardStore';
import { useEditorStore, type Tool } from '@/store/editorStore';

const tools: { value: Tool; icon: React.ReactNode; label: string }[] = [
  { value: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select' },
  { value: 'rect', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
  { value: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle' },
  { value: 'line', icon: <Minus className="h-4 w-4" />, label: 'Line' },
  { value: 'text', icon: <Type className="h-4 w-4" />, label: 'Text' },
  { value: 'connector', icon: <GitCommitHorizontal className="h-4 w-4" />, label: 'Connector' },
];

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const selectedId = useEditorStore((s) => s.selectedId);
  const removeShape = useEditorStore((s) => s.removeShape);
  const reset = useEditorStore((s) => s.reset);
  const currentBoardId = useBoardStore((s) => s.currentBoardId);
  const closeBoard = useBoardStore((s) => s.closeBoard);

  const handleBack = () => {
    closeBoard();
    reset();
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-lg border bg-background p-2 shadow-sm">
      {currentBoardId && (
        <>
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Back to boards">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border" />
        </>
      )}
      <ToggleGroup type="single" value={tool} onValueChange={(v) => v && setTool(v as Tool)}>
        {tools.map((t) => (
          <ToggleGroupItem key={t.value} value={t.value} aria-label={t.label}>
            {t.icon}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="h-6 w-px bg-border" />
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
  );
}
