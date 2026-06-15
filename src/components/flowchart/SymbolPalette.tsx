import {
  BASIC_TOOLBAR_TYPES,
  ADVANCED_PALETTE_TYPES,
  BPMN_PALETTE_TYPES,
  type FlowchartNodeType,
} from '@/types/flowchart';

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
      className="rounded border px-2 py-1 text-xs hover:bg-accent"
      aria-label={type}
    >
      {type}
    </button>
  );
}

export function SymbolPalette({ onSelect }: SymbolPaletteProps) {
  return (
    <div className="absolute left-16 top-1/2 z-30 w-56 -translate-y-1/2 rounded-lg border bg-background p-3 shadow-md">
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        Basic
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {BASIC_TOOLBAR_TYPES.map((type) => (
          <SymbolButton key={type} type={type} onClick={() => onSelect(type)} />
        ))}
      </div>
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        Advanced
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {ADVANCED_PALETTE_TYPES.map((type) => (
          <SymbolButton key={type} type={type} onClick={() => onSelect(type)} />
        ))}
      </div>
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        BPMN
      </div>
      <div className="flex flex-wrap gap-1">
        {BPMN_PALETTE_TYPES.map((type) => (
          <SymbolButton key={type} type={type} onClick={() => onSelect(type)} />
        ))}
      </div>
    </div>
  );
}
