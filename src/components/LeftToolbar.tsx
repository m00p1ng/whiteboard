import type { ReactNode } from 'react';
import {
  Circle,
  GitCommitHorizontal,
  Minus,
  MousePointer2,
  Square,
  Type,
} from 'lucide-react';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { useEditorStore, type Tool } from '@/store/editorStore';

const tools: { value: Tool; icon: ReactNode; label: string }[] = [
  {
    value: 'select',
    icon: <MousePointer2 className="h-4 w-4" />,
    label: 'Select',
  },
  {
    value: 'rect',
    icon: <Square className="h-4 w-4" />,
    label: 'Rectangle',
  },
  {
    value: 'circle',
    icon: <Circle className="h-4 w-4" />,
    label: 'Circle',
  },
  {
    value: 'line',
    icon: <Minus className="h-4 w-4" />,
    label: 'Line',
  },
  {
    value: 'text',
    icon: <Type className="h-4 w-4" />,
    label: 'Text',
  },
  {
    value: 'connector',
    icon: <GitCommitHorizontal className="h-4 w-4" />,
    label: 'Connector',
  },
];

export function LeftToolbar() {
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);

  return (
    <aside className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-lg border bg-background p-1 shadow-md">
      <ToggleGroup
        type="single"
        value={tool}
        onValueChange={(value) => value && setTool(value as Tool)}
        className="flex-col"
        aria-label="Drawing tools"
      >
        {tools.map((item) => (
          <ToggleGroupItem
            key={item.value}
            value={item.value}
            aria-label={item.label}
          >
            {item.icon}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </aside>
  );
}
