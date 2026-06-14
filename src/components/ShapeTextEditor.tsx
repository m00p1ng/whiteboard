import { useEffect, useRef } from 'react';
import type { CircleShape, RectShape } from '@/types/shape';

interface ShapeTextEditorProps {
  shape: RectShape | CircleShape;
  viewport: { scale: number; offsetX: number; offsetY: number };
  onCommit: (text: string) => void;
  onClose: () => void;
}

export function ShapeTextEditor({
  shape,
  viewport,
  onCommit,
  onClose,
}: ShapeTextEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const worldBounds =
    shape.type === 'rect'
      ? {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        }
      : {
          x: shape.x - shape.radiusX,
          y: shape.y - shape.radiusY,
          width: shape.radiusX * 2,
          height: shape.radiusY * 2,
        };

  return (
    <div
      data-testid="shape-text-editor-overlay"
      className="absolute z-20 flex items-center border border-blue-500 bg-white/90"
      style={{
        left: worldBounds.x * viewport.scale + viewport.offsetX,
        top: worldBounds.y * viewport.scale + viewport.offsetY,
        width: worldBounds.width * viewport.scale,
        height: worldBounds.height * viewport.scale,
      }}
    >
      <textarea
        ref={inputRef}
        aria-label="Shape text"
        rows={1}
        defaultValue={shape.text ?? ''}
        className="max-h-full w-full resize-none overflow-auto border-0 bg-transparent p-2 text-center outline-none"
        style={{
          fontSize: (shape.fontSize ?? 16) * viewport.scale,
          color: shape.textColor ?? '#000000',
        }}
        onBlur={(event) => {
          if (!cancelledRef.current) onCommit(event.currentTarget.value);
          onClose();
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          cancelledRef.current = true;
          event.preventDefault();
          onClose();
        }}
      />
    </div>
  );
}
