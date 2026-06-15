import { useEffect, useMemo, useRef, useState } from 'react';
import { useFlowchartStore } from '@/store/flowchartStore';
import type { Viewport } from '@/types/flowchart';

const WIDTH = 160;
const HEIGHT = 120;
const PADDING = 8;

interface Transform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { nodes, edges, viewport, setViewport } = useFlowchartStore();

  const nodeList = useMemo(() => Object.values(nodes), [nodes]);

  const transform = useMemo<Transform>(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodeList) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    const graphWidth = Math.max(maxX - minX, 1);
    const graphHeight = Math.max(maxY - minY, 1);
    const scale = Math.min(
      (WIDTH - PADDING * 2) / graphWidth,
      (HEIGHT - PADDING * 2) / graphHeight
    );
    return {
      scale,
      offsetX: PADDING - minX * scale,
      offsetY: PADDING - minY * scale,
    };
  }, [nodeList]);

  const visibleWorld = useMemo(
    () => ({
      x: -viewport.offsetX / viewport.scale,
      y: -viewport.offsetY / viewport.scale,
      width: window.innerWidth / viewport.scale,
      height: window.innerHeight / viewport.scale,
    }),
    [viewport]
  );

  const allNodesVisible =
    nodeList.length > 0 &&
    nodeList.every(
      (node) =>
        node.x >= visibleWorld.x &&
        node.y >= visibleWorld.y &&
        node.x + node.width <= visibleWorld.x + visibleWorld.width &&
        node.y + node.height <= visibleWorld.y + visibleWorld.height
    );

  const shouldHide = nodeList.length === 0 || allNodesVisible;

  useEffect(() => {
    if (shouldHide) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = '#94a3b8';
    for (const edge of Object.values(edges)) {
      const source = nodes[edge.fromNodeId];
      const target = nodes[edge.toNodeId];
      if (!source || !target) continue;
      const sx = (source.x + source.width / 2) * transform.scale + transform.offsetX;
      const sy = (source.y + source.height / 2) * transform.scale + transform.offsetY;
      const tx = (target.x + target.width / 2) * transform.scale + transform.offsetX;
      const ty = (target.y + target.height / 2) * transform.scale + transform.offsetY;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    ctx.fillStyle = '#334155';
    for (const node of nodeList) {
      const x = node.x * transform.scale + transform.offsetX;
      const y = node.y * transform.scale + transform.offsetY;
      ctx.fillRect(x, y, node.width * transform.scale, node.height * transform.scale);
    }

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      visibleWorld.x * transform.scale + transform.offsetX,
      visibleWorld.y * transform.scale + transform.offsetY,
      visibleWorld.width * transform.scale,
      visibleWorld.height * transform.scale
    );
  }, [nodes, edges, viewport, nodeList, shouldHide, transform, visibleWorld]);

  function pixelToWorld(pixelX: number, pixelY: number) {
    return {
      x: (pixelX - transform.offsetX) / transform.scale,
      y: (pixelY - transform.offsetY) / transform.scale,
    };
  }

  function isInsideViewportRect(pixelX: number, pixelY: number) {
    const world = pixelToWorld(pixelX, pixelY);
    return (
      world.x >= visibleWorld.x &&
      world.y >= visibleWorld.y &&
      world.x <= visibleWorld.x + visibleWorld.width &&
      world.y <= visibleWorld.y + visibleWorld.height
    );
  }

  const dragState = useRef<{
    startViewport: Viewport;
    startWorld: { x: number; y: number };
    startPixel: { x: number; y: number };
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hoveringRect, setHoveringRect] = useState(false);
  const hasDraggedRef = useRef(false);

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;

    if (isInsideViewportRect(pixelX, pixelY)) {
      dragState.current = {
        startViewport: viewport,
        startWorld: pixelToWorld(pixelX, pixelY),
        startPixel: { x: pixelX, y: pixelY },
      };
      hasDraggedRef.current = false;
      setDragging(true);
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;

    if (!dragState.current) {
      setHoveringRect(isInsideViewportRect(pixelX, pixelY));
      return;
    }

    const world = pixelToWorld(pixelX, pixelY);
    const distance = Math.hypot(
      pixelX - dragState.current.startPixel.x,
      pixelY - dragState.current.startPixel.y
    );
    if (distance > 2) {
      hasDraggedRef.current = true;
    }

    const deltaX = world.x - dragState.current.startWorld.x;
    const deltaY = world.y - dragState.current.startWorld.y;

    setViewport({
      ...dragState.current.startViewport,
      offsetX: dragState.current.startViewport.offsetX - deltaX * dragState.current.startViewport.scale,
      offsetY: dragState.current.startViewport.offsetY - deltaY * dragState.current.startViewport.scale,
    });
  }

  function handlePointerUp() {
    dragState.current = null;
    setDragging(false);
  }

  function handlePointerLeave() {
    dragState.current = null;
    setDragging(false);
    setHoveringRect(false);
  }

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;
    const world = pixelToWorld(pixelX, pixelY);

    setViewport({
      ...viewport,
      offsetX: -world.x * viewport.scale + window.innerWidth / 2,
      offsetY: -world.y * viewport.scale + window.innerHeight / 2,
    });
  }

  if (shouldHide) {
    return null;
  }

  return (
    <div className="absolute bottom-3 right-3 z-20 rounded-lg border bg-background p-1 shadow-md">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        style={{
          cursor: dragging ? 'grabbing' : hoveringRect ? 'grab' : 'default',
        }}
      />
    </div>
  );
}
