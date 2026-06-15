import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFlowchartStore } from '@/store/flowchartStore';

export function PropertiesPanel() {
  const {
    nodes,
    edges,
    selection,
    showGrid,
    snap,
    updateNode,
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
