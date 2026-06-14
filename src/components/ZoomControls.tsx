import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editorStore';
import { zoomAtPoint } from '@/utils/geometry';

const ZOOM_STEP = 1.2;

export function ZoomControls() {
  const viewport = useEditorStore((state) => state.viewport);
  const setViewport = useEditorStore((state) => state.setViewport);

  const zoomTo = (scale: number) => {
    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    setViewport(zoomAtPoint(viewport, center, scale));
  };

  return (
    <div className="absolute bottom-3 right-3 z-20 flex items-center rounded-lg border bg-background p-1 shadow-md">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomTo(viewport.scale / ZOOM_STEP)}
        aria-label="Zoom out"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        className="min-w-16 px-2 tabular-nums"
        onClick={() => zoomTo(1)}
        aria-label="Reset zoom to 100%"
      >
        {Math.round(viewport.scale * 100)}%
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomTo(viewport.scale * ZOOM_STEP)}
        aria-label="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
