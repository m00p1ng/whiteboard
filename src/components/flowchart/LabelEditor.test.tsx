import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LabelEditor } from './LabelEditor';
import type { FlowchartNode } from '@/types/flowchart';

describe('LabelEditor', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 0,
    y: 0,
    width: 140,
    height: 80,
    label: 'Old',
    style: {},
  };

  it('commits edited label on blur', () => {
    const onCommit = vi.fn();
    render(
      <LabelEditor
        node={node}
        viewport={{ scale: 1, offsetX: 0, offsetY: 0 }}
        onCommit={onCommit}
        onCancel={() => {}}
      />
    );
    const input = screen.getByDisplayValue('Old');
    fireEvent.change(input, { target: { value: 'New' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith('New');
  });

  it('cancels on Escape', () => {
    const onCancel = vi.fn();
    render(
      <LabelEditor
        node={node}
        viewport={{ scale: 1, offsetX: 0, offsetY: 0 }}
        onCommit={() => {}}
        onCancel={onCancel}
      />
    );
    const input = screen.getByDisplayValue('Old');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});
