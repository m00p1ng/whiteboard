import type { ReactNode } from 'react';
import type { FlowchartNodeType } from '@/types/flowchart';

interface IconProps {
  className?: string;
}

function BaseIcon({ children, className }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const SHAPE_ICON_CONTENT: Record<FlowchartNodeType, ReactNode> = {
  process: <rect x="3" y="3" width="18" height="18" />,
  terminal: <rect x="3" y="5" width="18" height="14" rx="7" />,
  decision: <path d="M12 3l9 9-9 9-9-9z" />,
  data: <path d="M7 3h12l-2 18H5z" />,
  delay: <path d="M3 3h9a9 9 0 0 1 9 9v0a9 9 0 0 1-9 9H3z" />,
  preparation: <path d="M7 3h10l4 9-4 9H7l-4-9z" />,
  display: <path d="M3 3h9a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6H3z" />,
  manualInput: <path d="M3 3h18l-4 18H7z" />,
  document: <path d="M3 3h18v8c-6 5-12 5-18 0z" />,
  storedData: <path d="M5 3h13v18H5a4 9 0 0 1-4-9v0a4 9 0 0 1 4-9z" />,
  merge: <path d="M3 7h18l-9 17z" />,
  offPage: <path d="M3 4h18v8l-9 9-9-9z" />,
  startEvent: <circle cx="12" cy="12" r="9" />,
  task: <rect x="3" y="3" width="18" height="18" />,
  gateway: <path d="M12 3l9 9-9 9-9-9z" />,
  dataObject: <path d="M3 3h12l6 6v12H3z" />,
};

export function ShapeIcon({ type, className }: { type: FlowchartNodeType } & IconProps) {
  return <BaseIcon className={className}>{SHAPE_ICON_CONTENT[type]}</BaseIcon>;
}

export function ConnectorIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M5 12h14M14 7l5 5-5 5" />
    </BaseIcon>
  );
}
