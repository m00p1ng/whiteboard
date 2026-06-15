import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowchartHotkeys } from './useFlowchartHotkeys';
import { useFlowchartStore } from '@/store/flowchartStore';

function pressKey(key: string, meta = false, shift = false) {
  const event = new KeyboardEvent('keydown', {
    key,
    metaKey: meta,
    shiftKey: shift,
    bubbles: true,
  });
  document.dispatchEvent(event);
}

describe('useFlowchartHotkeys', () => {
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

  it('switches tool to process on P', () => {
    renderHook(() => useFlowchartHotkeys());
    pressKey('p');
    expect(useFlowchartStore.getState().tool).toBe('process');
  });

  it('deletes selected node on Delete', () => {
    useFlowchartStore.setState({
      nodes: {
        n1: {
          id: 'n1',
          type: 'process',
          x: 0,
          y: 0,
          width: 100,
          height: 60,
          style: {},
        },
      },
      selection: { type: 'node', id: 'n1' },
    });
    renderHook(() => useFlowchartHotkeys());
    pressKey('Delete');
    expect(useFlowchartStore.getState().nodes['n1']).toBeUndefined();
  });

  it('undoes on Cmd+Z', () => {
    const node = {
      id: 'n1',
      type: 'process',
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      style: {},
    };
    useFlowchartStore.getState().addNode(node);
    renderHook(() => useFlowchartHotkeys());
    pressKey('z', true);
    expect(useFlowchartStore.getState().nodes['n1']).toBeUndefined();
  });
});
