import type { PropsWithChildren } from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeHandles } from './EdgeHandles';

const konva = vi.hoisted(() => ({
  circles: [] as Record<string, unknown>[],
  lines: [] as Record<string, unknown>[],
}));

vi.mock('react-konva', () => ({
  Group: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Circle: (props: Record<string, unknown>) => {
    konva.circles.push(props);
    return <div data-testid={props['data-testid'] as string} />;
  },
  Line: (props: Record<string, unknown>) => {
    konva.lines.push(props);
    return <div data-testid={props['data-testid'] as string} />;
  },
}));

function target(x: number, y: number) {
  return {
    x: () => x,
    y: () => y,
    position: vi.fn(),
  };
}

describe('EdgeHandles', () => {
  const points = [0, 0, 8, 0, 8, 40, 100, 40, 100, 80, 108, 80];
  const waypoints = [
    { x: 8, y: 40 },
    { x: 100, y: 40 },
  ];

  beforeEach(() => {
    konva.circles = [];
    konva.lines = [];
  });

  it('renders endpoint, waypoint, and interior segment handles', () => {
    render(
      <EdgeHandles
        points={points}
        waypoints={waypoints}
        onWaypointPreview={() => {}}
        onWaypointCommit={() => {}}
        onSegmentPreview={() => {}}
        onSegmentCommit={() => {}}
        onEndpointPreview={() => {}}
        onEndpointCommit={() => {}}
      />
    );

    expect(screen.getByTestId('edge-endpoint-source')).toBeInTheDocument();
    expect(screen.getByTestId('edge-endpoint-target')).toBeInTheDocument();
    expect(screen.getByTestId('edge-bend-0')).toBeInTheDocument();
    expect(screen.getByTestId('edge-bend-1')).toBeInTheDocument();
    expect(screen.queryByTestId('edge-segment-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('edge-segment-1')).toBeInTheDocument();
    expect(screen.getByTestId('edge-segment-4')).toBeInTheDocument();
    expect(screen.queryByTestId('edge-segment-5')).not.toBeInTheDocument();
  });

  it('emits waypoint preview and commit callbacks', () => {
    const onWaypointPreview = vi.fn();
    const onWaypointCommit = vi.fn();
    render(
      <EdgeHandles
        points={points}
        waypoints={waypoints}
        onWaypointPreview={onWaypointPreview}
        onWaypointCommit={onWaypointCommit}
        onSegmentPreview={() => {}}
        onSegmentCommit={() => {}}
        onEndpointPreview={() => {}}
        onEndpointCommit={() => {}}
      />
    );
    const handle = konva.circles.find(
      (props) => props['data-testid'] === 'edge-bend-0'
    )!;

    act(() => {
      (handle.onDragMove as (event: { target: ReturnType<typeof target> }) => void)({
        target: target(20, 60),
      });
      (handle.onDragEnd as (
        event: { target: ReturnType<typeof target> }
      ) => void)({ target: target(20, 60) });
    });

    expect(onWaypointPreview).toHaveBeenCalledWith(0, { x: 20, y: 60 });
    expect(onWaypointCommit).toHaveBeenCalledOnce();
  });

  it('constrains segment preview to the perpendicular axis', () => {
    const onSegmentPreview = vi.fn();
    render(
      <EdgeHandles
        points={points}
        waypoints={waypoints}
        onWaypointPreview={() => {}}
        onWaypointCommit={() => {}}
        onSegmentPreview={onSegmentPreview}
        onSegmentCommit={() => {}}
        onEndpointPreview={() => {}}
        onEndpointCommit={() => {}}
      />
    );
    const horizontal = konva.lines.find(
      (props) => props['data-testid'] === 'edge-segment-2'
    )!;
    const vertical = konva.lines.find(
      (props) => props['data-testid'] === 'edge-segment-1'
    )!;

    act(() => {
      (horizontal.onDragMove as (
        event: { target: ReturnType<typeof target> }
      ) => void)({ target: target(30, 20) });
      (vertical.onDragMove as (
        event: { target: ReturnType<typeof target> }
      ) => void)({ target: target(30, 20) });
    });

    expect(onSegmentPreview).toHaveBeenNthCalledWith(1, 2, {
      x: 0,
      y: 20,
    });
    expect(onSegmentPreview).toHaveBeenNthCalledWith(2, 1, {
      x: 30,
      y: 0,
    });
  });

  it('emits endpoint positions and cancels pointer bubbling', () => {
    const onEndpointPreview = vi.fn();
    const event = { cancelBubble: false };
    render(
      <EdgeHandles
        points={points}
        waypoints={waypoints}
        onWaypointPreview={() => {}}
        onWaypointCommit={() => {}}
        onSegmentPreview={() => {}}
        onSegmentCommit={() => {}}
        onEndpointPreview={onEndpointPreview}
        onEndpointCommit={() => {}}
      />
    );
    const endpoint = konva.circles.find(
      (props) => props['data-testid'] === 'edge-endpoint-target'
    )!;

    act(() => {
      (endpoint.onMouseDown as (event: { cancelBubble: boolean }) => void)(event);
      (endpoint.onDragMove as (
        event: { target: ReturnType<typeof target> }
      ) => void)({ target: target(300, 120) });
    });

    expect(event.cancelBubble).toBe(true);
    expect(onEndpointPreview).toHaveBeenCalledWith('target', {
      x: 300,
      y: 120,
    });
  });
});
