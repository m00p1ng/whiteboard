import { useState } from 'react';
import { MousePointer2, Plus } from 'lucide-react';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { useFlowchartStore } from '@/store/flowchartStore';
import { type FlowchartNodeType } from '@/types/flowchart';
import { SymbolPalette } from './SymbolPalette';

const PRIMARY_TOOLS: { value: FlowchartNodeType | 'select' | 'connector'; label: string; icon: React.ReactNode }[] = [
  { value: 'select', label: 'Select', icon: <MousePointer2 className="h-4 w-4" /> },
  { value: 'process', label: 'Process', icon: <span className="text-xs">▭</span> },
  { value: 'decision', label: 'Decision', icon: <span className="text-xs">◊</span> },
  { value: 'data', label: 'Data', icon: <span className="text-xs">▱</span> },
  { value: 'terminal', label: 'Terminal', icon: <span className="text-xs">⬭</span> },
  { value: 'connector', label: 'Connector', icon: <span className="text-xs">→</span> },
];

export function LeftToolbar() {
  const tool = useFlowchartStore((state) => state.tool);
  const setTool = useFlowchartStore((state) => state.setTool);
  const [paletteOpen, setPaletteOpen] = useState(false);

  function selectTool(value: string) {
    if (!value) return;
    setTool(value as FlowchartNodeType | 'select' | 'connector');
    setPaletteOpen(false);
  }

  function selectPaletteType(type: FlowchartNodeType) {
    setTool(type);
    setPaletteOpen(false);
  }

  return (
    <aside className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-lg border bg-background p-1 shadow-md">
      <ToggleGroup
        type="single"
        value={tool}
        onValueChange={selectTool}
        className="flex-col"
        aria-label="Flowchart tools"
      >
        {PRIMARY_TOOLS.map((item) => (
          <ToggleGroupItem
            key={item.value}
            value={item.value}
            aria-label={item.label}
          >
            {item.icon}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Button
        variant="ghost"
        size="icon"
        className="mt-1 h-10 w-10"
        aria-label="More symbols"
        onClick={() => setPaletteOpen((open) => !open)}
      >
        <Plus className="h-4 w-4" />
      </Button>
      {paletteOpen && <SymbolPalette onSelect={selectPaletteType} />}
    </aside>
  );
}
