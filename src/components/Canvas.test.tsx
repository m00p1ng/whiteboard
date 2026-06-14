import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Canvas } from './Canvas';
import { useEditorStore } from '@/store/editorStore';
import type { RectShape } from '@/types/shape';

const konvaMock = vi.hoisted(() => ({
  pointer: { x: 120, y: 80 },
}));

vi.mock('react-konva', () => ({
  Stage: ({
    children,
    onClick,
  }: PropsWithChildren<{
    onClick: (event: { target: unknown }) => void;
  }>) => (
    <button
      type="button"
      aria-label="board canvas"
      onClick={() => {
        const stage = {
          getStage: () => stage,
          getPointerPosition: () => konvaMock.pointer,
        };
        onClick({ target: stage });
      }}
    >
      {children}
    </button>
  ),
  Layer: ({ children }: PropsWithChildren) => <>{children}</>,
  Transformer: () => <div data-testid="selection-transformer" />,
}));

vi.mock('./ShapeRenderer', () => ({
  ShapeRenderer: ({ shape }: { shape: { id: string } }) => (
    <div data-testid={`shape-${shape.id}`} />
  ),
}));

vi.mock('./TextEditor', () => ({
  TextEditor: () => null,
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

describe('Canvas shape creation selection', () => {
  it.each([
    ['rect', 'rect'],
    ['circle', 'circle'],
    ['text', 'text'],
  ] as const)(
    'deselects before creating a %s, then selects it and returns to Select',
    (tool, expectedType) => {
      useEditorStore.getState().setTool(tool);
      render(<Canvas />);

      fireEvent.click(screen.getByRole('button', { name: 'board canvas' }));

      expect(useEditorStore.getState().selectedId).toBeNull();
      expect(useEditorStore.getState().tool).toBe(tool);
      expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['existing']);

      fireEvent.click(screen.getByRole('button', { name: 'board canvas' }));

      const state = useEditorStore.getState();
      expect(state.shapes['00000000-0000-4000-8000-000000000001']).toMatchObject({
        type: expectedType,
        x: 120,
        y: 80,
      });
      expect(state.selectedId).toBe('00000000-0000-4000-8000-000000000001');
      expect(state.tool).toBe('select');
      expect(screen.getByTestId('selection-transformer')).toBeInTheDocument();
    }
  );

  it('leaves connector selection behavior unchanged on an empty-board click', () => {
    useEditorStore.getState().setTool('connector');
    render(<Canvas />);

    fireEvent.click(screen.getByRole('button', { name: 'board canvas' }));

    expect(useEditorStore.getState().selectedId).toBe('existing');
    expect(useEditorStore.getState().tool).toBe('connector');
    expect(Object.keys(useEditorStore.getState().shapes)).toEqual(['existing']);
  });
});
