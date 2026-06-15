export type PortId = 'top' | 'right' | 'bottom' | 'left';

export type FlowchartNodeType =
  | 'terminal'
  | 'process'
  | 'decision'
  | 'data'
  | 'delay'
  | 'preparation'
  | 'display'
  | 'manualInput'
  | 'document'
  | 'storedData'
  | 'merge'
  | 'offPage'
  | 'startEvent'
  | 'task'
  | 'gateway'
  | 'dataObject';

export const FLOWCHART_NODE_TYPES: FlowchartNodeType[] = [
  'terminal',
  'process',
  'decision',
  'data',
  'delay',
  'preparation',
  'display',
  'manualInput',
  'document',
  'storedData',
  'merge',
  'offPage',
  'startEvent',
  'task',
  'gateway',
  'dataObject',
];

export const BASIC_TOOLBAR_TYPES: FlowchartNodeType[] = [
  'terminal',
  'process',
  'decision',
  'data',
];

export const ADVANCED_PALETTE_TYPES: FlowchartNodeType[] = [
  'delay',
  'preparation',
  'display',
  'manualInput',
  'document',
  'storedData',
  'merge',
  'offPage',
];

export const BPMN_PALETTE_TYPES: FlowchartNodeType[] = [
  'startEvent',
  'task',
  'gateway',
  'dataObject',
];

export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  textColor?: string;
  fontFamily?: string;
}

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  arrowhead?: 'arrow' | 'open' | 'none';
}

export interface FlowchartPoint {
  x: number;
  y: number;
}

export interface FlowchartNode {
  id: string;
  type: FlowchartNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  label?: string;
  style: NodeStyle;
}

export interface FlowchartEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort: PortId;
  toPort: PortId;
  label?: string;
  waypoints?: FlowchartPoint[];
  style: EdgeStyle;
}

export type FlowchartSelection =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | null;

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface FlowchartGraph {
  nodes: Record<string, FlowchartNode>;
  edges: Record<string, FlowchartEdge>;
}

export type FlowchartTool = 'select' | 'connector' | FlowchartNodeType;

export interface Command {
  do: (state: FlowchartGraph) => void;
  undo: (state: FlowchartGraph) => void;
}
