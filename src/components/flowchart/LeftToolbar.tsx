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
import { ShapeIcon, ConnectorIcon } from './ShapeIcons';

const PRIMARY_TOOLS: { value: FlowchartNodeType | 'select' | 'connector'; label: string; icon: React.ReactNode }[] = [
  { value: 'select', label: 'Select', icon: <MousePointer2 className="h-5 w-5" /> },
  { value: 'process', label: 'Process', icon: <ShapeIcon type="process" className="h-5 w-5" /> },
  { value: 'decision', label: 'Decision', icon: <ShapeIcon type="decision" className="h-5 w-5" /> },
  { value: 'data', label: 'Data', icon: <ShapeIcon type="data" className="h-5 w-5" /> },
  { value: 'terminal', label: 'Terminal', icon: <ShapeIcon type="terminal" className="h-5 w-5" /> },
  { value: 'connector', label: 'Connector', icon: <ConnectorIcon className="h-5 w-5" /> },
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
            title={item.label}
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
        title="More symbols"
        onClick={() => setPaletteOpen((open) => !open)}
      >
        <Plus className="h-5 w-5" />
      </Button>
      {paletteOpen && <SymbolPalette onSelect={selectPaletteType} />}
    </aside>
  );
}
