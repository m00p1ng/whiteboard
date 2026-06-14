import { useRef, useState, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import type { Stage as StageType } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore } from '@/store/editorStore';
import { ShapeRenderer } from './ShapeRenderer';
import { SelectionTransformer } from './SelectionTransformer';
import { TextEditor } from './TextEditor';
import type { TextShape } from '@/types/shape';

export function Canvas() {
  const stageRef = useRef<StageType | null>(null);
  const shapes = useEditorStore((s) => s.shapes);
  const selectedId = useEditorStore((s) => s.selectedId);
  const viewport = useEditorStore((s) => s.viewport);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const addShape = useEditorStore((s) => s.addShape);
  const updateShape = useEditorStore((s) => s.updateShape);
  const tool = useEditorStore((s) => s.tool);
  const setViewport = useEditorStore((s) => s.setViewport);
  const [connectorSource, setConnectorSource] = useState<string | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

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
    } else if (tool === 'line') {
      if (!lineStart) {
        setLineStart({ x: pos.x, y: pos.y });
      } else {
        addShape({
          id: crypto.randomUUID(),
          type: 'line',
          x: 0,
          y: 0,
          points: [lineStart.x, lineStart.y, pos.x, pos.y],
        });
        setLineStart(null);
      }
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

  const handleShapeDblClick = (shapeId: string) => {
    const shape = shapes[shapeId];
    if (shape?.type === 'text') {
      setEditingTextId(shapeId);
    }
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const x = pointer.x - mousePointTo.x * newScale;
    const y = pointer.y - mousePointTo.y * newScale;
    setViewport({ scale: newScale, offsetX: x, offsetY: y });
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
        draggable={tool === 'select' || spacePressed}
        onDragEnd={(e) => setViewport({ offsetX: e.target.x(), offsetY: e.target.y() })}
        onClick={handleStageClick}
        onWheel={handleWheel}
      >
        <Layer>
          {Object.values(shapes).map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              isSelected={shape.id === selectedId || shape.id === connectorSource}
              onSelect={() => handleShapeClick(shape.id)}
              onDblClick={() => handleShapeDblClick(shape.id)}
              onChange={(updates) => updateShape(shape.id, updates)}
            />
          ))}
          <SelectionTransformer selectedShape={selectedShape} />
        </Layer>
      </Stage>
      {editingTextId && shapes[editingTextId]?.type === 'text' && (
        <TextEditor
          shape={shapes[editingTextId] as TextShape}
          viewport={viewport}
          onClose={() => setEditingTextId(null)}
        />
      )}
    </div>
  );
}
