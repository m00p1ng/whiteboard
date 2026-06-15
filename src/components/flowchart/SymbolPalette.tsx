import {
  BASIC_TOOLBAR_TYPES,
  ADVANCED_PALETTE_TYPES,
  BPMN_PALETTE_TYPES,
  type FlowchartNodeType,
} from '@/types/flowchart';
import { ShapeIcon } from './ShapeIcons';

interface SymbolPaletteProps {
  onSelect: (type: FlowchartNodeType) => void;
}

function SymbolButton({
  type,
  onClick,
}: {
  type: FlowchartNodeType;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-14 w-14 items-center justify-center rounded border hover:bg-accent"
      aria-label={type}
      title={type}
    >
      <ShapeIcon type={type} className="h-8 w-8" />
    </button>
  );
}

export function SymbolPalette({ onSelect }: SymbolPaletteProps) {
  return (
    <div className="absolute left-16 top-1/2 z-30 w-52 -translate-y-1/2 rounded-lg border bg-background p-3 shadow-md">
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        Basic
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {BASIC_TOOLBAR_TYPES.map((type) => (
          <SymbolButton key={type} type={type} onClick={() => onSelect(type)} />
        ))}
      </div>
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        Advanced
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {ADVANCED_PALETTE_TYPES.map((type) => (
          <SymbolButton key={type} type={type} onClick={() => onSelect(type)} />
        ))}
      </div>
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        BPMN
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BPMN_PALETTE_TYPES.map((type) => (
          <SymbolButton key={type} type={type} onClick={() => onSelect(type)} />
        ))}
      </div>
    </div>
  );
}
