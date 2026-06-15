import type { Viewport } from '@/store/editorStore';

const TARGET_MAJOR_SCREEN_SPACING = 100;

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
      major: '#3f3f46',
    };
  }
  return {
    minor: '#e2e8f0',
    major: '#cbd5e1',
  };
}

function getNiceStep(target: number): number {
  if (target <= 0 || !Number.isFinite(target)) return 1;

  const exponent = Math.floor(Math.log10(target));
  const base = 10 ** exponent;
  const normalized = target / base;

  const multipliers =
    normalized <= 1.4 ? [1, 2] : normalized <= 3.5 ? [2, 5] : [5, 10];

  let best = base * multipliers[0];
  let bestDiff = Infinity;
  for (const multiplier of multipliers) {
    const step = base * multiplier;
    const diff = Math.abs(Math.log(step) - Math.log(target));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = step;
    }
  }
  return best;
}

export function getGridSpacing(scale: number): {
  majorStep: number;
  minorStep: number;
} {
  const majorStep = getNiceStep(TARGET_MAJOR_SCREEN_SPACING / scale);
  const minorStep = majorStep / 5;
  return { majorStep, minorStep };
}

export function drawGrid(
  context: GridContext,
  viewport: Viewport,
  width: number,
  height: number
) {
  const { scale, offsetX, offsetY } = viewport;

  const worldMinX = -offsetX / scale === 0 ? 0 : -offsetX / scale;
  const worldMaxX = (width - offsetX) / scale;
  const worldMinY = -offsetY / scale === 0 ? 0 : -offsetY / scale;
  const worldMaxY = (height - offsetY) / scale;

  const { majorStep, minorStep } = getGridSpacing(scale);

  const startX = Math.floor(worldMinX / minorStep) * minorStep;
  const endX = Math.ceil(worldMaxX / minorStep) * minorStep;
  const startY = Math.floor(worldMinY / minorStep) * minorStep;
  const endY = Math.ceil(worldMaxY / minorStep) * minorStep;

  const colors = getGridColors();

  context.beginPath();
  for (let x = startX; x <= endX; x += minorStep) {
    context.moveTo(x, worldMinY);
    context.lineTo(x, worldMaxY);
  }
  for (let y = startY; y <= endY; y += minorStep) {
    context.moveTo(worldMinX, y);
    context.lineTo(worldMaxX, y);
  }
  context.strokeStyle = colors.minor;
  context.lineWidth = 1 / scale;
  context.stroke();

  context.beginPath();
  const majorStartX = Math.floor(worldMinX / majorStep) * majorStep;
  const majorEndX = Math.ceil(worldMaxX / majorStep) * majorStep;
  const majorStartY = Math.floor(worldMinY / majorStep) * majorStep;
  const majorEndY = Math.ceil(worldMaxY / majorStep) * majorStep;

  for (let x = majorStartX; x <= majorEndX; x += majorStep) {
    context.moveTo(x, worldMinY);
    context.lineTo(x, worldMaxY);
  }
  for (let y = majorStartY; y <= majorEndY; y += majorStep) {
    context.moveTo(worldMinX, y);
    context.lineTo(worldMaxX, y);
  }
  context.strokeStyle = colors.major;
  context.lineWidth = 1.5 / scale;
  context.stroke();
}
