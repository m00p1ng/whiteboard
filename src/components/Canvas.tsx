import { useRef, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore } from '@/store/editorStore';
import { ShapeRenderer } from './ShapeRenderer';
import { SelectionTransformer } from './SelectionTransformer';

export function Canvas() {
  const stageRef = useRef<any>(null);
  const shapes = useEditorStore((s) => s.shapes);
  const selectedId = useEditorStore((s) => s.selectedId);
  const viewport = useEditorStore((s) => s.viewport);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const addShape = useEditorStore((s) => s.addShape);
  const updateShape = useEditorStore((s) => s.updateShape);
  const tool = useEditorStore((s) => s.tool);
  const setViewport = useEditorStore((s) => s.setViewport);
  const [connectorSource, setConnectorSource] = useState<string | null>(null);

  const selectedShape = selectedId ? shapes[selectedId] ?? null : null;

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return;
    if (tool === 'select') {
      setSelectedId(null);
      return;
    }
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const id = crypto.randomUUID();
    if (tool === 'rect') {
      addShape({ id, type: 'rect', x: pos.x, y: pos.y, width: 100, height: 60, fill: '#fff' });
    } else if (tool === 'circle') {
      addShape({ id, type: 'circle', x: pos.x, y: pos.y, radius: 40, fill: '#fff' });
    } else if (tool === 'text') {
      addShape({ id, type: 'text', x: pos.x, y: pos.y, text: 'Text', fontSize: 18 });
    }
  };

  const handleShapeClick = (shapeId: string) => {
    if (tool === 'connector') {
      if (!connectorSource) {
        setConnectorSource(shapeId);
        setSelectedId(shapeId);
        return;
      }
      if (connectorSource !== shapeId) {
        addShape({
          id: crypto.randomUUID(),
          type: 'connector',
          x: 0,
          y: 0,
          fromId: connectorSource,
          toId: shapeId,
        });
      }
      setConnectorSource(null);
      setSelectedId(null);
      return;
    }
    setSelectedId(shapeId);
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-gray-50">
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.offsetX}
        y={viewport.offsetY}
        draggable={tool === 'select'}
        onDragEnd={(e) => setViewport({ offsetX: e.target.x(), offsetY: e.target.y() })}
        onClick={handleStageClick}
      >
        <Layer>
          {Object.values(shapes).map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              isSelected={shape.id === selectedId || shape.id === connectorSource}
              onSelect={() => handleShapeClick(shape.id)}
              onChange={(updates) => updateShape(shape.id, updates)}
            />
          ))}
          <SelectionTransformer selectedShape={selectedShape} />
        </Layer>
      </Stage>
    </div>
  );
}
