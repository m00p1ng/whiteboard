import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { useFlowchartStore } from '@/store/flowchartStore';
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  useFlowchartStore.setState({
    nodes: {
      n1: {
        id: 'n1',
        type: 'process',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
        label: 'Step',
        style: { fill: '#ffffff', stroke: '#000000', strokeWidth: 2 },
      },
    },
    edges: {},
    selection: { type: 'node', id: 'n1' },
    tool: 'select',
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    showGrid: true,
    snap: true,
    editingNodeId: null,
    undoStack: [],
    redoStack: [],
  });
});

describe('PropertiesPanel', () => {
  it('updates the node label', () => {
    render(<PropertiesPanel />);
    const input = screen.getByDisplayValue('Step');
    fireEvent.change(input, { target: { value: 'Updated' } });
    fireEvent.blur(input);
    expect(useFlowchartStore.getState().nodes['n1'].label).toBe('Updated');
  });
});
