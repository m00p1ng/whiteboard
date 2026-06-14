import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Canvas } from './Canvas';
import { useEditorStore } from '@/store/editorStore';
import type { RectShape } from '@/types/shape';

const konvaMock = vi.hoisted(() => ({
  pointer: { x: 120, y: 80 },
  shapeSelect: null as null | ((id: string) => void),
}));

vi.mock('react-konva', () => ({
  Stage: ({
    children,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  }: PropsWithChildren<{
    onPointerDown: (event: { target: unknown; evt: PointerEvent }) => void;
    onPointerMove: (event: { target: unknown; evt: PointerEvent }) => void;
    onPointerUp: (event: { target: unknown; evt: PointerEvent }) => void;
    onPointerCancel: (event: { target: unknown; evt: PointerEvent }) => void;
  }>) => {
    const container = {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      hasPointerCapture: () => true,
    };
    const stage = {
      getStage: () => stage,
      getPointerPosition: () => konvaMock.pointer,
      container: () => container,
    };
    const event = () => ({
      target: stage,
      evt: { pointerId: 1 } as PointerEvent,
    });

    return (
      <div>
        <button
          type="button"
          aria-label="pointer down"
          onClick={() => onPointerDown(event())}
        />
        <button
          type="button"
          aria-label="pointer move"
          onClick={() => onPointerMove(event())}
        />
        <button
          type="button"
          aria-label="pointer up"
          onClick={() => onPointerUp(event())}
        />
        <button
          type="button"
          aria-label="pointer cancel"
          onClick={() => onPointerCancel(event())}
        />
        {children}
      </div>
    );
  },
  Layer: ({ children }: PropsWithChildren) => <>{children}</>,
  Transformer: () => <div data-testid="selection-transformer" />,
}));

vi.mock('./ShapeRenderer', () => ({
  ShapeRenderer: ({
    shape,
    onSelect,
  }: {
    shape: { id: string };
    onSelect: () => void;
  }) => (
    <button
      type="button"
      data-testid={`shape-${shape.id}`}
      onClick={onSelect}
    />
  ),
}));

vi.mock('./TextEditor', () => ({
  TextEditor: () => null,
}));

vi.mock('./CreationPreview', () => ({
  CreationPreview: ({
    shape,
    connectorPoints,
  }: {
    shape?: { type: string; [key: string]: unknown } | null;
    connectorPoints?: number[] | null;
  }) => (
    <div
      data-testid="creation-preview"
      data-shape={shape ? JSON.stringify(shape) : ''}
      data-connector={connectorPoints ? JSON.stringify(connectorPoints) : ''}
    />
  ),
}));

const existingShape: RectShape = {
  id: 'existing',
  type: 'rect',
  x: 10,
  y: 20,
  width: 100,
  height: 60,
  fill: '#fff',
};

beforeEach(() => {
  useEditorStore.getState().reset();
  useEditorStore.setState({
    shapes: { [existingShape.id]: existingShape },
    selectedId: existingShape.id,
  });
  konvaMock.pointer = { x: 120, y: 80 };
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(
    '00000000-0000-4000-8000-000000000001'
  );
});

function gesture(
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  konvaMock.pointer = start;
  fireEvent.click(screen.getByRole('button', { name: 'pointer down' }));
  konvaMock.pointer = end;
  fireEvent.click(screen.getByRole('button', { name: 'pointer move' }));
}

