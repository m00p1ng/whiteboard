import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { useFlowchartStore } from '@/store/flowchartStore';

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
        style: {
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidth: 2,
          fontSize: 14,
          textColor: '#0f172a',
          fontFamily: 'Inter',
        },
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

  it('updates stroke color', () => {
    render(<PropertiesPanel />);
    const inputs = screen.getAllByDisplayValue('#000000');
    fireEvent.change(inputs[0], { target: { value: '#ff0000' } });
    expect(useFlowchartStore.getState().nodes['n1'].style.stroke).toBe('#ff0000');
  });

  it('updates text color', () => {
    render(<PropertiesPanel />);
    const inputs = screen.getAllByDisplayValue('#0f172a');
    fireEvent.change(inputs[0], { target: { value: '#00ff00' } });
    expect(useFlowchartStore.getState().nodes['n1'].style.textColor).toBe('#00ff00');
  });

  it('updates font size', () => {
    render(<PropertiesPanel />);
    const input = screen.getByDisplayValue('14');
    fireEvent.change(input, { target: { value: '24' } });
    expect(useFlowchartStore.getState().nodes['n1'].style.fontSize).toBe(24);
  });

  it('updates font family', () => {
    render(<PropertiesPanel />);
    const select = screen.getByDisplayValue('Inter');
    fireEvent.change(select, { target: { value: 'Georgia' } });
    expect(useFlowchartStore.getState().nodes['n1'].style.fontFamily).toBe('Georgia');
  });
});
