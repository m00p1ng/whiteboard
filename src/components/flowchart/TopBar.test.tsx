import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from './TopBar';
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

describe('TopBar', () => {
  it('zooms in when clicked', () => {
    render(<TopBar />);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(useFlowchartStore.getState().viewport.scale).toBeGreaterThan(1);
  });
});
