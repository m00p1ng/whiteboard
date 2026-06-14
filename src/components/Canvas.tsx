import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import type { Stage as StageType } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore } from '@/store/editorStore';
import { ShapeRenderer } from './ShapeRenderer';
import { SelectionTransformer } from './SelectionTransformer';
import { TextEditor } from './TextEditor';
import type { TextShape } from '@/types/shape';
import { getAnchorPoint, zoomAtPoint } from '@/utils/geometry';
import type { Point } from '@/utils/geometry';
import {
  createShapeFromGesture,
  isClickGesture,
  screenToWorld,
  type CreationTool,
  type ShapeDraft,
} from '@/utils/creationGeometry';
import { CreationPreview } from './CreationPreview';

export function Canvas() {
  const stageRef = useRef<StageType | null>(null);
  const shapes = useEditorStore((s) => s.shapes);
  const selectedId = useEditorStore((s) => s.selectedId);
  const viewport = useEditorStore((s) => s.viewport);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const addShape = useEditorStore((s) => s.addShape);
  const updateShape = useEditorStore((s) => s.updateShape);
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const setViewport = useEditorStore((s) => s.setViewport);
  const [connectorSource, setConnectorSource] = useState<string | null>(null);
  const [connectorPointer, setConnectorPointer] = useState<Point | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [shapeDraft, setShapeDraft] = useState<ShapeDraft | null>(null);
  const draftToolRef = useRef<CreationTool | null>(null);
  const connectorToolRef = useRef<typeof tool | null>(null);

  const isCreationTool = (value: typeof tool): value is CreationTool =>
    value === 'rect' ||
    value === 'circle' ||
    value === 'line' ||
    value === 'text';

  const getScreenPointer = (stage: StageType): Point | null => {
    const pointer = stage.getPointerPosition();
    return pointer ? { x: pointer.x, y: pointer.y } : null;
  };

  const clearShapeDraft = () => {
    setShapeDraft(null);
    draftToolRef.current = null;
  };

  const clearConnectorDraft = useCallback(() => {
    setConnectorSource(null);
    setConnectorPointer(null);
    setSelectedId(null);
  }, [setSelectedId]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(true);
      if (e.key === 'Escape') {
        setShapeDraft(null);
        draftToolRef.current = null;
        clearConnectorDraft();
      }
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
  }, [clearConnectorDraft, setSelectedId]);

  useEffect(() => {
    if (shapeDraft && tool !== draftToolRef.current) {
      setShapeDraft(null);
      draftToolRef.current = null;
    }
  }, [tool, shapeDraft]);

  useEffect(() => {
    if (connectorSource && tool !== connectorToolRef.current) {
      setConnectorSource(null);
      setConnectorPointer(null);
      setSelectedId(null);
      connectorToolRef.current = null;
    }
  }, [connectorSource, setSelectedId, tool]);

  const selectedShape = selectedId ? shapes[selectedId] ?? null : null;

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    if (
      !stage ||
      e.target !== stage ||
      !isCreationTool(tool) ||
      spacePressed
    ) {
      return;
    }
    const screen = getScreenPointer(stage);
    if (!screen) return;
    const world = screenToWorld(screen, viewport);
    if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) return;

    setSelectedId(null);
    draftToolRef.current = tool;
    setShapeDraft({
      tool,
      startWorld: world,
      currentWorld: world,
      startScreen: screen,
      currentScreen: screen,
    });
    stage.content.setPointerCapture(e.evt.pointerId);
  };

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const screen = getScreenPointer(stage);
    if (!screen) return;
    const world = screenToWorld(screen, viewport);

    if (shapeDraft) {
      setShapeDraft((draft) =>
        draft
          ? { ...draft, currentWorld: world, currentScreen: screen }
          : null
      );
    }

    if (tool === 'connector' && connectorSource) {
      setConnectorPointer(world);
    }
  };

  const handlePointerUp = (e: KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    if (!stage || !shapeDraft) return;
    const screen = getScreenPointer(stage) ?? shapeDraft.currentScreen;
    const world = screenToWorld(screen, viewport);
    const content = stage.content;
    if (content.hasPointerCapture(e.evt.pointerId)) {
      content.releasePointerCapture(e.evt.pointerId);
    }

    const shape = createShapeFromGesture({
      id: crypto.randomUUID(),
      tool: shapeDraft.tool,
      startWorld: shapeDraft.startWorld,
      currentWorld: world,
      clicked: isClickGesture(shapeDraft.startScreen, screen),
    });
    clearShapeDraft();
    if (!shape) return;

    addShape(shape);
    setSelectedId(shape.id);
    setTool('select');
  };

  const handlePointerCancel = (e: KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    if (stage?.content.hasPointerCapture(e.evt.pointerId)) {
      stage.content.releasePointerCapture(e.evt.pointerId);
    }
    clearShapeDraft();
  };

  const previewShape = useMemo(() => {
    if (!shapeDraft || shapeDraft.tool !== tool) return null;
    return createShapeFromGesture({
      id: 'creation-preview',
      tool: shapeDraft.tool,
      startWorld: shapeDraft.startWorld,
      currentWorld: shapeDraft.currentWorld,
      clicked: false,
    });
  }, [shapeDraft, tool]);

  const handleShapeClick = (shapeId: string) => {
    if (tool === 'connector') {
      if (!shapes[shapeId]) return;
      if (!connectorSource) {
        connectorToolRef.current = tool;
        setConnectorSource(shapeId);
        setConnectorPointer(getAnchorPoint(shapes[shapeId], 'center'));
        setSelectedId(shapeId);
        return;
      }
      if (connectorSource === shapeId) return;

      addShape({
        id: crypto.randomUUID(),
        type: 'connector',
        x: 0,
        y: 0,
        fromId: connectorSource,
        toId: shapeId,
      });
      clearConnectorDraft();
      return;
    }
    setSelectedId(shapeId);
  };

  const connectorPoints = useMemo(() => {
    if (!connectorSource || !connectorPointer) return null;
    const source = shapes[connectorSource];
    if (!source) return null;
    const start = getAnchorPoint(source, 'center');
    return [
      start.x,
      start.y,
      connectorPointer.x,
      connectorPointer.y,
    ] as [number, number, number, number];
  }, [connectorPointer, connectorSource, shapes]);

  const handleShapeDblClick = (shapeId: string) => {
    const shape = shapes[shapeId];
    if (shape?.type === 'text') {
      setEditingTextId(shapeId);
    }
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.05;
    const requestedScale =
      e.evt.deltaY > 0
        ? viewport.scale / scaleBy
        : viewport.scale * scaleBy;

    setViewport(zoomAtPoint(viewport, pointer, requestedScale));
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
        draggable={(tool === 'select' || spacePressed) && !shapeDraft}
        onDragEnd={(e) => setViewport({ offsetX: e.target.x(), offsetY: e.target.y() })}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
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
          <CreationPreview shape={previewShape} connectorPoints={connectorPoints} />
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
