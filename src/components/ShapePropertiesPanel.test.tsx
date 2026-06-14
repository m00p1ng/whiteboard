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
  text: 'Decision',
  fontSize: 20,
  textColor: '#123456',
};

const circle: CircleShape = {
  id: 'c1',
  type: 'circle',
  x: 5,
  y: 6,
  radiusX: 30,
  radiusY: 40,
  fill: '#00ff00',
  text: 'Start',
  fontSize: 18,
  textColor: '#654321',
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
    expect(screen.getByLabelText('Text')).toHaveValue('Decision');
    expect(screen.getByLabelText('Font size')).toHaveValue(20);
    expect(screen.getByLabelText('Text color hex')).toHaveValue('#123456');
    expect(screen.getByLabelText('Stroke width')).toHaveValue(3);
    expect(screen.getByLabelText('X')).toHaveValue(10);
    expect(screen.getByLabelText('Y')).toHaveValue(20);
    expect(screen.getByLabelText('Width')).toHaveValue(100);
    expect(screen.getByLabelText('Height')).toHaveValue(50);
  });

  it('uses shadcn form controls without changing the floating panel', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    const { container } = render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Width')).toHaveClass('border-input');
    expect(screen.getByLabelText('Fill hex')).toHaveClass('border-input');
    expect(container.querySelector('aside')).toHaveClass(
      'absolute',
      'right-3',
      'top-1/2',
      'w-56'
    );
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
    expect(screen.getByLabelText('Text')).toHaveValue('Start');
    expect(screen.getByLabelText('Font size')).toHaveValue(18);
    expect(screen.getByLabelText('Text color hex')).toHaveValue('#654321');
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

  it('uses defaults and updates rectangle text fields through draft/commit', () => {
    const plainRect: RectShape = {
      id: 'plain',
      type: 'rect',
      x: 0,
      y: 0,
      width: 80,
      height: 40,
    };
    useEditorStore.setState({
      shapes: { plain: plainRect },
      selectedId: 'plain',
    });
    render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Text')).toHaveValue('');
    expect(screen.getByLabelText('Font size')).toHaveValue(16);
    expect(screen.getByLabelText('Text color hex')).toHaveValue('#000000');

    const textInput = screen.getByLabelText('Text');
    fireEvent.focus(textInput);
    fireEvent.change(textInput, { target: { value: 'New label' } });
    fireEvent.blur(textInput);

    expect(useEditorStore.getState().shapes.plain).toMatchObject({
      text: 'New label',
    });
    expect(useEditorStore.getState().undoStack).toHaveLength(1);
  });

  it('sets Fill to transparent and restores the last opaque value', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    render(<ShapePropertiesPanel />);

    const transparent = screen.getByRole('checkbox', {
      name: 'Fill transparent',
    });
    fireEvent.click(transparent);

    expect(useEditorStore.getState().shapes.r1.fill).toBe('transparent');
    expect(screen.getByLabelText('Fill swatch')).toBeDisabled();
    expect(screen.getByLabelText('Fill hex')).toBeDisabled();

    fireEvent.click(transparent);

    expect(useEditorStore.getState().shapes.r1.fill).toBe('#ff0000');
    expect(screen.getByLabelText('Fill swatch')).toBeEnabled();
    expect(screen.getByLabelText('Fill hex')).toBeEnabled();
  });

  it('uses the per-field fallback when an initially transparent color is restored', () => {
    const transparentRect: RectShape = {
      ...rect,
      fill: 'transparent',
      stroke: 'transparent',
      textColor: 'transparent',
    };
    useEditorStore.setState({
      shapes: { r1: transparentRect },
      selectedId: 'r1',
    });
    render(<ShapePropertiesPanel />);

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Fill transparent' })
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Stroke transparent' })
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Text color transparent' })
    );

    expect(useEditorStore.getState().shapes.r1).toMatchObject({
      fill: '#ffffff',
      stroke: '#000000',
      textColor: '#000000',
    });
  });

  it('supports transparent standalone text color', () => {
    useEditorStore.setState({ shapes: { t1: text }, selectedId: 't1' });
    render(<ShapePropertiesPanel />);

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Text color transparent' })
    );

    expect(useEditorStore.getState().shapes.t1.fill).toBe('transparent');
  });

  it('rounds X and Y to integers during editing and commit', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    render(<ShapePropertiesPanel />);

    const xInput = screen.getByLabelText('X');
    fireEvent.focus(xInput);
    fireEvent.change(xInput, { target: { value: '12.6' } });

    expect(xInput).toHaveValue(13);
    expect(useEditorStore.getState().shapes.r1.x).toBe(13);

    fireEvent.blur(xInput);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().shapes.r1.x).toBe(10);
  });

  it('rounds rectangle dimensions to two decimals', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    render(<ShapePropertiesPanel />);

    const widthInput = screen.getByLabelText('Width');
    fireEvent.focus(widthInput);
    fireEvent.change(widthInput, { target: { value: '123.456' } });

    expect(widthInput).toHaveValue(123.46);
    expect(useEditorStore.getState().shapes.r1).toMatchObject({
      width: 123.46,
    });
  });

  it('rounds circle radii to two decimals without rounding font size', () => {
    useEditorStore.setState({ shapes: { c1: circle }, selectedId: 'c1' });
    render(<ShapePropertiesPanel />);

    fireEvent.change(screen.getByLabelText('Radius X'), {
      target: { value: '10.556' },
    });
    fireEvent.change(screen.getByLabelText('Font size'), {
      target: { value: '18.125' },
    });

    expect(useEditorStore.getState().shapes.c1).toMatchObject({
      radiusX: 10.56,
      fontSize: 18.125,
    });
  });
});
