import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FlowchartCanvas } from './FlowchartCanvas';
import { useFlowchartStore } from '@/store/flowchartStore';
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  useFlowchartStore.setState({
    nodes: {},
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

describe('FlowchartCanvas', () => {
  it('renders the canvas', () => {
    const { container } = render(<FlowchartCanvas />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
