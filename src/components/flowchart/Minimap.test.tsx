import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Minimap } from './Minimap';
import { useFlowchartStore } from '@/store/flowchartStore';
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  useFlowchartStore.setState({
    nodes: {
      n1: { id: 'n1', type: 'process', x: 0, y: 0, width: 100, height: 60, style: {} },
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
    const { container } = render(<Minimap />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
