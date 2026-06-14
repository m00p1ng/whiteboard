import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CircleShape, RectShape } from '@/types/shape';
import { ShapeRenderer } from './ShapeRenderer';

vi.mock('react-konva', () => ({
  Rect: ({
    width,
    height,
  }: {
    width: number;
    height: number;
  }) => (
    <div
      data-testid="rect-node"
      data-width={width}
      data-height={height}
    />
  ),
  Circle: () => null,
  Line: () => null,
  Text: ({
    text,
    x,
    y,
    width,
    height,
    fill,
    fontSize,
    rotation,
    listening,
    align,
    verticalAlign,
    wrap,
  }: {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    fontSize: number;
    rotation: number;
    listening: boolean;
    align: string;
    verticalAlign: string;
    wrap: string;
  }) => (
    <div
      data-testid="shape-text"
      data-text={text}
      data-x={x}
      data-y={y}
      data-width={width}
      data-height={height}
      data-fill={fill}
      data-font-size={fontSize}
      data-rotation={rotation}
      data-listening={String(listening)}
      data-align={align}
      data-vertical-align={verticalAlign}
      data-wrap={wrap}
    />
  ),
  Ellipse: ({
    radiusX,
    radiusY,
    onTransformEnd,
    onContextMenu,
  }: {
    radiusX: number;
    radiusY: number;
    onTransformEnd: (event: { target: unknown }) => void;
    onContextMenu?: (event: { evt: Event }) => void;
  }) => (
    <button
      type="button"
      aria-label="ellipse"
      data-radius-x={radiusX}
      data-radius-y={radiusY}
      onContextMenu={(e) => onContextMenu?.({ evt: e.nativeEvent })}
      onClick={() => {
        let scaleX = 2;
        let scaleY = 3;
        const scaleXAccessor = vi.fn((value?: number) => {
          if (value !== undefined) scaleX = value;
          return scaleX;
        });
        const scaleYAccessor = vi.fn((value?: number) => {
          if (value !== undefined) scaleY = value;
          return scaleY;
        });
        onTransformEnd({
          target: {
            x: () => 30,
            y: () => 40,
            rotation: () => 15,
            scaleX: scaleXAccessor,
            scaleY: scaleYAccessor,
          },
        });
      }}
    />
  ),
}));

vi.mock('./Connector', () => ({
  Connector: () => null,
}));

const ellipse: CircleShape = {
  id: 'ellipse',
  type: 'circle',
  x: 10,
  y: 20,
  radiusX: 25,
  radiusY: 10,
};

describe('ShapeRenderer ellipse', () => {
  it('renders independent ellipse radii', () => {
    render(
      <ShapeRenderer
        shape={ellipse}
        isSelected={false}
        onSelect={() => undefined}
      />
    );

    expect(screen.getByRole('button', { name: 'ellipse' })).toHaveAttribute(
      'data-radius-x',
      '25'
    );
    expect(screen.getByRole('button', { name: 'ellipse' })).toHaveAttribute(
      'data-radius-y',
      '10'
    );
  });

  it('stores each scaled radius after a transform', () => {
    const onChange = vi.fn();
    render(
      <ShapeRenderer
        shape={ellipse}
        isSelected
        onSelect={() => undefined}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'ellipse' }));

    expect(onChange).toHaveBeenCalledWith({
      x: 30,
      y: 40,
      rotation: 15,
      radiusX: 50,
      radiusY: 30,
    });
  });

  it('forwards onContextMenu to the underlying shape', () => {
    const onContextMenu = vi.fn();
    render(
      <ShapeRenderer
        shape={ellipse}
        isSelected={false}
        onSelect={() => undefined}
        onContextMenu={onContextMenu}
      />
    );

    fireEvent.contextMenu(screen.getByRole('button', { name: 'ellipse' }));

    expect(onContextMenu).toHaveBeenCalled();
  });
});

describe('ShapeRenderer in-shape text', () => {
  it('renders rectangle text with explicit style and rectangle bounds', () => {
    const rect: RectShape = {
      id: 'rect',
      type: 'rect',
      x: 10,
      y: 20,
      width: 120,
      height: 70,
      rotation: 12,
      text: 'Decision',
      fontSize: 22,
      textColor: '#123456',
    };

    render(
      <ShapeRenderer
        shape={rect}
        isSelected={false}
        onSelect={() => undefined}
      />
    );

    const textNode = screen.getByTestId('shape-text');
    expect(textNode).toHaveAttribute('data-text', 'Decision');
    expect(textNode).toHaveAttribute('data-x', '10');
    expect(textNode).toHaveAttribute('data-y', '20');
    expect(textNode).toHaveAttribute('data-width', '120');
    expect(textNode).toHaveAttribute('data-height', '70');
    expect(textNode).toHaveAttribute('data-fill', '#123456');
    expect(textNode).toHaveAttribute('data-font-size', '22');
    expect(textNode).toHaveAttribute('data-rotation', '12');
    expect(textNode).toHaveAttribute('data-listening', 'false');
    expect(textNode).toHaveAttribute('data-align', 'center');
    expect(textNode).toHaveAttribute('data-vertical-align', 'middle');
    expect(textNode).toHaveAttribute('data-wrap', 'word');
  });

  it('renders circle text with default style and diameter bounds', () => {
    render(
      <ShapeRenderer
        shape={{ ...ellipse, text: 'Start' }}
        isSelected={false}
        onSelect={() => undefined}
      />
    );

    const textNode = screen.getByTestId('shape-text');
    expect(textNode).toHaveAttribute('data-x', '-15');
    expect(textNode).toHaveAttribute('data-y', '10');
    expect(textNode).toHaveAttribute('data-width', '50');
    expect(textNode).toHaveAttribute('data-height', '20');
    expect(textNode).toHaveAttribute('data-fill', '#000000');
    expect(textNode).toHaveAttribute('data-font-size', '16');
  });

  it.each([
    ['absent', undefined],
    ['empty', ''],
  ])('does not render %s rectangle text', (_label, text) => {
    const rect: RectShape = {
      id: 'rect',
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      text,
    };

    render(
      <ShapeRenderer
        shape={rect}
        isSelected={false}
        onSelect={() => undefined}
      />
    );

    expect(screen.queryByTestId('shape-text')).not.toBeInTheDocument();
  });
});
