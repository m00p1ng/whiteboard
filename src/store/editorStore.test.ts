import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  it('notifies subscribers when a shape is added', () => {
    const shape = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
    const callback = vi.fn();
    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (state.shapes !== prev.shapes) callback();
    });
    useEditorStore.getState().addShape(shape);
    unsubscribe();
    expect(callback).toHaveBeenCalled();
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

  it('sets a live draft update without touching undo/redo stacks', () => {
    const shape = {
      id: 'r1',
      type: 'rect' as const,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: '#ffffff',
    };
    useEditorStore.getState().addShape(shape);
    const stackLengthBefore = useEditorStore.getState().undoStack.length;

    useEditorStore.getState().setShapeDraft('r1', { fill: '#ff0000' });

    expect(useEditorStore.getState().shapes['r1'].fill).toBe('#ff0000');
    expect(useEditorStore.getState().undoStack).toHaveLength(stackLengthBefore);
    expect(useEditorStore.getState().redoStack).toHaveLength(0);
  });

  it('records a single undo entry for a field change', () => {
    const shape = {
      id: 'r1',
      type: 'rect' as const,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: '#ffffff',
    };
    useEditorStore.getState().addShape(shape);
    useEditorStore.getState().setShapeDraft('r1', { fill: '#ff0000' });

    useEditorStore.getState().recordFieldChange('r1', 'fill', '#ffffff', '#ff0000');

    expect(useEditorStore.getState().shapes['r1'].fill).toBe('#ff0000');
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().shapes['r1'].fill).toBe('#ffffff');
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().shapes['r1'].fill).toBe('#ff0000');
  });

  it('does not record a change when prev and next values are equal', () => {
    const shape = {
      id: 'r1',
      type: 'rect' as const,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: '#ffffff',
    };
    useEditorStore.getState().addShape(shape);
    const stackLengthBefore = useEditorStore.getState().undoStack.length;

    useEditorStore.getState().recordFieldChange('r1', 'fill', '#ffffff', '#ffffff');

    expect(useEditorStore.getState().undoStack).toHaveLength(stackLengthBefore);
  });
});

describe('editorStore z-order actions', () => {
  const shapeA = { id: 'a', type: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
  const shapeB = { id: 'b', type: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
  const shapeC = { id: 'c', type: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };

  beforeEach(() => {
    useEditorStore.setState({
      shapes: {},
      tool: 'select',
      selectedId: null,
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      undoStack: [],
      redoStack: [],
    });
    useEditorStore.getState().addShape(shapeA);
    useEditorStore.getState().addShape(shapeB);
    useEditorStore.getState().addShape(shapeC);
  });

  it('brings a shape to front', () => {
    useEditorStore.getState().bringToFront('a');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['b', 'c', 'a']);
  });

  it('sends a shape to back', () => {
    useEditorStore.getState().sendToBack('c');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['c', 'a', 'b']);
  });

  it('brings a shape forward one step', () => {
    useEditorStore.getState().bringForward('a');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['b', 'a', 'c']);
  });

  it('sends a shape backward one step', () => {
    useEditorStore.getState().sendBackward('c');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['a', 'c', 'b']);
  });

  it('does nothing when bringing the front shape forward', () => {
    useEditorStore.getState().bringForward('c');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['a', 'b', 'c']);
    expect(useEditorStore.getState().undoStack).toHaveLength(3);
  });

  it('does nothing when sending the back shape backward', () => {
    useEditorStore.getState().sendBackward('a');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['a', 'b', 'c']);
    expect(useEditorStore.getState().undoStack).toHaveLength(3);
  });

  it('undoes a reorder', () => {
    useEditorStore.getState().bringToFront('a');
    useEditorStore.getState().undo();
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['a', 'b', 'c']);
  });
});
