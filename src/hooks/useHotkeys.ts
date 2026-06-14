import { useEffect } from 'react';
import { useEditorStore, type Tool } from '@/store/editorStore';

const toolKeys: Record<string, Tool> = {
  v: 'select',
  r: 'rect',
  c: 'circle',
  l: 'line',
  t: 'text',
};

export function useHotkeys() {
  const setTool = useEditorStore((s) => s.setTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const selectedId = useEditorStore((s) => s.selectedId);
  const removeShape = useEditorStore((s) => s.removeShape);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) removeShape(selectedId);
        return;
      }

      const lower = e.key.toLowerCase();
      if (lower in toolKeys) {
        setTool(toolKeys[lower]);
        return;
      }

      if (lower === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setTool('connector');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, undo, redo, selectedId, removeShape]);
}
