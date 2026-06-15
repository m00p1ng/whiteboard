import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from './TopBar';
import { useFlowchartStore } from '@/store/flowchartStore';

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

  it('displays the current zoom percentage', () => {
    render(<TopBar />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('updates the zoom percentage after zooming', () => {
    render(<TopBar />);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(screen.getByText('110%')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('does not have floating margin or rounded top corners', () => {
    render(<TopBar />);
    const header = screen.getByRole('banner');
    expect(header).not.toHaveClass('left-3');
    expect(header).not.toHaveClass('right-3');
    expect(header).not.toHaveClass('top-3');
    expect(header).not.toHaveClass('rounded-lg');
  });
});
