import { useEffect } from 'react';
import { useFlowchartStore } from '@/store/flowchartStore';
import type { FlowchartTool } from '@/types/flowchart';

const TOOL_KEYS: Record<string, FlowchartTool> = {
  v: 'select',
  p: 'process',
  d: 'decision',
  i: 'data',
  t: 'terminal',
  k: 'connector',
};

export function useFlowchartHotkeys() {
  const {
    selection,
    tool,
    removeNode,
    removeEdge,
    undo,
    redo,
    setTool,
    setViewport,
    setEditingNodeId,
    viewport,
  } = useFlowchartStore();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target.isContentEditable ||
          isInsideContentEditable(target))
      ) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (event.key === 'Escape') {
        setTool('select');
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selection?.type === 'node') {
          removeNode(selection.id);
        } else if (selection?.type === 'edge') {
          removeEdge(selection.id);
        }
        return;
      }

      if (
        tool === 'select' &&
        selection?.type === 'node' &&
        event.key.length === 1 &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        setEditingNodeId(selection.id);
        return;
      }

      const nextTool = TOOL_KEYS[event.key.toLowerCase()];
      if (nextTool) {
        setTool(nextTool);
        return;
      }

      if (event.key === '+' || event.key === '=') {
        setViewport({ ...viewport, scale: Math.min(viewport.scale * 1.1, 4) });
        return;
      }
      if (event.key === '-') {
        setViewport({ ...viewport, scale: Math.max(viewport.scale / 1.1, 0.1) });
        return;
      }
      if (event.key === '0') {
        setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    selection,
    tool,
    removeNode,
    removeEdge,
    undo,
    redo,
    setTool,
    setEditingNodeId,
    setViewport,
    viewport,
  ]);
}

function isInsideContentEditable(target: HTMLElement): boolean {
  const editable = target.closest('[contenteditable]');
  return editable?.getAttribute('contenteditable') !== 'false' && !!editable;
}
