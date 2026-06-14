import { beforeEach, describe, expect, it } from 'vitest';
import { Layer } from 'react-konva';
import {
  drawGrid,
  getGridColors,
  GridBackground,
  isDarkMode,
  MAJOR_SPACING,
  MINOR_SPACING,
} from './GridBackground';
import type { GridContext } from './GridBackground';

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
      currentPath = { type: 'minor', moves: [], lines: [] };
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
      currentPath.type =
        currentColor === '#94a3b8' || currentColor === '#52525b'
          ? 'major'
          : 'minor';
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

const viewport = { scale: 1, offsetX: 0, offsetY: 0 };

describe('GridBackground drawing', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('draws minor lines at 20px intervals and major lines at 100px intervals', () => {
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

  it('uses light mode colors by default', () => {
    expect(getGridColors()).toEqual({
      minor: '#e2e8f0',
      major: '#94a3b8',
    });
  });

  it('uses dark mode colors when html has dark class', () => {
    document.documentElement.classList.add('dark');
    expect(isDarkMode()).toBe(true);
    expect(getGridColors()).toEqual({
      minor: '#27272a',
      major: '#52525b',
    });
  });

  it('scales minor and major line widths inversely with viewport scale', () => {
    const context = createMockContext();
    drawGrid(context, { scale: 2, offsetX: 0, offsetY: 0 }, 200, 200);

    const minorStroke = context.strokes.find((s) => s.color === '#e2e8f0');
    const majorStroke = context.strokes.find((s) => s.color === '#94a3b8');

    expect(minorStroke).toEqual({ color: '#e2e8f0', width: 0.5 });
    expect(majorStroke).toEqual({ color: '#94a3b8', width: 0.75 });
  });
});

describe('GridBackground component', () => {
  it('returns null when hidden', () => {
    const result = GridBackground({ viewport, visible: false });
    expect(result).toBeNull();
  });

  it('returns a non-listening Layer with a Shape when visible', () => {
    const result = GridBackground({ viewport, visible: true });
    expect(result).not.toBeNull();
    expect(result?.type).toBe(Layer);
    expect(result?.props.listening).toBe(false);
    expect(result?.props.children).toBeDefined();
  });
});
