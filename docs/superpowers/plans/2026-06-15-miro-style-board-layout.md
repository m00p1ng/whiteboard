# Miro-Style Board Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single floating toolbar with a Miro-style board frame containing a top bar, left tool rail, center-anchored zoom controls, and an interactive minimap without regressing existing editing behavior.

**Architecture:** Keep the Zustand editor store as the source of truth for shapes, selection, history, and viewport. Move reusable zoom and shape-bound calculations into pure geometry helpers, then have `Canvas`, `ZoomControls`, and `Minimap` share those calculations while the new top and left chrome components retain the existing toolbar actions.

**Tech Stack:** React 19, TypeScript 6, Zustand 5, React-Konva/Konva, Tailwind CSS 4, Radix Toggle Group, lucide-react, Vitest.

---

## File Structure

```
src/
├── components/
│   ├── Canvas.tsx             # Reuse zoomAtPoint for pointer-anchored wheel zoom
│   ├── LeftToolbar.tsx        # Vertical select/drawing tool rail
│   ├── Minimap.tsx            # Canvas-2D overview, viewport outline, click/drag panning
│   ├── TopBar.tsx             # Board identity, back, undo, redo, and delete actions
│   ├── ZoomControls.tsx       # Center-anchored zoom out/reset/in controls
│   └── Toolbar.tsx            # Delete after its responsibilities are migrated
├── pages/
│   └── BoardPage.tsx          # Compose Canvas with the four new chrome components
└── utils/
    ├── geometry.ts            # Shape bounds and reusable clamped zoom math
    └── geometry.test.ts       # Unit coverage for all new pure geometry behavior
```

The existing local changes to `src/store/editorStore.test.ts` and `src/App.css` are unrelated to this feature. Do not edit, stage, revert, or include them in any commit made from this plan.

---

### Task 1: Add Shape Bounds and Viewport Zoom Geometry

**Files:**
- Modify: `src/utils/geometry.test.ts`
- Modify: `src/utils/geometry.ts`

- [ ] **Step 1: Write failing tests for every shape bound**

Replace `src/utils/geometry.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { getAnchorPoint, getShapeBounds, zoomAtPoint } from './geometry';
import type {
  CircleShape,
  ConnectorShape,
  LineShape,
  RectShape,
  TextShape,
} from '@/types/shape';

describe('geometry', () => {
  it('returns center of a rectangle', () => {
    const rect: RectShape = {
      id: 'r',
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    };

    expect(getAnchorPoint(rect, 'center')).toEqual({ x: 50, y: 25 });
  });

  it('returns right side of a circle', () => {
    const circle: CircleShape = {
      id: 'c',
      type: 'circle',
      x: 0,
      y: 0,
      radius: 30,
    };

    expect(getAnchorPoint(circle, 'right')).toEqual({ x: 30, y: 0 });
  });
});

describe('getShapeBounds', () => {
  it('returns rectangle bounds', () => {
    const shape: RectShape = {
      id: 'rect',
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 60,
    };

    expect(getShapeBounds(shape)).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 60,
    });
  });

  it('returns circle bounds from its center and radius', () => {
    const shape: CircleShape = {
      id: 'circle',
      type: 'circle',
      x: 50,
      y: 70,
      radius: 20,
    };

    expect(getShapeBounds(shape)).toEqual({
      x: 30,
      y: 50,
      width: 40,
      height: 40,
    });
  });

  it('returns line bounds including the line node position', () => {
    const shape: LineShape = {
      id: 'line',
      type: 'line',
      x: 10,
      y: -5,
      points: [-20, 40, 80, -10],
    };

    expect(getShapeBounds(shape)).toEqual({
      x: -10,
      y: -15,
      width: 100,
      height: 50,
    });
  });

  it('returns approximate text bounds', () => {
    const shape: TextShape = {
      id: 'text',
      type: 'text',
      x: 15,
      y: 25,
      text: 'Hello',
      fontSize: 20,
    };

    expect(getShapeBounds(shape)).toEqual({
      x: 15,
      y: 25,
      width: 60,
      height: 24,
    });
  });

  it('skips connectors because connected shapes supply their bounds', () => {
    const shape: ConnectorShape = {
      id: 'connector',
      type: 'connector',
      x: 0,
      y: 0,
      fromId: 'a',
      toId: 'b',
    };

    expect(getShapeBounds(shape)).toBeNull();
  });
});

describe('zoomAtPoint', () => {
  it('keeps the world point under the anchor fixed', () => {
    expect(
      zoomAtPoint(
        { scale: 2, offsetX: 100, offsetY: 50 },
        { x: 500, y: 300 },
        3
      )
    ).toEqual({
      scale: 3,
      offsetX: -100,
      offsetY: -75,
    });
  });

  it('clamps zoom below the minimum scale', () => {
    expect(
      zoomAtPoint(
        { scale: 1, offsetX: 0, offsetY: 0 },
        { x: 100, y: 100 },
        0.01
      )
    ).toEqual({
      scale: 0.1,
      offsetX: 90,
      offsetY: 90,
    });
  });

  it('clamps zoom above the maximum scale', () => {
    expect(
      zoomAtPoint(
        { scale: 1, offsetX: 0, offsetY: 0 },
        { x: 100, y: 100 },
        10
      )
    ).toEqual({
      scale: 4,
      offsetX: -300,
      offsetY: -300,
    });
  });

  it('resets to 100 percent around the supplied anchor', () => {
    expect(
      zoomAtPoint(
        { scale: 2, offsetX: -200, offsetY: -100 },
        { x: 400, y: 300 },
        1
      )
    ).toEqual({
      scale: 1,
      offsetX: 100,
      offsetY: 100,
    });
  });
});
```

