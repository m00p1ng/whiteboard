import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFlowchartHotkeys } from './useFlowchartHotkeys';
import { useFlowchartStore } from '@/store/flowchartStore';
import type { FlowchartNode } from '@/types/flowchart';

function pressKey(key: string, meta = false, shift = false) {
  const event = new KeyboardEvent('keydown', {
    key,
    metaKey: meta,
    shiftKey: shift,
    bubbles: true,
  });
  document.dispatchEvent(event);
}

function seedSelectedEdge() {
  useFlowchartStore.setState({
    nodes: {
      a: {
        id: 'a',
        type: 'process',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
        style: {},
      },
      b: {
        id: 'b',
        type: 'process',
        x: 200,
        y: 0,
        width: 100,
        height: 60,
        style: {},
      },
    },
    edges: {
      e1: {
        id: 'e1',
        fromNodeId: 'a',
        fromPort: 'right',
        toNodeId: 'b',
        toPort: 'left',
        style: {},
      },
    },
    selection: { type: 'edge', id: 'e1' },
    undoStack: [],
    redoStack: [],
  });
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
    const node: FlowchartNode = {
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

  it.each(['Delete', 'Backspace'])(
    'removes a selected edge with %s',
    (key) => {
      seedSelectedEdge();
      renderHook(() => useFlowchartHotkeys());

      pressKey(key);

      expect(useFlowchartStore.getState().edges.e1).toBeUndefined();
      expect(useFlowchartStore.getState().selection).toBeNull();
    }
  );

  it('does not delete an edge while an input has focus', () => {
    seedSelectedEdge();
    renderHook(() => useFlowchartHotkeys());
    const input = document.createElement('input');
    document.body.append(input);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
    );

    expect(useFlowchartStore.getState().edges.e1).toBeDefined();
    input.remove();
  });

  it('does not delete an edge from a contenteditable element', () => {
    seedSelectedEdge();
    renderHook(() => useFlowchartHotkeys());
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    document.body.append(editor);

    act(() => {
      editor.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true })
      );
    });

    expect(useFlowchartStore.getState().edges.e1).toBeDefined();
    editor.remove();
  });
});
