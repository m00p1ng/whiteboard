import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ShapePropertiesPanel } from './ShapePropertiesPanel';
import { useEditorStore } from '@/store/editorStore';
import type {
  CircleShape,
  ConnectorShape,
  LineShape,
  RectShape,
  TextShape,
} from '@/types/shape';

const rect: RectShape = {
  id: 'r1',
  type: 'rect',
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  fill: '#ff0000',
  stroke: '#0000ff',
  strokeWidth: 3,
};

const circle: CircleShape = {
  id: 'c1',
  type: 'circle',
  x: 5,
  y: 6,
  radiusX: 30,
  radiusY: 40,
  fill: '#00ff00',
};

const text: TextShape = {
  id: 't1',
  type: 'text',
  x: 1,
  y: 2,
  text: 'Hello',
  fontSize: 18,
  fill: '#111111',
};

const line: LineShape = {
  id: 'l1',
  type: 'line',
  x: 0,
  y: 0,
  points: [0, 0, 100, 100],
  stroke: '#222222',
  strokeWidth: 4,
};

const connector: ConnectorShape = {
  id: 'cn1',
  type: 'connector',
  x: 0,
  y: 0,
  fromId: 'r1',
  toId: 'c1',
  stroke: '#333333',
};

beforeEach(() => {
  useEditorStore.getState().reset();
});

describe('ShapePropertiesPanel', () => {
  it('renders nothing when no shape is selected', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: null });
    render(<ShapePropertiesPanel />);
    expect(screen.queryByLabelText('Fill hex')).not.toBeInTheDocument();
  });

  it('renders rect fields with current values', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Fill hex')).toHaveValue('#ff0000');
    expect(screen.getByLabelText('Stroke hex')).toHaveValue('#0000ff');
    expect(screen.getByLabelText('Stroke width')).toHaveValue(3);
    expect(screen.getByLabelText('X')).toHaveValue(10);
    expect(screen.getByLabelText('Y')).toHaveValue(20);
    expect(screen.getByLabelText('Width')).toHaveValue(100);
    expect(screen.getByLabelText('Height')).toHaveValue(50);
  });

  it('updates the shape live while editing and commits a single undo step on blur', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    render(<ShapePropertiesPanel />);

    const widthInput = screen.getByLabelText('Width');
    fireEvent.focus(widthInput);
    fireEvent.change(widthInput, { target: { value: '150' } });

    expect(useEditorStore.getState().shapes['r1']).toMatchObject({ width: 150 });
    expect(useEditorStore.getState().undoStack).toHaveLength(0);

    fireEvent.blur(widthInput);

    expect(useEditorStore.getState().undoStack).toHaveLength(1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().shapes['r1']).toMatchObject({ width: 100 });
  });

  it('syncs the color swatch and hex inputs for Fill', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    render(<ShapePropertiesPanel />);

    const hexInput = screen.getByLabelText('Fill hex');
    fireEvent.focus(hexInput);
    fireEvent.change(hexInput, { target: { value: '#abcdef' } });

    expect(screen.getByLabelText('Fill swatch')).toHaveValue('#abcdef');
  });

  it('renders circle fields', () => {
    useEditorStore.setState({ shapes: { c1: circle }, selectedId: 'c1' });
    render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Fill hex')).toHaveValue('#00ff00');
    expect(screen.getByLabelText('Radius X')).toHaveValue(30);
    expect(screen.getByLabelText('Radius Y')).toHaveValue(40);
    expect(screen.queryByLabelText('Width')).not.toBeInTheDocument();
  });

  it('renders text fields', () => {
    useEditorStore.setState({ shapes: { t1: text }, selectedId: 't1' });
    render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Text color hex')).toHaveValue('#111111');
    expect(screen.getByLabelText('Font size')).toHaveValue(18);
    expect(screen.getByLabelText('Text')).toHaveValue('Hello');
    expect(screen.queryByLabelText('Stroke hex')).not.toBeInTheDocument();
  });

  it('renders line fields with stroke only', () => {
    useEditorStore.setState({ shapes: { l1: line }, selectedId: 'l1' });
    render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Stroke hex')).toHaveValue('#222222');
    expect(screen.getByLabelText('Stroke width')).toHaveValue(4);
    expect(screen.queryByLabelText('Fill hex')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('X')).not.toBeInTheDocument();
  });

  it('renders connector fields with stroke only', () => {
    useEditorStore.setState({ shapes: { cn1: connector }, selectedId: 'cn1' });
    render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Stroke hex')).toHaveValue('#333333');
    expect(screen.queryByLabelText('Fill hex')).not.toBeInTheDocument();
  });
});
