import { useId, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEditorStore } from '@/store/editorStore';

interface NumberFieldProps {
  label: string;
  value: number;
  onLiveChange: (value: number) => void;
  onCommit: (prevValue: number, nextValue: number) => void;
}

function NumberField({ label, value, onLiveChange, onCommit }: NumberFieldProps) {
  const id = useId();
  const prevRef = useRef(value);

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        value={value}
        onFocus={() => {
          prevRef.current = value;
        }}
        onChange={(event) => {
          const next = parseFloat(event.target.value);
          onLiveChange(Number.isNaN(next) ? 0 : next);
        }}
        onBlur={() => onCommit(prevRef.current, value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onLiveChange: (value: string) => void;
  onCommit: (prevValue: string, nextValue: string) => void;
}

function ColorField({ label, value, onLiveChange, onCommit }: ColorFieldProps) {
  const id = useId();
  const prevRef = useRef(value);

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} swatch`}
          className="h-9 w-9 rounded-md border border-input bg-transparent p-1"
          value={value}
          onFocus={() => {
            prevRef.current = value;
          }}
          onInput={(event) => onLiveChange(event.currentTarget.value)}
          onChange={(event) => onCommit(prevRef.current, event.currentTarget.value)}
        />
        <Input
          id={id}
          type="text"
          aria-label={`${label} hex`}
          className="flex-1"
          value={value}
          onFocus={() => {
            prevRef.current = value;
          }}
          onChange={(event) => onLiveChange(event.target.value)}
          onBlur={() => onCommit(prevRef.current, value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      </div>
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onLiveChange: (value: string) => void;
  onCommit: (prevValue: string, nextValue: string) => void;
}

function TextAreaField({
  label,
  value,
  onLiveChange,
  onCommit,
}: TextAreaFieldProps) {
  const id = useId();
  const prevRef = useRef(value);

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Textarea
        id={id}
        rows={2}
        value={value}
        onFocus={() => {
          prevRef.current = value;
        }}
        onChange={(event) => onLiveChange(event.target.value)}
        onBlur={() => onCommit(prevRef.current, value)}
      />
    </div>
  );
}

export function ShapePropertiesPanel() {
  const selectedId = useEditorStore((state) => state.selectedId);
  const shape = useEditorStore((state) =>
    state.selectedId ? state.shapes[state.selectedId] : undefined
  );
  const setShapeDraft = useEditorStore((state) => state.setShapeDraft);
  const recordFieldChange = useEditorStore((state) => state.recordFieldChange);

  if (!selectedId || !shape) return null;

  const live = (updates: Record<string, unknown>) =>
    setShapeDraft(selectedId, updates);
  const commitField =
    <T,>(field: string) =>
    (prevValue: T, nextValue: T) =>
      recordFieldChange(selectedId, field, prevValue, nextValue);

  return (
    <aside className="absolute right-3 top-1/2 z-20 flex w-56 -translate-y-1/2 flex-col gap-2 rounded-lg border bg-background p-3 shadow-md">
      {(shape.type === 'rect' || shape.type === 'circle') && (
        <ColorField
          label="Fill"
          value={shape.fill ?? '#ffffff'}
          onLiveChange={(value) => live({ fill: value })}
          onCommit={commitField<string>('fill')}
        />
      )}
      {shape.type === 'text' && (
        <ColorField
          label="Text color"
          value={shape.fill ?? '#000000'}
          onLiveChange={(value) => live({ fill: value })}
          onCommit={commitField<string>('fill')}
        />
      )}
      {shape.type !== 'text' && (
        <ColorField
          label="Stroke"
          value={shape.stroke ?? '#000000'}
          onLiveChange={(value) => live({ stroke: value })}
          onCommit={commitField<string>('stroke')}
        />
      )}
      {shape.type !== 'text' && (
        <NumberField
          label="Stroke width"
          value={shape.strokeWidth ?? 2}
          onLiveChange={(value) => live({ strokeWidth: value })}
          onCommit={commitField<number>('strokeWidth')}
        />
      )}
      {shape.type === 'text' && (
        <NumberField
          label="Font size"
          value={shape.fontSize}
          onLiveChange={(value) => live({ fontSize: value })}
          onCommit={commitField<number>('fontSize')}
        />
      )}
      {shape.type === 'text' && (
        <TextAreaField
          label="Text"
          value={shape.text}
          onLiveChange={(value) => live({ text: value })}
          onCommit={commitField<string>('text')}
        />
      )}
      {(shape.type === 'rect' ||
        shape.type === 'circle' ||
        shape.type === 'text') && (
        <>
          <NumberField
            label="X"
            value={shape.x}
            onLiveChange={(value) => live({ x: value })}
            onCommit={commitField<number>('x')}
          />
          <NumberField
            label="Y"
            value={shape.y}
            onLiveChange={(value) => live({ y: value })}
            onCommit={commitField<number>('y')}
          />
        </>
      )}
      {shape.type === 'rect' && (
        <>
          <NumberField
            label="Width"
            value={shape.width}
            onLiveChange={(value) => live({ width: value })}
            onCommit={commitField<number>('width')}
          />
          <NumberField
            label="Height"
            value={shape.height}
            onLiveChange={(value) => live({ height: value })}
            onCommit={commitField<number>('height')}
          />
        </>
      )}
      {shape.type === 'circle' && (
        <>
          <NumberField
            label="Radius X"
            value={shape.radiusX}
            onLiveChange={(value) => live({ radiusX: value })}
            onCommit={commitField<number>('radiusX')}
          />
          <NumberField
            label="Radius Y"
            value={shape.radiusY}
            onLiveChange={(value) => live({ radiusY: value })}
            onCommit={commitField<number>('radiusY')}
          />
        </>
      )}
    </aside>
  );
}
