import { useEffect, useRef, useState } from 'react';
import type { FlowchartNode, Viewport } from '@/types/flowchart';

interface LabelEditorProps {
  node: FlowchartNode;
  viewport: Viewport;
  onCommit: (label: string) => void;
  onCancel: () => void;
}

export function LabelEditor({ node, viewport, onCommit, onCancel }: LabelEditorProps) {
  const [value, setValue] = useState(node.label ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const screenX = node.x * viewport.scale + viewport.offsetX;
  const screenY = node.y * viewport.scale + viewport.offsetY;
  const width = node.width * viewport.scale;
  const height = node.height * viewport.scale;

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onCancel();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onCommit(value);
    }
  }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={handleKeyDown}
      className="absolute z-50 resize-none overflow-hidden border border-blue-500 bg-white p-1 text-center text-sm outline-none dark:bg-slate-900"
      style={{
        left: screenX,
        top: screenY,
        width,
        height,
        color: node.style.textColor ?? '#0f172a',
        fontSize: (node.style.fontSize ?? 14) * viewport.scale,
      }}
    />
  );
}
