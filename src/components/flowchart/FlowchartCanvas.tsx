import { useEffect, useRef, useState } from 'react';
import { Layer, Stage } from 'react-konva';
import type Konva from 'konva';
import type { FlowchartNode, FlowchartTool, PortId } from '@/types/flowchart';
import { useFlowchartStore } from '@/store/flowchartStore';
import { GridBackground } from '@/components/GridBackground';
import { computeOrthogonalPath } from '@/utils/orthogonalRouter';
import { getDefaultNodeSize, getPortPoint } from '@/utils/portGeometry';
import { snapPoint, computeSmartGuides } from '@/utils/snapEngine';
import { NodeRenderer } from './NodeRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import { PortHandles } from './PortHandles';
import { DraftLayer } from './DraftLayer';
import { LabelEditor } from './LabelEditor';

const GRID_SIZE = 20;

export function FlowchartCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const {
    nodes,
    edges,
    selection,
    tool,
    viewport,
    showGrid,
    snap,
    editingNodeId,
    addNode,
    liveMoveNode,
    moveNode,
    addEdge,
    setSelection,
    setViewport,
    setEditingNodeId,
    updateNode,
  } = useFlowchartStore();

  const [draftNode, setDraftNode] = useState<FlowchartNode | null>(null);
  const [draftEdge, setDraftEdge] = useState<{
    fromNodeId: string;
    fromPort: PortId;
    points: number[];
  } | null>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function pointerToCanvas(pointer: { x: number; y: number }) {
    return {
      x: (pointer.x - viewport.offsetX) / viewport.scale,
      y: (pointer.y - viewport.offsetY) / viewport.scale,
    };
  }

  function getPointerPosition() {
    const stage = stageRef.current;
    if (!stage) return null;
    return pointerToCanvas(stage.getPointerPosition() ?? { x: 0, y: 0 });
  }

  function snapPosition(x: number, y: number) {
    if (!snap) return { x, y };
    return snapPoint(x, y, GRID_SIZE);
  }

  function nodeAtPoint(point: { x: number; y: number }, excludeId?: string) {
    for (const node of Object.values(nodes)) {
      if (node.id === excludeId) continue;
      if (
        point.x >= node.x &&
        point.x <= node.x + node.width &&
        point.y >= node.y &&
        point.y <= node.y + node.height
      ) {
        return node;
      }
    }
    return null;
  }

  function closestPort(node: FlowchartNode, point: { x: number; y: number }): PortId {
    const ports: PortId[] = ['top', 'right', 'bottom', 'left'];
    let best: PortId = 'top';
    let bestDist = Infinity;
    for (const port of ports) {
      const p = getPortPoint(node, port);
      const dist = Math.hypot(p.x - point.x, p.y - point.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = port;
      }
    }
    return best;
  }

  function handleMouseMove() {
    const point = getPointerPosition();
    if (!point) return;

    if (draftEdge) {
      const source = nodes[draftEdge.fromNodeId];
      if (!source) return;
      const targetSnap = snapPosition(point.x, point.y);
      const preview = computeOrthogonalPath(
        source,
        draftEdge.fromPort,
        {
          id: 'preview',
          type: 'process',
          x: targetSnap.x - 1,
          y: targetSnap.y - 1,
          width: 2,
          height: 2,
          style: {},
        },
        'top'
      );
      setDraftEdge({ ...draftEdge, points: preview });
      return;
    }

    if (panning) {
      const dx = point.x - panStart.current.x;
      const dy = point.y - panStart.current.y;
      setViewport({
        ...viewport,
        offsetX: viewport.offsetX + dx * viewport.scale,
        offsetY: viewport.offsetY + dy * viewport.scale,
      });
      return;
    }

    if (isNodeTool(tool)) {
      const size = getDefaultNodeSize(tool);
      const snapped = snapPosition(point.x - size.width / 2, point.y - size.height / 2);
      setDraftNode({
        id: 'draft',
        type: tool,
        x: snapped.x,
        y: snapped.y,
        width: size.width,
        height: size.height,
        label: '',
        style: {
          fill: '#ffffff',
          stroke: '#334155',
          strokeWidth: 2,
          fontSize: 14,
          textColor: '#0f172a',
        },
      });
    }
  }

  function handleMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    if (event.target !== stageRef.current) return;
    if (tool === 'select') {
      setPanning(true);
      const point = getPointerPosition();
      if (point) panStart.current = point;
    }
  }

  function handleMouseUp() {
    if (draftEdge) {
      const point = getPointerPosition();
      if (point) {
        const target = nodeAtPoint(point, draftEdge.fromNodeId);
        if (target) {
          const toPort = closestPort(target, point);
          addEdge(draftEdge.fromNodeId, draftEdge.fromPort, target.id, toPort);
        }
      }
      setDraftEdge(null);
      return;
    }

    setPanning(false);
  }

  function handleStageClick() {
    const point = getPointerPosition();
    if (!point) return;

    if (isNodeTool(tool)) {
      const size = getDefaultNodeSize(tool);
      const snapped = snapPosition(point.x - size.width / 2, point.y - size.height / 2);
      const node = {
        id: crypto.randomUUID(),
        type: tool,
        x: snapped.x,
        y: snapped.y,
        width: size.width,
        height: size.height,
        label: '',
        style: {
          fill: '#ffffff',
          stroke: '#334155',
          strokeWidth: 2,
          fontSize: 14,
          textColor: '#0f172a',
        },
      };
      addNode(node);
      setDraftNode(null);
      return;
    }

    if (tool === 'select') {
      setSelection(null);
    }
  }

  function handleWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    event.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const worldBefore = pointerToCanvas(pointer);
    const newScale = Math.min(
      Math.max(viewport.scale * (event.evt.deltaY < 0 ? 1.1 : 0.9), 0.1),
      4
    );
    const offsetX = pointer.x - worldBefore.x * newScale;
    const offsetY = pointer.y - worldBefore.y * newScale;
    setViewport({ scale: newScale, offsetX, offsetY });
  }

  function handleNodeDragMove(id: string, x: number, y: number) {
    const node = nodes[id];
    if (!node) return;
    let nextX = x;
    let nextY = y;
    if (snap) {
      const guides = computeSmartGuides(
        { ...node, x: nextX, y: nextY },
        Object.values(nodes).filter((n) => n.id !== id),
        8
      );
      nextX += guides.dx ?? 0;
      nextY += guides.dy ?? 0;
      nextX = Math.round(nextX / GRID_SIZE) * GRID_SIZE;
      nextY = Math.round(nextY / GRID_SIZE) * GRID_SIZE;
    }
    liveMoveNode(id, { x: nextX, y: nextY });
  }

  function handleNodeDragEnd(id: string, x: number, y: number) {
    moveNode(id, { x, y });
  }

  function handlePortDragStart(nodeId: string, port: PortId) {
    const source = nodes[nodeId];
    if (!source) return;
    const point = getPortPoint(source, port);
    setDraftEdge({
      fromNodeId: nodeId,
      fromPort: port,
      points: [point.x, point.y, point.x, point.y],
    });
  }

  const selectedNodeId = selection?.type === 'node' ? selection.id : null;
  const selectedEdgeId = selection?.type === 'edge' ? selection.id : null;

  return (
    <div ref={containerRef} className="absolute inset-0">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.offsetX}
        y={viewport.offsetY}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
        onWheel={handleWheel}
        draggable={false}
      >
        <GridBackground
          viewport={viewport}
          visible={showGrid}
          width={size.width}
          height={size.height}
        />

        <Layer>
          {Object.values(edges).map((edge) => (
            <EdgeRenderer
              key={edge.id}
              edge={edge}
              nodes={nodes}
              isSelected={edge.id === selectedEdgeId}
              onClick={() => setSelection({ type: 'edge', id: edge.id })}
            />
          ))}
        </Layer>

        <Layer>
          {Object.values(nodes).map((node) => (
            <NodeRenderer
              key={node.id}
              node={node}
              isSelected={node.id === selectedNodeId}
              onClick={() => setSelection({ type: 'node', id: node.id })}
              onDoubleClick={() => setEditingNodeId(node.id)}
              onDragMove={(x, y) => handleNodeDragMove(node.id, x, y)}
              onDragEnd={(x, y) => handleNodeDragEnd(node.id, x, y)}
            />
          ))}
          {selectedNodeId && nodes[selectedNodeId] && (
            <PortHandles
              node={nodes[selectedNodeId]}
              visible
              onDragStart={(port) => handlePortDragStart(selectedNodeId, port)}
            />
          )}
          <DraftLayer draftNode={draftNode} draftEdgePoints={draftEdge?.points ?? null} />
        </Layer>
      </Stage>

      {editingNodeId && nodes[editingNodeId] && (
        <LabelEditor
          node={nodes[editingNodeId]}
          viewport={viewport}
          onCommit={(label) => {
            updateNode(editingNodeId, { label });
            setEditingNodeId(null);
          }}
          onCancel={() => setEditingNodeId(null)}
        />
      )}
    </div>
  );
}

function isNodeTool(tool: FlowchartTool): tool is FlowchartNode['type'] {
  return tool !== 'select' && tool !== 'connector';
}