- [ ] **Step 2: Run the geometry tests to verify the new imports fail**

Run:

```bash
rtk npm test -- src/utils/geometry.test.ts
```

Expected: FAIL because `getShapeBounds` and `zoomAtPoint` are not exported from `geometry.ts`.

- [ ] **Step 3: Implement the pure geometry helpers**

Append these types and functions to `src/utils/geometry.ts` after `Point`, leaving `getAnchorPoint` intact:

```ts
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;

export function getShapeBounds(shape: Shape): Bounds | null {
  switch (shape.type) {
    case 'rect':
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      };
    case 'circle':
      return {
        x: shape.x - shape.radius,
        y: shape.y - shape.radius,
        width: shape.radius * 2,
        height: shape.radius * 2,
      };
    case 'line': {
      const xs = [shape.points[0], shape.points[2]];
      const ys = [shape.points[1], shape.points[3]];
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      return {
        x: shape.x + minX,
        y: shape.y + minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
    case 'text':
      return {
        x: shape.x,
        y: shape.y,
        width: shape.text.length * shape.fontSize * 0.6,
        height: shape.fontSize * 1.2,
      };
    case 'connector':
      return null;
  }
}

export function zoomAtPoint(
  viewport: ViewportTransform,
  point: Point,
  requestedScale: number
): ViewportTransform {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, requestedScale));
  const worldX = (point.x - viewport.offsetX) / viewport.scale;
  const worldY = (point.y - viewport.offsetY) / viewport.scale;

  return {
    scale,
    offsetX: point.x - worldX * scale,
    offsetY: point.y - worldY * scale,
  };
}
```

- [ ] **Step 4: Run the geometry tests**

Run:

```bash
rtk npm test -- src/utils/geometry.test.ts
```

Expected: PASS with 11 tests.

- [ ] **Step 5: Commit the geometry helpers**

```bash
rtk git add src/utils/geometry.ts src/utils/geometry.test.ts
rtk git commit -m "feat: add board viewport geometry"
```

Expected: commit includes only the two geometry files.

---

### Task 2: Reuse Clamped Zoom Math in the Konva Canvas

**Files:**
- Modify: `src/components/Canvas.tsx:5-9`
- Modify: `src/components/Canvas.tsx:105-122`

- [ ] **Step 1: Import the shared zoom helper**

Add this import to `src/components/Canvas.tsx`:

```ts
import { zoomAtPoint } from '@/utils/geometry';
```

- [ ] **Step 2: Replace the wheel handler with the shared helper**

Replace `handleWheel` with:

```ts
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.05;
    const requestedScale =
      e.evt.deltaY > 0
        ? viewport.scale / scaleBy
        : viewport.scale * scaleBy;

    setViewport(zoomAtPoint(viewport, pointer, requestedScale));
  };
```

This preserves pointer anchoring while adding the same `[0.1, 4]` clamp used by the visible zoom controls.

