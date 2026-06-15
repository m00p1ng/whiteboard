import { describe, it, expect } from 'vitest';
import {
  createAddNodeCommand,
  createRemoveNodeCommand,
  createMoveNodeCommand,
  createAddEdgeCommand,
  createUpdateEdgeCommand,
} from './flowchartCommands';
import type { FlowchartEdge, FlowchartGraph, FlowchartNode } from '@/types/flowchart';

describe('flowchartCommands', () => {
  const node: FlowchartNode = {
    id: 'n1',
    type: 'process',
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    style: {},
  };

  it('adds and removes a node', () => {
    const cmd = createAddNodeCommand(node);
    const state: FlowchartGraph = { nodes: {}, edges: {} };
    cmd.do(state);
    expect(state.nodes['n1']).toBeDefined();
    cmd.undo(state);
    expect(state.nodes['n1']).toBeUndefined();
  });

  it('removes attached edges when removing a node', () => {
    const a: FlowchartNode = { ...node, id: 'a' };
    const b: FlowchartNode = { ...node, id: 'b', x: 200 };
    const edge: FlowchartEdge = {
      id: 'e1',
      fromNodeId: 'a',
      toNodeId: 'b',
      fromPort: 'right',
      toPort: 'left',
      style: {},
    };
    const state: FlowchartGraph = { nodes: { a, b }, edges: { e1: edge } };
    const cmd = createRemoveNodeCommand('a', state);
    cmd.do(state);
    expect(state.nodes['a']).toBeUndefined();
    expect(state.edges['e1']).toBeUndefined();
    cmd.undo(state);
    expect(state.nodes['a']).toBeDefined();
    expect(state.edges['e1']).toBeDefined();
  });

  it('moves a node and undoes the move', () => {
    const cmd = createMoveNodeCommand('n1', { x: 0, y: 0 }, { x: 50, y: 80 });
    const state: FlowchartGraph = { nodes: { n1: node }, edges: {} };
    cmd.do(state);
    expect(state.nodes['n1'].x).toBe(50);
    expect(state.nodes['n1'].y).toBe(80);
    cmd.undo(state);
    expect(state.nodes['n1'].x).toBe(0);
    expect(state.nodes['n1'].y).toBe(0);
  });

  it('adds and removes an edge', () => {
    const edge: FlowchartEdge = {
      id: 'e1',
      fromNodeId: 'a',
      toNodeId: 'b',
      fromPort: 'right',
      toPort: 'left',
      style: {},
    };
    const cmd = createAddEdgeCommand(edge);
    const state: FlowchartGraph = { nodes: {}, edges: {} };
    cmd.do(state);
    expect(state.edges['e1']).toBeDefined();
    cmd.undo(state);
    expect(state.edges['e1']).toBeUndefined();
  });

  it('updates and restores edge geometry', () => {
    const edge: FlowchartEdge = {
      id: 'e1',
      fromNodeId: 'a',
      toNodeId: 'b',
      fromPort: 'right',
      toPort: 'left',
      waypoints: [{ x: 120, y: 40 }],
      style: {},
    };
    const state: FlowchartGraph = { nodes: {}, edges: { e1: edge } };
    const command = createUpdateEdgeCommand(
      'e1',
      {
        toNodeId: 'b',
        toPort: 'left',
        waypoints: [{ x: 120, y: 40 }],
      },
      {
        toNodeId: 'c',
        toPort: 'top',
        waypoints: [{ x: 180, y: 80 }],
      }
    );

    command.do(state);
    expect(state.edges.e1).toMatchObject({
      toNodeId: 'c',
      toPort: 'top',
      waypoints: [{ x: 180, y: 80 }],
    });

    command.undo(state);
    expect(state.edges.e1).toMatchObject({
      toNodeId: 'b',
      toPort: 'left',
      waypoints: [{ x: 120, y: 40 }],
    });
  });
});
