import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
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
