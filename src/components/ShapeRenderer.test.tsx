import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CircleShape } from '@/types/shape';
import { ShapeRenderer } from './ShapeRenderer';

vi.mock('react-konva', () => ({
  Rect: () => null,
  Circle: () => null,
  Line: () => null,
  Text: () => null,
  Ellipse: ({
    radiusX,
    radiusY,
    onTransformEnd,
  }: {
    radiusX: number;
    radiusY: number;
    onTransformEnd: (event: { target: unknown }) => void;
  }) => (
    <button
      type="button"
      aria-label="ellipse"
      data-radius-x={radiusX}
      data-radius-y={radiusY}
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
});
