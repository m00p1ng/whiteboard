import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftToolbar } from './LeftToolbar';
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

describe('LeftToolbar', () => {
  it('switches to process tool when clicked', () => {
    render(<LeftToolbar />);
    fireEvent.click(screen.getByLabelText('Process'));
    expect(useFlowchartStore.getState().tool).toBe('process');
  });

  it('opens the symbol palette', () => {
    render(<LeftToolbar />);
    fireEvent.click(screen.getByLabelText('More symbols'));
    expect(screen.getByText('Advanced')).toBeTruthy();
  });
});
