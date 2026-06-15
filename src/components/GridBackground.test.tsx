import { beforeEach, describe, expect, it } from 'vitest';
import { Layer } from 'react-konva';
import { drawGrid, getGridColors, isDarkMode } from '@/utils/grid';
import type { GridContext } from '@/utils/grid';
import { GridBackground } from './GridBackground';

function createMockContext(): GridContext & {
  strokes: Array<{ color: string; width: number }>;
  paths: Array<{
    type: 'minor' | 'major';
    moves: [number, number][];
    lines: [number, number][];
  }>;
} {
  const paths: Array<{
    type: 'minor' | 'major';
    moves: [number, number][];
    lines: [number, number][];
  }> = [];
  const strokes: Array<{ color: string; width: number }> = [];
  let currentPath: {
    type: 'minor' | 'major';
    moves: [number, number][];
    lines: [number, number][];
  } | null = null;
  let currentColor = '';
  let currentWidth = 0;

  return {
    strokes,
    paths,
    beginPath: () => {
      currentPath = {
        type: paths.length === 0 ? 'minor' : 'major',
        moves: [],
        lines: [],
      };
      paths.push(currentPath);
    },
    moveTo: (x, y) => {
      currentPath?.moves.push([x, y]);
    },
    lineTo: (x, y) => {
      currentPath?.lines.push([x, y]);
    },
    stroke: () => {
      if (!currentPath) return;
      strokes.push({ color: currentColor, width: currentWidth });
    },
    fillStrokeShape: () => {},
    get strokeStyle() {
      return currentColor;
    },
    set strokeStyle(value: string) {
      currentColor = value;
    },
    get lineWidth() {
      return currentWidth;
    },
    set lineWidth(value: number) {
      currentWidth = value;
    },
  };
}

function getVerticalLineXs(
  path: { moves: [number, number][]; lines: [number, number][] } | undefined
): number[] {
  if (!path) return [];
  return path.moves
    .map(([x], i) => ({ x, lineX: path.lines[i][0] }))
    .filter(({ x, lineX }) => x === lineX)
    .map(({ x }) => x);
}

const viewport = { scale: 1, offsetX: 0, offsetY: 0 };

describe('GridBackground drawing', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('draws minor lines at 20px intervals and major lines at 100px intervals at scale 1', () => {
    const context = createMockContext();
    drawGrid(context, viewport, 200, 200);

    const minorPath = context.paths.find((p) => p.type === 'minor');
    const majorPath = context.paths.find((p) => p.type === 'major');

    expect(minorPath).toBeDefined();
    expect(majorPath).toBeDefined();

    // With a 200x200 viewport at scale 1 and offset 0, world bounds are 0..200.
    // Minor lines: 0, 20, 40, ..., 200 => 11 vertical + 11 horizontal => 22 lines.
    // Each line is one move + one line.
    expect(minorPath!.moves).toHaveLength(22);
    expect(minorPath!.lines).toHaveLength(22);

    // Major lines: 0, 100, 200 => 3 vertical + 3 horizontal => 6 lines.
    expect(majorPath!.moves).toHaveLength(6);
    expect(majorPath!.lines).toHaveLength(6);
  });

  it('adapts major spacing to keep screen density at scale 2', () => {
    const context = createMockContext();
    drawGrid(context, { scale: 2, offsetX: 0, offsetY: 0 }, 200, 200);

    const majorPath = context.paths.find((p) => p.type === 'major');
    const xs = getVerticalLineXs(majorPath);

    // World bounds 0..100. Target major spacing 50px world -> nice step 50.
    expect(xs).toEqual([0, 50, 100]);
  });

  it('adapts major spacing to keep screen density when zoomed out', () => {
    const context = createMockContext();
    drawGrid(context, { scale: 0.5, offsetX: 0, offsetY: 0 }, 200, 200);

    const majorPath = context.paths.find((p) => p.type === 'major');
    const xs = getVerticalLineXs(majorPath);

    // World bounds 0..400. Target major spacing 200px world -> nice step 200.
    expect(xs).toEqual([0, 200, 400]);
  });

  it('uses light mode colors by default', () => {
    expect(getGridColors()).toEqual({
      minor: '#e2e8f0',
      major: '#e2e8f0',
    });
  });

  it('uses dark mode colors when html has dark class', () => {
    document.documentElement.classList.add('dark');
    expect(isDarkMode()).toBe(true);
    expect(getGridColors()).toEqual({
      minor: '#27272a',
      major: '#27272a',
    });
  });

  it('scales minor and major line widths inversely with viewport scale', () => {
    const context = createMockContext();
    drawGrid(context, { scale: 2, offsetX: 0, offsetY: 0 }, 200, 200);

    const [minorStroke, majorStroke] = context.strokes;

    expect(minorStroke).toEqual({ color: '#e2e8f0', width: 0.25 });
    expect(majorStroke).toEqual({ color: '#e2e8f0', width: 0.5 });
  });
});

describe('GridBackground component', () => {
  it('returns null when hidden', () => {
    const result = GridBackground({
      viewport,
      visible: false,
      width: 200,
      height: 200,
    });
    expect(result).toBeNull();
  });

  it('returns a non-listening Layer with a Shape when visible', () => {
    const result = GridBackground({
      viewport,
      visible: true,
      width: 200,
      height: 200,
    });
    expect(result).not.toBeNull();
    expect(result?.type).toBe(Layer);
    expect(result?.props.listening).toBe(false);
    expect(result?.props.children).toBeDefined();
  });
});
