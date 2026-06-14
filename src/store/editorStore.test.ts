import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      shapes: {},
      tool: 'select',
      selectedId: null,
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      undoStack: [],
      redoStack: [],
    });
  });

  it('adds a shape', () => {
    const shape = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
    useEditorStore.getState().addShape(shape);
    expect(useEditorStore.getState().shapes['r1']).toEqual(shape);
  });

  it('undos and redos add shape', () => {
    const shape = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
    const { addShape, undo, redo } = useEditorStore.getState();
    addShape(shape);
    expect(useEditorStore.getState().shapes['r1']).toBeDefined();
    undo();
    expect(useEditorStore.getState().shapes['r1']).toBeUndefined();
    redo();
    expect(useEditorStore.getState().shapes['r1']).toBeDefined();
  });
});
