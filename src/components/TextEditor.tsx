import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import type { TextShape } from '@/types/shape';

interface TextEditorProps {
  shape: TextShape;
  viewport: { scale: number; offsetX: number; offsetY: number };
  onClose: () => void;
}

export function TextEditor({ shape, viewport, onClose }: TextEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const updateShape = useEditorStore((s) => s.updateShape);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const screenX = shape.x * viewport.scale + viewport.offsetX;
  const screenY = shape.y * viewport.scale + viewport.offsetY;

  return (
    <textarea
      ref={inputRef}
      defaultValue={shape.text}
      className="absolute z-20 resize-none border border-blue-500 bg-background/90 p-1 outline-none"
      style={{
        left: screenX,
        top: screenY,
        fontSize: shape.fontSize * viewport.scale,
        minWidth: 100,
        color: shape.fill ?? '#000000',
      }}
      onBlur={(e) => {
        updateShape(shape.id, { text: e.target.value });
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    />
  );
}
