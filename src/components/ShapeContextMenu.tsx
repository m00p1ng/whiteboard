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
  'block w-full text-left px-3 py-1.5 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent';

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
      className="absolute z-50 min-w-[160px] rounded border border-gray-200 bg-white py-1 text-sm shadow-md"
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
      <div className="my-1 border-t border-gray-200" />
      <button
        type="button"
        className={`${itemClass} text-red-600 hover:bg-red-50`}
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}
