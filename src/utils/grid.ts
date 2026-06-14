import type { Viewport } from '@/store/editorStore';

export const MINOR_SPACING = 20;
export const MAJOR_SPACING = 100;

export interface GridContext {
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  stroke: () => void;
  fillStrokeShape: (shape: unknown) => void;
  strokeStyle: string;
  lineWidth: number;
}

export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function getGridColors() {
  if (isDarkMode()) {
    return {
      minor: '#27272a',
      major: '#52525b',
    };
  }
  return {
    minor: '#e2e8f0',
    major: '#94a3b8',
  };
}

export function drawGrid(
  context: GridContext,
  viewport: Viewport,
  width: number,
  height: number
) {
  const { scale, offsetX, offsetY } = viewport;

  const worldMinX = -offsetX / scale;
  const worldMaxX = (width - offsetX) / scale;
  const worldMinY = -offsetY / scale;
  const worldMaxY = (height - offsetY) / scale;

  const startX = Math.floor(worldMinX / MINOR_SPACING) * MINOR_SPACING;
  const endX = Math.ceil(worldMaxX / MINOR_SPACING) * MINOR_SPACING;
  const startY = Math.floor(worldMinY / MINOR_SPACING) * MINOR_SPACING;
  const endY = Math.ceil(worldMaxY / MINOR_SPACING) * MINOR_SPACING;

  const colors = getGridColors();

  context.beginPath();
  for (let x = startX; x <= endX; x += MINOR_SPACING) {
    context.moveTo(x, worldMinY);
    context.lineTo(x, worldMaxY);
  }
  for (let y = startY; y <= endY; y += MINOR_SPACING) {
    context.moveTo(worldMinX, y);
    context.lineTo(worldMaxX, y);
  }
  context.strokeStyle = colors.minor;
  context.lineWidth = 1 / scale;
  context.stroke();

  context.beginPath();
  const majorStartX = Math.floor(worldMinX / MAJOR_SPACING) * MAJOR_SPACING;
  const majorEndX = Math.ceil(worldMaxX / MAJOR_SPACING) * MAJOR_SPACING;
  const majorStartY = Math.floor(worldMinY / MAJOR_SPACING) * MAJOR_SPACING;
  const majorEndY = Math.ceil(worldMaxY / MAJOR_SPACING) * MAJOR_SPACING;

  for (let x = majorStartX; x <= majorEndX; x += MAJOR_SPACING) {
    context.moveTo(x, worldMinY);
    context.lineTo(x, worldMaxY);
  }
  for (let y = majorStartY; y <= majorEndY; y += MAJOR_SPACING) {
    context.moveTo(worldMinX, y);
    context.lineTo(worldMaxX, y);
  }
  context.strokeStyle = colors.major;
  context.lineWidth = 1.5 / scale;
  context.stroke();
}