- [ ] **Step 3: Run focused tests and the TypeScript build**

Run:

```bash
rtk npm test -- src/utils/geometry.test.ts
rtk npm run build
```

Expected: geometry tests PASS and the production build completes without TypeScript errors.

- [ ] **Step 4: Commit the Canvas refactor**

```bash
rtk git add src/components/Canvas.tsx
rtk git commit -m "refactor: share canvas zoom math"
```

Expected: commit includes only `src/components/Canvas.tsx`.

---

### Task 3: Split Board Identity and Tool Selection into Top and Left Chrome

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/LeftToolbar.tsx`

- [ ] **Step 1: Create the fixed top bar**

Create `src/components/TopBar.tsx`:

```tsx
import { ArrowLeft, Redo2, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBoardStore } from '@/store/boardStore';
import { useEditorStore } from '@/store/editorStore';

export function TopBar() {
  const currentBoardId = useBoardStore((state) => state.currentBoardId);
  const currentBoard = useBoardStore((state) =>
    state.boards.find((board) => board.id === state.currentBoardId)
  );
  const closeBoard = useBoardStore((state) => state.closeBoard);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const selectedId = useEditorStore((state) => state.selectedId);
  const removeShape = useEditorStore((state) => state.removeShape);
  const reset = useEditorStore((state) => state.reset);

  const handleBack = () => {
    closeBoard();
    reset();
  };

  return (
    <header className="absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-3 shadow-sm backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        {currentBoardId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="Back to boards"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <span className="truncate text-sm font-semibold">
          {currentBoard?.name ?? 'Untitled board'}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={undo} aria-label="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={redo} aria-label="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!selectedId}
          onClick={() => selectedId && removeShape(selectedId)}
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create the fixed vertical tool rail**

Create `src/components/LeftToolbar.tsx`:

```tsx
import type { ReactNode } from 'react';
import {
  Circle,
  GitCommitHorizontal,
  Minus,
  MousePointer2,
  Square,
  Type,
} from 'lucide-react';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { useEditorStore, type Tool } from '@/store/editorStore';

const tools: { value: Tool; icon: ReactNode; label: string }[] = [
  {
    value: 'select',
    icon: <MousePointer2 className="h-4 w-4" />,
    label: 'Select',
  },
  {
    value: 'rect',
    icon: <Square className="h-4 w-4" />,
    label: 'Rectangle',
  },
  {
    value: 'circle',
    icon: <Circle className="h-4 w-4" />,
    label: 'Circle',
  },
  {
    value: 'line',
    icon: <Minus className="h-4 w-4" />,
    label: 'Line',
  },
  {
    value: 'text',
    icon: <Type className="h-4 w-4" />,
    label: 'Text',
  },
  {
    value: 'connector',
    icon: <GitCommitHorizontal className="h-4 w-4" />,
    label: 'Connector',
  },
];

export function LeftToolbar() {
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);

  return (
    <aside className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-lg border bg-background p-1 shadow-md">
      <ToggleGroup
        type="single"
        value={tool}
        onValueChange={(value) => value && setTool(value as Tool)}
        className="flex-col"
        aria-label="Drawing tools"
      >
        {tools.map((item) => (
          <ToggleGroupItem
            key={item.value}
            value={item.value}
            aria-label={item.label}
          >
            {item.icon}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </aside>
  );
}
```

- [ ] **Step 3: Verify both components type-check**

Run:

```bash
rtk npm run build
```

Expected: production build completes without TypeScript errors.

- [ ] **Step 4: Commit the new board chrome**

```bash
rtk git add src/components/TopBar.tsx src/components/LeftToolbar.tsx
rtk git commit -m "feat: split board toolbar chrome"
```

Expected: commit includes only `TopBar.tsx` and `LeftToolbar.tsx`.

---

### Task 4: Add Center-Anchored Zoom Controls

**Files:**
- Create: `src/components/ZoomControls.tsx`

- [ ] **Step 1: Create the zoom control component**

Create `src/components/ZoomControls.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify the component type-checks**

Run:

```bash
rtk npm run build
```

Expected: production build completes without TypeScript errors.

- [ ] **Step 3: Commit the zoom controls**

```bash
rtk git add src/components/ZoomControls.tsx
rtk git commit -m "feat: add board zoom controls"
```

Expected: commit includes only `src/components/ZoomControls.tsx`.

---

### Task 5: Add the Interactive Canvas-2D Minimap

**Files:**
- Create: `src/components/Minimap.tsx`

- [ ] **Step 1: Create the minimap component**

Create `src/components/Minimap.tsx`:

```tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useEditorStore } from '@/store/editorStore';
import {
  getShapeBounds,
  type Bounds,
} from '@/utils/geometry';

