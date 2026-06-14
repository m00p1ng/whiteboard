import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShapeContextMenu } from './ShapeContextMenu';

describe('ShapeContextMenu', () => {
  it('renders at the given position and calls handlers on click', () => {
    const onBringToFront = vi.fn();
    const onBringForward = vi.fn();
    const onSendBackward = vi.fn();
    const onSendToBack = vi.fn();

    render(
      <ShapeContextMenu
        x={10}
        y={20}
        canBringForward
        canSendBackward
        onBringToFront={onBringToFront}
        onBringForward={onBringForward}
        onSendBackward={onSendBackward}
        onSendToBack={onSendToBack}
      />
    );

    const menu = screen.getByRole('menu');
    expect(menu).toHaveStyle({ left: '10px', top: '20px' });

    fireEvent.click(screen.getByText('Bring to Front'));
    expect(onBringToFront).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Bring Forward'));
    expect(onBringForward).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Send Backward'));
    expect(onSendBackward).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Send to Back'));
    expect(onSendToBack).toHaveBeenCalled();
  });

  it('disables Bring Forward / Send Backward at the edges', () => {
    const onBringForward = vi.fn();
    const onSendBackward = vi.fn();

    render(
      <ShapeContextMenu
        x={0}
        y={0}
        canBringForward={false}
        canSendBackward={false}
        onBringToFront={() => undefined}
        onBringForward={onBringForward}
        onSendBackward={onSendBackward}
        onSendToBack={() => undefined}
      />
    );

    fireEvent.click(screen.getByText('Bring Forward'));
    fireEvent.click(screen.getByText('Send Backward'));

    expect(onBringForward).not.toHaveBeenCalled();
    expect(onSendBackward).not.toHaveBeenCalled();
  });
});
