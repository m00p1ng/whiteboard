import { useEffect, useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  CornerLeftDown,
  CornerLeftUp,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ContextMenuAction =
  | 'front'
  | 'forward'
  | 'backward'
  | 'back'
  | 'duplicate'
  | 'delete';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  target: { type: 'node' | 'edge'; id: string };
  canForward: boolean;
  canBackward: boolean;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
}

const MENU_WIDTH = 180;
const MENU_HEIGHT = 260;

export function CanvasContextMenu({
  x,
  y,
  target,
  canForward,
  canBackward,
  onAction,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  function handleAction(action: ContextMenuAction) {
    onAction(action);
    onClose();
  }

  const clampedX = Math.min(x, window.innerWidth - MENU_WIDTH);
  const clampedY = Math.min(y, window.innerHeight - MENU_HEIGHT);

  const isNode = target.type === 'node';

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: clampedX, top: clampedY }}
      role="menu"
    >
      {isNode && (
        <>
          <MenuItem
            icon={<CornerLeftUp className="h-4 w-4" />}
            label="Bring to Front"
            onClick={() => handleAction('front')}
          />
          <MenuItem
            icon={<ArrowUp className="h-4 w-4" />}
            label="Bring Forward"
            disabled={!canForward}
            onClick={() => handleAction('forward')}
          />
          <MenuItem
            icon={<ArrowDown className="h-4 w-4" />}
            label="Send Backward"
            disabled={!canBackward}
            onClick={() => handleAction('backward')}
          />
          <MenuItem
            icon={<CornerLeftDown className="h-4 w-4" />}
            label="Send to Back"
            onClick={() => handleAction('back')}
          />
          <div className="my-1 h-px bg-border" />
          <MenuItem
            icon={<Copy className="h-4 w-4" />}
            label="Duplicate"
            onClick={() => handleAction('duplicate')}
          />
          <div className="my-1 h-px bg-border" />
        </>
      )}
      <MenuItem
        icon={<Trash2 className="h-4 w-4" />}
        label="Delete"
        destructive
        onClick={() => handleAction('delete')}
      />
    </div>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function MenuItem({
  icon,
  label,
  destructive,
  disabled,
  onClick,
}: MenuItemProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      className={cn(
        'w-full justify-start gap-2 px-2 py-1 text-sm font-normal',
        destructive && 'text-destructive hover:text-destructive'
      )}
      onClick={onClick}
      role="menuitem"
    >
      {icon}
      {label}
    </Button>
  );
}