const PANEL_WIDTH = 180;
const PANEL_HEIGHT = 120;
const PADDING = 8;
const DEFAULT_BOUNDS: Bounds = {
  x: -400,
  y: -300,
  width: 800,
  height: 600,
};

function getWorldBounds(bounds: Bounds[]): Bounds {
  if (bounds.length === 0) return DEFAULT_BOUNDS;

  const minX = Math.min(...bounds.map((item) => item.x));
  const minY = Math.min(...bounds.map((item) => item.y));
  const maxX = Math.max(...bounds.map((item) => item.x + item.width));
  const maxY = Math.max(...bounds.map((item) => item.y + item.height));

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
}

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const shapes = useEditorStore((state) => state.shapes);
  const viewport = useEditorStore((state) => state.viewport);
  const setViewport = useEditorStore((state) => state.setViewport);

  const shapeBounds = useMemo(
    () =>
      Object.values(shapes)
        .map((shape) => getShapeBounds(shape))
        .filter((bounds): bounds is Bounds => bounds !== null),
    [shapes]
  );
  const worldBounds = useMemo(
    () => getWorldBounds(shapeBounds),
    [shapeBounds]
  );
  const minimapScale = Math.min(
    (PANEL_WIDTH - PADDING * 2) / worldBounds.width,
    (PANEL_HEIGHT - PADDING * 2) / worldBounds.height
  );
  const contentWidth = worldBounds.width * minimapScale;
  const contentHeight = worldBounds.height * minimapScale;
  const originX = (PANEL_WIDTH - contentWidth) / 2;
  const originY = (PANEL_HEIGHT - contentHeight) / 2;

  const worldToMinimap = useCallback(
    (x: number, y: number) => ({
      x: originX + (x - worldBounds.x) * minimapScale,
      y: originY + (y - worldBounds.y) * minimapScale,
    }),
    [minimapScale, originX, originY, worldBounds]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    context.fillStyle = '#f8fafc';
    context.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);

    context.fillStyle = '#94a3b8';
    for (const bounds of shapeBounds) {
      const position = worldToMinimap(bounds.x, bounds.y);
      context.fillRect(
        position.x,
        position.y,
        Math.max(bounds.width * minimapScale, 2),
        Math.max(bounds.height * minimapScale, 2)
      );
    }

    const visibleWorld = {
      x: -viewport.offsetX / viewport.scale,
      y: -viewport.offsetY / viewport.scale,
      width: window.innerWidth / viewport.scale,
      height: window.innerHeight / viewport.scale,
    };
    const viewportPosition = worldToMinimap(
      visibleWorld.x,
      visibleWorld.y
    );

    context.strokeStyle = '#2563eb';
    context.lineWidth = 2;
    context.strokeRect(
      viewportPosition.x,
      viewportPosition.y,
      visibleWorld.width * minimapScale,
      visibleWorld.height * minimapScale
    );
  }, [minimapScale, shapeBounds, viewport, worldToMinimap]);

  const panToPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const minimapX =
      ((event.clientX - rect.left) / rect.width) * PANEL_WIDTH;
    const minimapY =
      ((event.clientY - rect.top) / rect.height) * PANEL_HEIGHT;
    const worldX =
      worldBounds.x + (minimapX - originX) / minimapScale;
    const worldY =
      worldBounds.y + (minimapY - originY) / minimapScale;

    setViewport({
      offsetX: window.innerWidth / 2 - worldX * viewport.scale,
      offsetY: window.innerHeight / 2 - worldY * viewport.scale,
    });
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    panToPointer(event);
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (isDragging) panToPointer(event);
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  return (
    <div className="absolute bottom-16 right-3 z-20 overflow-hidden rounded-lg border bg-background shadow-md">
      <canvas
        ref={canvasRef}
        width={PANEL_WIDTH}
        height={PANEL_HEIGHT}
        className="block cursor-crosshair touch-none"
        aria-label="Board minimap"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDragging(false)}
      />
    </div>
  );
}
```

The minimap intentionally skips connector geometry, uses the fixed default world box for an empty board, and maps pointer coordinates through the rendered canvas rectangle so click/drag remains correct if CSS sizing changes later.

- [ ] **Step 2: Verify the minimap type-checks**

Run:

```bash
rtk npm run build
```

Expected: production build completes without TypeScript errors.

- [ ] **Step 3: Commit the minimap**

```bash
rtk git add src/components/Minimap.tsx
rtk git commit -m "feat: add interactive board minimap"
```

Expected: commit includes only `src/components/Minimap.tsx`.

---

### Task 6: Compose the Miro-Style Board Frame and Remove the Old Toolbar

**Files:**
- Modify: `src/pages/BoardPage.tsx:1-6`
- Modify: `src/pages/BoardPage.tsx:38-43`
- Delete: `src/components/Toolbar.tsx`

- [ ] **Step 1: Replace the old toolbar import with the four new components**

Use these component imports at the top of `src/pages/BoardPage.tsx`:

```ts
import { Canvas } from '@/components/Canvas';
import { LeftToolbar } from '@/components/LeftToolbar';
import { Minimap } from '@/components/Minimap';
import { TopBar } from '@/components/TopBar';
import { ZoomControls } from '@/components/ZoomControls';
```

Keep the existing store, effect, and hotkey imports unchanged.

- [ ] **Step 2: Render the new board frame**

Replace the return block in `BoardPage` with:

```tsx
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-50">
      <Canvas />
      <TopBar />
      <LeftToolbar />
      <Minimap />
      <ZoomControls />
    </div>
  );
