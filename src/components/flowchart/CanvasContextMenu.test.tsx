import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasContextMenu } from './CanvasContextMenu';

describe('CanvasContextMenu', () => {
  it('renders node menu items', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    render(
      <CanvasContextMenu
        x={100}
        y={100}
        target={{ type: 'node', id: 'n1' }}
        canForward
        canBackward
        onAction={onAction}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Bring to Front')).toBeInTheDocument();
    expect(screen.getByText('Bring Forward')).toBeInTheDocument();
    expect(screen.getByText('Send Backward')).toBeInTheDocument();
    expect(screen.getByText('Send to Back')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('renders edge menu with delete only', () => {
    const onAction = vi.fn();
    render(
      <CanvasContextMenu
        x={100}
        y={100}
        target={{ type: 'edge', id: 'e1' }}
        canForward={false}
        canBackward={false}
        onAction={onAction}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.queryByText('Bring to Front')).not.toBeInTheDocument();
    expect(screen.queryByText('Duplicate')).not.toBeInTheDocument();
  });

  it('disables forward/backward when requested', () => {
    render(
      <CanvasContextMenu
        x={100}
        y={100}
        target={{ type: 'node', id: 'n1' }}
        canForward={false}
        canBackward={false}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Bring Forward')).toBeDisabled();
    expect(screen.getByText('Send Backward')).toBeDisabled();
  });

  it('fires action and closes on item click', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    render(
      <CanvasContextMenu
        x={100}
        y={100}
        target={{ type: 'node', id: 'n1' }}
        canForward
        canBackward
        onAction={onAction}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Duplicate'));
    expect(onAction).toHaveBeenCalledWith('duplicate');
    expect(onClose).toHaveBeenCalled();
  });
});
