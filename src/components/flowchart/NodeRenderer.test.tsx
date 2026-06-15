import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import type { Layer as LayerType } from 'konva/lib/Layer';
import type { Group as GroupType } from 'konva/lib/Group';
import type { Text as TextType } from 'konva/lib/shapes/Text';
import { NodeRenderer } from './NodeRenderer';
import type { FlowchartNode } from '@/types/flowchart';

describe('NodeRenderer', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 10,
    y: 20,
    width: 100,
    height: 60,
    label: 'Step 1',
    style: { fill: '#ffffff', stroke: '#000000', strokeWidth: 2 },
  };

  it('renders without crashing', () => {
    render(
      <Stage width={400} height={400}>
        <Layer>
          <NodeRenderer node={node} />
        </Layer>
      </Stage>
    );
  });

  it('is interactive by default', () => {
    const layerRef = { current: null as LayerType | null };

    function Wrapper() {
      layerRef.current = useRef<LayerType>(null).current;
      return (
        <Stage width={400} height={400}>
          <Layer ref={(el) => { layerRef.current = el; }}>
            <NodeRenderer node={node} />
          </Layer>
        </Stage>
      );
    }

    render(<Wrapper />);

    const group = layerRef.current?.children[0];
    expect(group?.listening()).toBe(true);
    expect(group?.draggable()).toBe(true);
  });

  it('is non-interactive when interactive is false', () => {
    const layerRef = { current: null as LayerType | null };

    function Wrapper() {
      return (
        <Stage width={400} height={400}>
          <Layer ref={(el) => { layerRef.current = el; }}>
            <NodeRenderer node={node} interactive={false} />
          </Layer>
        </Stage>
      );
    }

    render(<Wrapper />);

    const group = layerRef.current?.children[0];
    expect(group?.listening()).toBe(false);
    expect(group?.draggable()).toBe(false);
  });

  it('applies custom fontFamily to label text', () => {
    const layerRef = { current: null as LayerType | null };
    const customNode: FlowchartNode = {
      ...node,
      style: { ...node.style, fontFamily: 'Georgia' },
    };

    function Wrapper() {
      return (
        <Stage width={400} height={400}>
          <Layer ref={(el) => { layerRef.current = el; }}>
            <NodeRenderer node={customNode} />
          </Layer>
        </Stage>
      );
    }

    render(<Wrapper />);

    const group = layerRef.current?.children[0] as GroupType | undefined;
    const textNode = group?.children.find(
      (child) => child.getClassName() === 'Text'
    ) as TextType | undefined;
    expect(textNode?.fontFamily()).toBe('Georgia');
  });
});
