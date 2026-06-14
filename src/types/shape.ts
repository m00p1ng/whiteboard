export type Shape =
  | RectShape
  | CircleShape
  | LineShape
  | TextShape
  | ConnectorShape;

export interface BaseShape {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'text' | 'connector';
  x: number;
  y: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface RectShape extends BaseShape {
  type: 'rect';
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  radiusX: number;
  radiusY: number;
}

export interface LineShape extends BaseShape {
  type: 'line';
  points: [number, number, number, number];
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
}

export interface ConnectorShape extends BaseShape {
  type: 'connector';
  fromId: string;
  toId: string;
  fromAnchor?: Anchor;
  toAnchor?: Anchor;
}

export type Anchor = 'top' | 'right' | 'bottom' | 'left' | 'center';
