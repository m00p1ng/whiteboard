import type { FlowchartNodeType } from '@/types/flowchart';

export function buildShapePath(type: FlowchartNodeType, w: number, h: number): string {
  const r = h / 2;
  const skew = Math.min(20, w / 4);
  const circleR = Math.min(w, h) / 2;

  switch (type) {
    case 'terminal':
      return `M ${r},0 h ${w - 2 * r} a ${r},${r} 0 0 1 ${r},${r} v ${h - 2 * r} a ${r},${r} 0 0 1 -${r},${r} h -${w - 2 * r} a ${r},${r} 0 0 1 -${r},-${r} v -${h - 2 * r} a ${r},${r} 0 0 1 ${r},-${r} z`;
    case 'decision':
      return `M ${w / 2},0 L ${w},${h / 2} L ${w / 2},${h} L 0,${h / 2} z`;
    case 'data':
      return `M ${skew},0 L ${w},0 L ${w - skew},${h} L 0,${h} z`;
    case 'delay':
      return `M 0,0 h ${w - r} a ${r},${r} 0 0 1 ${r},${r} v ${h - 2 * r} a ${r},${r} 0 0 1 -${r},${r} h -${w - r} z`;
    case 'preparation': {
      const inset = Math.min(15, w / 4);
      return `M ${inset},0 L ${w - inset},0 L ${w},${h / 2} L ${w - inset},${h} L ${inset},${h} L 0,${h / 2} z`;
    }
    case 'display': {
      const arc = Math.min(20, h / 2);
      return `M 0,0 h ${w - arc} a ${arc},${arc} 0 0 1 ${arc},${arc} v ${h - 2 * arc} a ${arc},${arc} 0 0 1 -${arc},${arc} h -${w - arc} z`;
    }
    case 'manualInput':
      return `M 0,0 L ${w},0 L ${w - skew},${h} L 0,${h} z`;
    case 'document':
      return `M 0,0 h ${w} v ${h - 15} c -${w / 3},15 -${(2 * w) / 3},15 -${w},0 z`;
    case 'storedData': {
      const dw = Math.min(20, w / 4);
      return `M ${dw},0 h ${w - dw} v ${h} h -${w - dw} a ${dw},${h / 2} 0 0 1 -${dw},-${h / 2} v -${h / 2} a ${dw},${h / 2} 0 0 1 ${dw},-${h / 2} z`;
    }
    case 'merge':
      return `M 0,0 L ${w},0 L ${w / 2},${h} z`;
    case 'offPage':
      return `M 0,0 h ${w} v ${h - 15} L ${w / 2},${h} L 0,${h - 15} z`;
    case 'startEvent': {
      const cx = w / 2;
      const cy = h / 2;
      return `M ${cx},${cy - circleR} a ${circleR},${circleR} 0 1 1 0,${2 * circleR} a ${circleR},${circleR} 0 1 1 0,-${2 * circleR} z`;
    }
    case 'gateway':
      return `M ${w / 2},0 L ${w},${h / 2} L ${w / 2},${h} L 0,${h / 2} z`;
    case 'task':
      return `M 0,0 h ${w} v ${h} h -${w} z`;
    case 'dataObject':
      return `M 0,0 h ${w - 15} l 15,15 v ${h - 15} h -${w} z`;
    case 'process':
    default:
      return `M 0,0 h ${w} v ${h} h -${w} z`;
  }
}
