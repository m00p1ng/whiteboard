import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CircleShape, RectShape } from '@/types/shape';
import { ShapeTextEditor } from './ShapeTextEditor';

const viewport = { scale: 2, offsetX: 40, offsetY: 20 };

describe('ShapeTextEditor', () => {
  it('positions and styles a rectangle editor in screen space', () => {
    const shape: RectShape = {
      id: 'rect',
      type: 'rect',
      x: 10,
      y: 15,
      width: 100,
      height: 50,
      text: 'Hello',
      fontSize: 18,
      textColor: '#123456',
    };

    render(
      <ShapeTextEditor
        shape={shape}
        viewport={viewport}
        onCommit={() => undefined}
        onClose={() => undefined}
      />
    );

    const editor = screen.getByRole('textbox', {
      name: 'Shape text',
    }) as HTMLTextAreaElement;
    const overlay = screen.getByTestId('shape-text-editor-overlay');
    expect(editor).toHaveValue('Hello');
    expect(editor).toHaveFocus();
    expect(editor.selectionStart).toBe(0);
    expect(editor.selectionEnd).toBe('Hello'.length);
    expect(overlay).toHaveStyle({
      left: '60px',
      top: '50px',
      width: '200px',
      height: '100px',
    });
    expect(editor).toHaveStyle({
      fontSize: '36px',
      color: '#123456',
    });
  });

  it('uses circle diameter bounds and default text styles', () => {
    const shape: CircleShape = {
      id: 'circle',
      type: 'circle',
      x: 50,
      y: 40,
      radiusX: 20,
      radiusY: 10,
    };

    render(
      <ShapeTextEditor
        shape={shape}
        viewport={viewport}
        onCommit={() => undefined}
        onClose={() => undefined}
      />
    );

    expect(screen.getByTestId('shape-text-editor-overlay')).toHaveStyle({
      left: '100px',
      top: '80px',
      width: '80px',
      height: '40px',
    });
    expect(screen.getByRole('textbox', { name: 'Shape text' })).toHaveStyle({
      fontSize: '32px',
      color: '#000000',
    });
  });

  it('commits the current value on blur and closes', () => {
    const onCommit = vi.fn();
    const onClose = vi.fn();
    const shape: RectShape = {
      id: 'rect',
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      text: 'Before',
    };

    render(
      <ShapeTextEditor
        shape={shape}
        viewport={viewport}
        onCommit={onCommit}
        onClose={onClose}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Shape text' });
    fireEvent.change(editor, { target: { value: 'After' } });
    fireEvent.blur(editor);

    expect(onCommit).toHaveBeenCalledWith('After');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes without committing on Escape', () => {
    const onCommit = vi.fn();
    const onClose = vi.fn();
    const shape: RectShape = {
      id: 'rect',
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      text: 'Before',
    };

    render(
      <ShapeTextEditor
        shape={shape}
        viewport={viewport}
        onCommit={onCommit}
        onClose={onClose}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Shape text' });
    fireEvent.keyDown(editor, { key: 'Escape' });

    expect(onCommit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