describe('Canvas shape creation', () => {
  it.each([
    [
      'rect',
      { x: 20, y: 30 },
      { x: 120, y: 90 },
      { type: 'rect', x: 20, y: 30, width: 100, height: 60 },
    ],
    [
      'circle',
      { x: 20, y: 30 },
      { x: 120, y: 70 },
      { type: 'circle', x: 70, y: 50, radiusX: 50, radiusY: 20 },
    ],
    [
      'line',
      { x: 20, y: 30 },
      { x: 120, y: 70 },
      { type: 'line', points: [20, 30, 120, 70] },
    ],
  ] as const)(
    'previews and commits a dragged %s once',
    (tool, start, end, expected) => {
      useEditorStore.getState().setTool(tool);
      render(<Canvas />);

      gesture(start, end);

      const preview = JSON.parse(
        screen.getByTestId('creation-preview').getAttribute('data-shape')!
      );
      expect(preview).toMatchObject(expected);
      expect(useEditorStore.getState().shapes).toEqual({
        existing: existingShape,
      });
      expect(useEditorStore.getState().selectedId).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'pointer up' }));

      const state = useEditorStore.getState();
      expect(state.shapes['00000000-0000-4000-8000-000000000001'])
        .toMatchObject(expected);
      expect(state.undoStack).toHaveLength(1);
      expect(state.selectedId).toBe('00000000-0000-4000-8000-000000000001');
      expect(state.tool).toBe('select');
    }
  );

  it('places text at the drag start without sizing it', () => {
    useEditorStore.getState().setTool('text');
    render(<Canvas />);

    gesture({ x: 20, y: 30 }, { x: 120, y: 90 });
    fireEvent.click(screen.getByRole('button', { name: 'pointer up' }));

    expect(
      useEditorStore.getState().shapes[
        '00000000-0000-4000-8000-000000000001'
      ]
    ).toMatchObject({
      type: 'text',
      x: 20,
      y: 30,
      text: 'Text',
      fontSize: 18,
    });
  });

  it.each([
    ['rect', { width: 100, height: 60 }],
    ['circle', { radiusX: 40, radiusY: 40 }],
    ['line', { points: [20, 30, 100, 30] }],
    ['text', { text: 'Text', fontSize: 18 }],
  ] as const)('creates the default %s for a click gesture', (tool, expected) => {
    useEditorStore.getState().setTool(tool);
    render(<Canvas />);

    gesture({ x: 20, y: 30 }, { x: 23, y: 34 });
    fireEvent.click(screen.getByRole('button', { name: 'pointer up' }));

    expect(
      useEditorStore.getState().shapes[
        '00000000-0000-4000-8000-000000000001'
      ]
    ).toMatchObject(expected);
  });

  it('converts preview and committed coordinates through the viewport', () => {
    useEditorStore.setState({
      tool: 'rect',
      viewport: { scale: 2, offsetX: 40, offsetY: 20 },
    });
    render(<Canvas />);

    gesture({ x: 60, y: 40 }, { x: 260, y: 160 });
    fireEvent.click(screen.getByRole('button', { name: 'pointer up' }));

    expect(
      useEditorStore.getState().shapes[
        '00000000-0000-4000-8000-000000000001'
      ]
    ).toMatchObject({
      x: 10,
      y: 10,
      width: 100,
      height: 60,
    });
  });

  it('cancels a draft with Escape and keeps the tool active', () => {
    useEditorStore.getState().setTool('rect');
    render(<Canvas />);

    gesture({ x: 20, y: 30 }, { x: 120, y: 90 });
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(
      screen.getByTestId('creation-preview').getAttribute('data-shape')
    ).toBe('');
    expect(useEditorStore.getState().tool).toBe('rect');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['existing']);
  });

  it('cancels a draft on pointer cancellation', () => {
    useEditorStore.getState().setTool('line');
    render(<Canvas />);

    gesture({ x: 20, y: 30 }, { x: 120, y: 90 });
    fireEvent.click(screen.getByRole('button', { name: 'pointer cancel' }));

    expect(
      screen.getByTestId('creation-preview').getAttribute('data-shape')
    ).toBe('');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['existing']);
  });

  it('clears a draft when the active tool changes', () => {
    useEditorStore.getState().setTool('rect');
    render(<Canvas />);
    gesture({ x: 20, y: 30 }, { x: 120, y: 90 });

    act(() => {
      useEditorStore.getState().setTool('line');
    });

    expect(
      screen.getByTestId('creation-preview').getAttribute('data-shape')
    ).toBe('');
  });
});

describe('Canvas connector creation', () => {
  it('previews a connector from the source center to the pointer', () => {
    useEditorStore.getState().setTool('connector');
    render(<Canvas />);

    fireEvent.click(screen.getByTestId('shape-existing'));
    konvaMock.pointer = { x: 200, y: 150 };
    fireEvent.click(screen.getByRole('button', { name: 'pointer move' }));

    expect(
      JSON.parse(
        screen.getByTestId('creation-preview').getAttribute('data-connector')!
      )
    ).toEqual([60, 50, 200, 150]);
    expect(useEditorStore.getState().tool).toBe('connector');
  });

  it('commits a connector only to a different existing shape', () => {
    useEditorStore.setState({
      shapes: {
        existing: existingShape,
        target: {
          id: 'target',
          type: 'circle',
          x: 200,
          y: 150,
          radiusX: 30,
          radiusY: 20,
        },
      },
    });
    useEditorStore.getState().setTool('connector');
    render(<Canvas />);

    fireEvent.click(screen.getByTestId('shape-existing'));
    fireEvent.click(screen.getByTestId('shape-existing'));
    expect(Object.keys(useEditorStore.getState().shapes)).toHaveLength(2);

    fireEvent.click(screen.getByTestId('shape-target'));
    expect(
      useEditorStore.getState().shapes[
        '00000000-0000-4000-8000-000000000001'
      ]
    ).toMatchObject({
      type: 'connector',
      fromId: 'existing',
      toId: 'target',
    });
  });

  it('keeps a connector pending after an empty-stage click', () => {
    useEditorStore.getState().setTool('connector');
    render(<Canvas />);

    fireEvent.click(screen.getByTestId('shape-existing'));
    konvaMock.pointer = { x: 200, y: 150 };
    fireEvent.click(screen.getByRole('button', { name: 'pointer down' }));
    fireEvent.click(screen.getByRole('button', { name: 'pointer move' }));

    expect(
      screen.getByTestId('creation-preview').getAttribute('data-connector')
    ).not.toBe('');
  });

  it('cancels a pending connector with Escape and preserves the tool', () => {
    useEditorStore.getState().setTool('connector');
    render(<Canvas />);

    fireEvent.click(screen.getByTestId('shape-existing'));
    konvaMock.pointer = { x: 200, y: 150 };
    fireEvent.click(screen.getByRole('button', { name: 'pointer move' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(
      screen.getByTestId('creation-preview').getAttribute('data-connector')
    ).toBe('');
    expect(useEditorStore.getState().tool).toBe('connector');
    expect(useEditorStore.getState().selectedId).toBeNull();
  });
});
