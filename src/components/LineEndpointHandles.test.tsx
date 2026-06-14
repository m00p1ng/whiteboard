import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LineEndpointHandles } from './LineEndpointHandles';
import type { LineShape } from '@/types/shape';
import type { Point } from '@/utils/geometry';

const circleMock = vi.hoisted(() => ({
  props: [] as Record<string, unknown>[],
}));

vi.mock('react-konva', () => ({
  Circle: (props: Record<string, unknown>) => {
    circleMock.props.push(props);
    return null;
  },
}));

const line: LineShape = {
  id: 'line-1',
  type: 'line',
  x: 10,
  y: 20,
  points: [0, 0, 100, 0],
};

function createTarget(initial: Point, stage?: unknown) {
  let pos = initial;
  const position = (next?: Point) => {
    if (next) {
      pos = next;
      return undefined;
    }
    return pos;
  };
  return { position, getStage: () => stage };
}

type DragHandler = (e: { target: ReturnType<typeof createTarget> }) => void;

describe('LineEndpointHandles', () => {
  afterEach(() => {
    circleMock.props.length = 0;
  });

  it('renders a handle at each endpoint, sized by viewport scale', () => {
    render(
      <LineEndpointHandles
        shape={line}
        viewport={{ scale: 2, offsetX: 0, offsetY: 0 }}
        onChange={vi.fn()}
      />
    );

    expect(circleMock.props).toHaveLength(2);
    expect(circleMock.props[0]).toMatchObject({ x: 10, y: 20, radius: 2.5, fill: '#3b82f6' });
    expect(circleMock.props[1]).toMatchObject({ x: 110, y: 20, radius: 2.5, fill: '#3b82f6' });
  });

  it('commits new points on drag end when the result is valid', () => {
    const onChange = vi.fn();
    render(
      <LineEndpointHandles
        shape={line}
        viewport={{ scale: 1, offsetX: 0, offsetY: 0 }}
        onChange={onChange}
      />
    );

    const target = createTarget({ x: 50, y: 60 });
    (circleMock.props[0].onDragEnd as DragHandler)({ target });

    // local = (50-10, 60-20) = (40, 40); other endpoint = (100, 0)
    expect(onChange).toHaveBeenCalledWith({ points: [40, 40, 100, 0] });
  });

  it('reverts the handle position on drag end when below the minimum length', () => {
    const onChange = vi.fn();
    render(
      <LineEndpointHandles
        shape={line}
        viewport={{ scale: 1, offsetX: 0, offsetY: 0 }}
        onChange={onChange}
      />
    );

    // newWorldPos = (105, 20) -> local (95, 0), other (100, 0) -> distance 5 < 10
    const target = createTarget({ x: 105, y: 20 });
    (circleMock.props[0].onDragEnd as DragHandler)({ target });

    expect(onChange).not.toHaveBeenCalled();
    expect(target.position()).toEqual({ x: 10, y: 20 });
  });

  it('live-updates the line node on drag move when the result is valid', () => {
    const lineNode = { points: vi.fn(), getLayer: () => ({ batchDraw: vi.fn() }) };
    const stage = { findOne: vi.fn(() => lineNode) };

    render(
      <LineEndpointHandles
        shape={line}
        viewport={{ scale: 1, offsetX: 0, offsetY: 0 }}
        onChange={vi.fn()}
      />
    );

    // newWorldPos = (200, 30) -> local (190, 10)
    const target = createTarget({ x: 200, y: 30 }, stage);
    (circleMock.props[1].onDragMove as DragHandler)({ target });

    expect(stage.findOne).toHaveBeenCalledWith('#line-1');
    expect(lineNode.points).toHaveBeenCalledWith([0, 0, 190, 10]);
  });
});
