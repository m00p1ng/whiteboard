import { ColorInput } from '@/components/ui/color-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useFlowchartStore } from '@/store/flowchartStore';

export function PropertiesPanel() {
  const {
    nodes,
    edges,
    selection,
    showGrid,
    snap,
    updateNode,
    updateNodeStyle,
    updateEdge,
    setShowGrid,
    setSnap,
  } = useFlowchartStore();

  if (!selection) {
    return (
      <aside className="absolute right-3 top-16 z-20 w-60 rounded-lg border bg-background p-3 shadow-md">
        <h3 className="mb-3 text-sm font-semibold">Canvas</h3>
        <div className="flex items-center justify-between py-1">
          <Label htmlFor="grid">Show grid</Label>
          <input
            id="grid"
            type="checkbox"
            checked={showGrid}
            onChange={(event) => setShowGrid(event.target.checked)}
          />
        </div>
        <div className="flex items-center justify-between py-1">
          <Label htmlFor="snap">Snap to grid</Label>
          <input
            id="snap"
            type="checkbox"
            checked={snap}
            onChange={(event) => setSnap(event.target.checked)}
          />
        </div>
      </aside>
    );
  }

  if (selection.type === 'node') {
    const node = nodes[selection.id];
    if (!node) return null;

    return (
      <aside className="absolute right-3 top-16 z-20 w-60 rounded-lg border bg-background p-3 shadow-md">
        <h3 className="mb-3 text-sm font-semibold">Node</h3>
        <div className="mb-3">
          <Label htmlFor="node-label">Label</Label>
          <Input
            id="node-label"
            value={node.label ?? ''}
            onChange={(event) =>
              updateNode(node.id, { label: event.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="node-width">W</Label>
            <Input
              id="node-width"
              type="number"
              value={node.width}
              onChange={(event) =>
                updateNode(node.id, { width: Number(event.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="node-height">H</Label>
            <Input
              id="node-height"
              type="number"
              value={node.height}
              onChange={(event) =>
                updateNode(node.id, { height: Number(event.target.value) })
              }
            />
          </div>
        </div>
        <div className="mt-4 border-t pt-3">
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Appearance
          </h4>
          <div className="mb-3">
            <Label htmlFor="node-stroke">Stroke color</Label>
            <ColorInput
              id="node-stroke"
              value={node.style.stroke ?? '#334155'}
              onChange={(value) =>
                updateNodeStyle(node.id, { stroke: value })
              }
            />
          </div>
          <div className="mb-3">
            <Label htmlFor="node-text-color">Text color</Label>
            <ColorInput
              id="node-text-color"
              value={node.style.textColor ?? '#0f172a'}
              onChange={(value) =>
                updateNodeStyle(node.id, { textColor: value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="node-font-size">Font size</Label>
              <Input
                id="node-font-size"
                type="number"
                min={8}
                max={72}
                value={node.style.fontSize ?? 14}
                onChange={(event) =>
                  updateNodeStyle(node.id, {
                    fontSize: Number(event.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="node-font-family">Font</Label>
              <Select
                id="node-font-family"
                value={node.style.fontFamily ?? 'Inter'}
                onChange={(event) =>
                  updateNodeStyle(node.id, {
                    fontFamily: event.target.value,
                  })
                }
              >
                <option value="Inter">Inter</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
              </Select>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const edge = edges[selection.id];
  if (!edge) return null;

  return (
    <aside className="absolute right-3 top-16 z-20 w-60 rounded-lg border bg-background p-3 shadow-md">
      <h3 className="mb-3 text-sm font-semibold">Edge</h3>
      <div className="mb-3">
        <Label htmlFor="edge-label">Label</Label>
        <Input
          id="edge-label"
          value={edge.label ?? ''}
          onChange={(event) => updateEdge(edge.id, { label: event.target.value })}
        />
      </div>
    </aside>
  );
}
