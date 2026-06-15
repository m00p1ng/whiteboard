import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, fireEvent } from '@testing-library/react';
import { Minimap } from './Minimap';
import { useFlowchartStore } from '@/store/flowchartStore';

const context = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  stroke: vi.fn(),
  strokeRect: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D
  );
  vi.stubGlobal('innerWidth', 1000);
  vi.stubGlobal('innerHeight', 800);
  context.strokeRect.mockClear();

  useFlowchartStore.setState({
    nodes: {
      n1: { id: 'n1', type: 'process', x: 0, y: 0, width: 1000, height: 500, style: {} },
    },
    edges: {},
    selection: null,
    tool: 'select',
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    showGrid: true,
    snap: true,
    editingNodeId: null,
    undoStack: [],
    redoStack: [],
  });
});

describe('Minimap', () => {
  it('renders a canvas', () => {
    useFlowchartStore.setState({
      nodes: {
        n1: { id: 'n1', type: 'process', x: 0, y: 0, width: 1200, height: 900, style: {} },
      },
    });
    const { container } = render(<Minimap />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('draws the current browser viewport in minimap coordinates', () => {
    useFlowchartStore.setState({
      viewport: { scale: 2, offsetX: -200, offsetY: -100 },
    });

    render(<Minimap />);

    expect(context.strokeRect).toHaveBeenLastCalledWith(
      22.4,
      15.2,
      72,
      57.599999999999994
    );
  });

  it('hides the minimap when there are no nodes', () => {
    useFlowchartStore.setState({ nodes: {} });
    const { container } = render(<Minimap />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('hides the minimap when all nodes fit inside the viewport', () => {
    useFlowchartStore.setState({
      nodes: {
        n1: { id: 'n1', type: 'process', x: 0, y: 0, width: 1000, height: 500, style: {} },
      },
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    });
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 800);

    const { container } = render(<Minimap />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('shows the minimap when a node is outside the viewport', () => {
    useFlowchartStore.setState({
      nodes: {
        n1: { id: 'n1', type: 'process', x: 1200, y: 0, width: 100, height: 100, style: {} },
      },
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    });
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 800);

    const { container } = render(<Minimap />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('shows the minimap when a visible node moves outside the viewport', () => {
    const { container } = render(<Minimap />);
    expect(container.querySelector('canvas')).toBeNull();

    act(() => {
      useFlowchartStore.setState({
        nodes: {
          n1: { id: 'n1', type: 'process', x: 1200, y: 0, width: 100, height: 100, style: {} },
        },
      });
    });

    expect(container.querySelector('canvas')).toBeTruthy();
  });
});

function getMinimapTransform(nodes: Record<string, { x: number; y: number; width: number; height: number }>) {
  const nodeList = Object.values(nodes);
  const minX = Math.min(...nodeList.map((n) => n.x));
  const minY = Math.min(...nodeList.map((n) => n.y));
  const maxX = Math.max(...nodeList.map((n) => n.x + n.width));
  const maxY = Math.max(...nodeList.map((n) => n.y + n.height));
  const graphWidth = Math.max(maxX - minX, 1);
  const graphHeight = Math.max(maxY - minY, 1);
  const scale = Math.min(144 / graphWidth, 104 / graphHeight);
  return { scale, offsetX: 8 - minX * scale, offsetY: 8 - minY * scale };
}

function mockCanvasRect(canvas: HTMLCanvasElement) {
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 160, height: 120 }),
    configurable: true,
  });
}

it('pans the viewport when the blue rectangle is dragged', () => {
  const nodes = {
    n1: { id: 'n1', type: 'process' as const, x: 0, y: 0, width: 1000, height: 500, style: {} },
    n2: { id: 'n2', type: 'process' as const, x: 1200, y: 0, width: 100, height: 100, style: {} },
  };
  useFlowchartStore.setState({ nodes, viewport: { scale: 1, offsetX: 0, offsetY: 0 } });
  const { container } = render(<Minimap />);
  const canvas = container.querySelector('canvas')!;
  mockCanvasRect(canvas);
  const { scale, offsetX: mx, offsetY: my } = getMinimapTransform(nodes);

  const startWorldX = 300;
  const startPixelX = mx + startWorldX * scale;
  const startPixelY = my + 50 * scale;
  const endPixelX = startPixelX + 50;

  fireEvent.pointerDown(canvas, { clientX: startPixelX, clientY: startPixelY });
  fireEvent.pointerMove(canvas, { clientX: endPixelX, clientY: startPixelY });
  fireEvent.pointerUp(canvas, { clientX: endPixelX, clientY: startPixelY });

  const viewport = useFlowchartStore.getState().viewport;
  const expectedOffsetX = -(50 / scale) * viewport.scale;
  expect(viewport.offsetX).toBeCloseTo(expectedOffsetX, 0);
});

it('centers the viewport on the clicked world point', () => {
  const nodes = {
    n1: { id: 'n1', type: 'process' as const, x: 0, y: 0, width: 1000, height: 500, style: {} },
    n2: { id: 'n2', type: 'process' as const, x: 1200, y: 0, width: 100, height: 100, style: {} },
  };
  useFlowchartStore.setState({ nodes, viewport: { scale: 1, offsetX: 0, offsetY: 0 } });
  const { container } = render(<Minimap />);
  const canvas = container.querySelector('canvas')!;
  mockCanvasRect(canvas);
  const { scale, offsetX: mx, offsetY: my } = getMinimapTransform(nodes);

  const clickWorldX = 600;
  const clickWorldY = 200;
  const clickPixelX = mx + clickWorldX * scale;
  const clickPixelY = my + clickWorldY * scale;

  fireEvent.click(canvas, { clientX: clickPixelX, clientY: clickPixelY });

  const viewport = useFlowchartStore.getState().viewport;
  expect(viewport.offsetX).toBeCloseTo(-clickWorldX + 500, 0);
  expect(viewport.offsetY).toBeCloseTo(-clickWorldY + 400, 0);
});
