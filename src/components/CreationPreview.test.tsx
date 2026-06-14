import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CreationPreview } from './CreationPreview';

vi.mock('react-konva', () => ({
  Rect: (props: Record<string, unknown>) => (
    <div data-testid="preview-rect" data-props={JSON.stringify(props)} />
  ),
  Ellipse: (props: Record<string, unknown>) => (
    <div data-testid="preview-ellipse" data-props={JSON.stringify(props)} />
  ),
  Line: (props: Record<string, unknown>) => (
    <div data-testid="preview-line" data-props={JSON.stringify(props)} />
  ),
  Text: (props: Record<string, unknown>) => (
    <div data-testid="preview-text" data-props={JSON.stringify(props)} />
  ),
  Circle: (props: Record<string, unknown>) => (
    <div data-testid="preview-endpoint" data-props={JSON.stringify(props)} />
  ),
}));

describe('CreationPreview', () => {
  it('renders a dashed translucent rectangle without listening', () => {
    render(
      <CreationPreview
        shape={{
          id: 'preview',
          type: 'rect',
          x: 10,
          y: 20,
          width: 80,
          height: 50,
        }}
      />
    );

    const props = JSON.parse(
      screen.getByTestId('preview-rect').getAttribute('data-props')!
    );
    expect(props).toMatchObject({
      x: 10,
      y: 20,
      width: 80,
      height: 50,
      stroke: '#2563eb',
      fill: 'rgba(37, 99, 235, 0.15)',
      listening: false,
    });
    expect(props.dash).toEqual([8, 6]);
  });

  it('renders ellipse radii and line endpoints', () => {
    const { rerender } = render(
      <CreationPreview
        shape={{
          id: 'preview',
          type: 'circle',
          x: 50,
          y: 40,
          radiusX: 30,
          radiusY: 10,
        }}
      />
    );
    expect(screen.getByTestId('preview-ellipse')).toBeInTheDocument();

    rerender(
      <CreationPreview
        shape={{
          id: 'preview',
          type: 'line',
          x: 0,
          y: 0,
          points: [10, 20, 80, 90],
        }}
      />
    );
    expect(screen.getByTestId('preview-line')).toBeInTheDocument();
    expect(screen.getAllByTestId('preview-endpoint')).toHaveLength(2);
  });

  it('renders a pending connector path', () => {
    render(
      <CreationPreview
        connectorPoints={[10, 20, 80, 90]}
      />
    );

    const props = JSON.parse(
      screen.getByTestId('preview-line').getAttribute('data-props')!
    );
    expect(props).toMatchObject({
      points: [10, 20, 80, 90],
      stroke: '#2563eb',
      listening: false,
    });
  });
});
