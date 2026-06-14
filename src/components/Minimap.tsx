import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useEditorStore } from '@/store/editorStore';
import {
  getShapeBounds,
  type Bounds,
} from '@/utils/geometry';
import { useTheme } from '@/theme/ThemeProvider';

const PANEL_WIDTH = 180;
const PANEL_HEIGHT = 120;
const PADDING = 8;
const DEFAULT_BOUNDS: Bounds = {
  x: -400,
  y: -300,
  width: 800,
  height: 600,
};

function getWorldBounds(bounds: Bounds[]): Bounds {
  if (bounds.length === 0) return DEFAULT_BOUNDS;

  const minX = Math.min(...bounds.map((item) => item.x));
  const minY = Math.min(...bounds.map((item) => item.y));
  const maxX = Math.max(...bounds.map((item) => item.x + item.width));
  const maxY = Math.max(...bounds.map((item) => item.y + item.height));

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
}

export function Minimap() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const shapes = useEditorStore((state) => state.shapes);
  const viewport = useEditorStore((state) => state.viewport);
  const setViewport = useEditorStore((state) => state.setViewport);
  const colors =
    theme === 'dark'
      ? { background: '#191c23', shape: '#64748b' }
      : { background: '#f8fafc', shape: '#94a3b8' };

  const shapeBounds = useMemo(
    () =>
      Object.values(shapes)
        .map((shape) => getShapeBounds(shape))
        .filter((bounds): bounds is Bounds => bounds !== null),
    [shapes]
  );
  const worldBounds = useMemo(
    () => getWorldBounds(shapeBounds),
    [shapeBounds]
  );
  const minimapScale = Math.min(
    (PANEL_WIDTH - PADDING * 2) / worldBounds.width,
    (PANEL_HEIGHT - PADDING * 2) / worldBounds.height
  );
  const contentWidth = worldBounds.width * minimapScale;
  const contentHeight = worldBounds.height * minimapScale;
  const originX = (PANEL_WIDTH - contentWidth) / 2;
  const originY = (PANEL_HEIGHT - contentHeight) / 2;

  const worldToMinimap = useCallback(
    (x: number, y: number) => ({
      x: originX + (x - worldBounds.x) * minimapScale,
      y: originY + (y - worldBounds.y) * minimapScale,
    }),
    [minimapScale, originX, originY, worldBounds]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    context.fillStyle = colors.background;
    context.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);

    context.fillStyle = colors.shape;
    for (const bounds of shapeBounds) {
      const position = worldToMinimap(bounds.x, bounds.y);
      context.fillRect(
        position.x,
        position.y,
        Math.max(bounds.width * minimapScale, 2),
        Math.max(bounds.height * minimapScale, 2)
      );
    }

    const visibleWorld = {
      x: -viewport.offsetX / viewport.scale,
      y: -viewport.offsetY / viewport.scale,
      width: window.innerWidth / viewport.scale,
      height: window.innerHeight / viewport.scale,
    };
    const viewportPosition = worldToMinimap(
      visibleWorld.x,
      visibleWorld.y
    );

    context.strokeStyle = '#2563eb';
    context.lineWidth = 2;
    context.strokeRect(
      viewportPosition.x,
      viewportPosition.y,
      visibleWorld.width * minimapScale,
      visibleWorld.height * minimapScale
    );
  }, [
    colors.background,
    colors.shape,
    minimapScale,
    shapeBounds,
    viewport,
    worldToMinimap,
  ]);

  const panToPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const minimapX =
      ((event.clientX - rect.left) / rect.width) * PANEL_WIDTH;
    const minimapY =
      ((event.clientY - rect.top) / rect.height) * PANEL_HEIGHT;
    const worldX =
      worldBounds.x + (minimapX - originX) / minimapScale;
    const worldY =
      worldBounds.y + (minimapY - originY) / minimapScale;

    setViewport({
      offsetX: window.innerWidth / 2 - worldX * viewport.scale,
      offsetY: window.innerHeight / 2 - worldY * viewport.scale,
    });
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    panToPointer(event);
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (isDragging) panToPointer(event);
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  return (
    <div className="absolute bottom-16 right-3 z-20 overflow-hidden rounded-lg border bg-background shadow-md">
      <canvas
        ref={canvasRef}
        width={PANEL_WIDTH}
        height={PANEL_HEIGHT}
        className="block cursor-crosshair touch-none"
        aria-label="Board minimap"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDragging(false)}
      />
    </div>
  );
}
