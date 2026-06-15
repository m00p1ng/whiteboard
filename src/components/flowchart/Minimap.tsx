import { useEffect, useMemo, useRef } from 'react';
import { useFlowchartStore } from '@/store/flowchartStore';

const WIDTH = 160;
const HEIGHT = 120;
const PADDING = 8;

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { nodes, edges, viewport } = useFlowchartStore();

  const nodeList = useMemo(() => Object.values(nodes), [nodes]);

  const visibleWorld = {
    x: -viewport.offsetX / viewport.scale,
    y: -viewport.offsetY / viewport.scale,
    width: window.innerWidth / viewport.scale,
    height: window.innerHeight / viewport.scale,
  };

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
    const offsetX = PADDING - minX * scale;
    const offsetY = PADDING - minY * scale;

    ctx.strokeStyle = '#94a3b8';
    for (const edge of Object.values(edges)) {
      const source = nodes[edge.fromNodeId];
      const target = nodes[edge.toNodeId];
      if (!source || !target) continue;
      const sx = (source.x + source.width / 2) * scale + offsetX;
      const sy = (source.y + source.height / 2) * scale + offsetY;
      const tx = (target.x + target.width / 2) * scale + offsetX;
      const ty = (target.y + target.height / 2) * scale + offsetY;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    ctx.fillStyle = '#334155';
    for (const node of nodeList) {
      const x = node.x * scale + offsetX;
      const y = node.y * scale + offsetY;
      ctx.fillRect(x, y, node.width * scale, node.height * scale);
    }

    const effectVisibleWorld = {
      x: -viewport.offsetX / viewport.scale,
      y: -viewport.offsetY / viewport.scale,
      width: window.innerWidth / viewport.scale,
      height: window.innerHeight / viewport.scale,
    };

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      effectVisibleWorld.x * scale + offsetX,
      effectVisibleWorld.y * scale + offsetY,
      effectVisibleWorld.width * scale,
      effectVisibleWorld.height * scale
    );
  }, [nodes, edges, viewport, nodeList, shouldHide]);

  if (shouldHide) {
    return null;
  }

  return (
    <div className="absolute bottom-3 right-3 z-20 rounded-lg border bg-background p-1 shadow-md">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
    </div>
  );
}
