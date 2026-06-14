interface ShapeContextMenuProps {
  x: number;
  y: number;
  canBringForward: boolean;
  canSendBackward: boolean;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onDelete: () => void;
}

const itemClass =
  'block w-full px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground disabled:text-muted-foreground disabled:hover:bg-transparent';

export function ShapeContextMenu({
  x,
  y,
  canBringForward,
  canSendBackward,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onDelete,
}: ShapeContextMenuProps) {
  return (
    <div
      role="menu"
      className="absolute z-50 min-w-[160px] rounded border bg-popover py-1 text-sm text-popover-foreground shadow-md"
      style={{ left: x, top: y }}
    >
      <button type="button" className={itemClass} onClick={onBringToFront}>
        Bring to Front
      </button>
      <button
        type="button"
        className={itemClass}
        onClick={onBringForward}
        disabled={!canBringForward}
      >
        Bring Forward
      </button>
      <button
        type="button"
        className={itemClass}
        onClick={onSendBackward}
        disabled={!canSendBackward}
      >
        Send Backward
      </button>
      <button type="button" className={itemClass} onClick={onSendToBack}>
        Send to Back
      </button>
      <div className="my-1 border-t" />
      <button
        type="button"
        className={`${itemClass} text-destructive hover:bg-destructive/10 hover:text-destructive`}
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}
