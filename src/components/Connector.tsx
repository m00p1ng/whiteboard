import { Line } from 'react-konva';
import { useEditorStore } from '@/store/editorStore';
import { getAnchorPoint } from '@/utils/geometry';
import type { ConnectorShape } from '@/types/shape';

interface ConnectorProps {
  connector: ConnectorShape;
}

export function Connector({ connector }: ConnectorProps) {
  const shapes = useEditorStore((s) => s.shapes);
  const from = shapes[connector.fromId];
  const to = shapes[connector.toId];

  if (!from || !to) return null;

  const start = getAnchorPoint(from, connector.fromAnchor ?? 'center');
  const end = getAnchorPoint(to, connector.toAnchor ?? 'center');

  return (
    <Line
      id={connector.id}
      points={[start.x, start.y, end.x, end.y]}
      stroke={connector.stroke ?? '#000'}
      strokeWidth={connector.strokeWidth ?? 2}
    />
  );
}