```

Rendering `Canvas` first makes the chrome stacking explicit; each chrome component uses `z-20`.

- [ ] **Step 3: Delete the obsolete toolbar**

Delete:

```text
src/components/Toolbar.tsx
```

- [ ] **Step 4: Run the focused geometry and app integration tests**

Run:

```bash
rtk npm test -- src/utils/geometry.test.ts src/App.test.tsx
```

Expected: geometry tests PASS; app tests still find the back button, switch to the board, and return home.

- [ ] **Step 5: Run the complete automated verification**

Run:

```bash
rtk npm test
rtk npm run lint
rtk npm run build
```

Expected: all Vitest tests PASS, ESLint reports no errors, and the production build succeeds.

- [ ] **Step 6: Perform browser verification**

Run:

```bash
rtk npm run dev
```

Open the Vite URL reported by the command in the in-app Browser and verify:

1. Create or open a named board; the name appears in the top-left beside the back button.
2. The select, rectangle, circle, line, text, and connector tools appear vertically at the left and still change the active tool.
3. Draw representative rectangle, circle, line, and text shapes; undo, redo, selection, and delete still work.
4. Mouse-wheel zoom remains anchored under the pointer and stops at 10% and 400%.
5. Zoom out, reset percentage, and zoom in are anchored at screen center; the label updates to the rounded scale percentage.
6. The minimap renders shape blocks and a blue viewport rectangle.
7. Clicking and dragging in the minimap continuously recenters the board.
8. The top bar, left tool rail, minimap, and zoom controls remain above the Konva canvas and do not move when the viewport pans.
9. Clicking Back returns to the boards page and resets editor state as before.

Stop the dev server after verification.

- [ ] **Step 7: Commit the page migration**

```bash
rtk git add src/pages/BoardPage.tsx src/components/Toolbar.tsx
rtk git commit -m "feat: adopt miro-style board layout"
```

Expected: commit modifies `BoardPage.tsx`, records deletion of `Toolbar.tsx`, and does not include `src/store/editorStore.test.ts` or `src/App.css`.

---

## Final Verification

- [ ] Run `rtk git status --short` and confirm the pre-existing `src/store/editorStore.test.ts` modification and `src/App.css` deletion remain outside the feature commits.
- [ ] Run `rtk git log --oneline -6` and confirm the feature is split into focused geometry, Canvas, chrome, zoom, minimap, and migration commits.
- [ ] Re-read `docs/superpowers/specs/2026-06-15-miro-style-board-layout-design.md` and confirm every in-scope item is represented in Tasks 1-6.
