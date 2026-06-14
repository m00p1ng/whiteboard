# Infinite Grid Background

## Summary
Add an infinite grid background to the whiteboard canvas. The grid uses major and minor lines in fixed world-space spacing, renders behind all shapes, and can be toggled on/off from the top bar. The toggle state persists globally in `localStorage`.

## Motivation
The current canvas background is a flat `bg-gray-50`. A grid gives users a spatial reference for aligning shapes and estimating distances, which is expected behavior in whiteboard and design tools.

## Decisions Made During Brainstorming

| Topic | Decision |
|-------|----------|
| Grid style | Major + minor lines |
| Spacing behavior | Fixed world spacing (grid density changes with zoom) |
| Minor / major spacing | 20px / 100px |
| Color palette | Neutral gray |
| Configurability | Toggle on/off only |
| Persistence | Global `localStorage` preference |
| Implementation approach | Custom Konva `Shape` scene function inside a bottom layer |
| Toggle placement | `TopBar`, grouped with undo/redo/delete actions |

## Architecture

### Components

- **`GridBackground`** (`src/components/GridBackground.tsx`)
  - New presentational component.
  - Renders a Konva `Layer` containing one Konva `Shape`.
  - The `Shape` draws minor and major grid lines via a custom `sceneFunc`.
  - Props:
    - `viewport: Viewport` — current pan/zoom state.
    - `visible: boolean` — whether to draw the grid.
    - `width: number` — stage width in screen pixels.
    - `height: number` — stage height in screen pixels.

- **`grid` utilities** (`src/utils/grid.ts`)
  - Pure helper functions:
    - `drawGrid(context, viewport, width, height)` — draws minor/major lines for the visible bounds.
    - `getGridSpacing(scale)` — returns adaptive `majorStep` and `minorStep` for the current zoom.
    - `getGridColors()` — returns minor/major colors for the active theme.

- **`Canvas`** (`src/components/Canvas.tsx`)
  - Imports `<GridBackground />` and renders it as the first `Layer` inside the `Stage`, before the shape layer.
  - Passes `viewport` from `editorStore` and `showGrid` from `editorStore`.

- **`TopBar`** (`src/components/TopBar.tsx`)
  - Adds a grid toggle button (icon from `lucide-react`) near the existing undo/redo/delete buttons.
  - Reads `showGrid` and calls `setShowGrid` from `editorStore`.

### State Management

- **`editorStore`** (`src/store/editorStore.ts`)
  - New field: `showGrid: boolean`.
  - New action: `setShowGrid(value: boolean): void`.
  - Default value is read from `localStorage` key `whiteboard:showGrid` if present; otherwise defaults to `true`.
  - `setShowGrid` updates state and writes the value to `localStorage`.

### Grid Drawing Algorithm

The custom `sceneFunc` receives the Konva context, shape, and dimensions. On every render:

1. Compute visible world bounds from `viewport` and the passed `width`/`height`:
   - `worldMinX = -offsetX / scale`
   - `worldMaxX = (width - offsetX) / scale`
   - `worldMinY = -offsetY / scale`
   - `worldMaxY = (height - offsetY) / scale`
2. Call `getGridSpacing(scale)` to determine the current adaptive `majorStep` and `minorStep`.
3. Align bounds to the minor grid:
   - `startX = floor(worldMinX / minorStep) * minorStep`
   - `endX = ceil(worldMaxX / minorStep) * minorStep`
   - (same for Y)
4. Draw all minor vertical and horizontal lines within the bounds using the minor line color.
5. Draw all major vertical and horizontal lines (multiples of `majorStep`) using the major line color and a slightly thicker stroke.

Because the grid layer is inside the same transformed `Stage`, the existing `scaleX/scaleY/x/y` transform on the `Stage` applies to the grid automatically.

## Visual Style

| Mode | Minor Lines | Major Lines | Existing Canvas Background |
|------|-------------|-------------|----------------------------|
| Light | `#e2e8f0` (slate-200), 1px | `#cbd5e1` (slate-300), 1.5px | `bg-gray-50` |
| Dark | `#27272a` (zinc-800), 1px | `#3f3f46` (zinc-700), 1.5px | Dark mode background (`--canvas`) |

Colors are defined as constants in `GridBackground.tsx`. The active mode is detected by checking `document.documentElement.classList.contains('dark')`, which matches the Tailwind dark-mode convention used in the project.

## Spacing & Zoom Behavior

- The grid adapts its spacing as the user zooms, similar to Miro: major lines stay roughly every ~100 screen pixels regardless of zoom level.
- `getGridSpacing(scale)` computes a target world step from the current scale, then snaps it to the nearest "nice" step in the sequence `1, 2, 5, 10, 20, 50, 100, 200, 500, ...`.
- Minor step is always one-fifth of the major step.
- This keeps the on-screen grid density consistent and avoids a visually dense grid when zoomed far out.

## Toggle UX

- A single icon button in `TopBar` shows the grid state.
- The icon changes visual state (e.g., `Grid3X3` from `lucide-react`) and can use `data-active` or `aria-pressed` to indicate visibility.
- Tooltip or `aria-label` reads "Show grid" / "Hide grid" based on state.
- Toggle is global: it applies to every board the user opens.

## Edge Cases

- **Dense zoom levels:** Only lines within the visible world bounds are drawn, so the number of rendered lines is bounded by screen size, not board size.
- **Extreme panning:** Bounds are rounded to the nearest minor grid multiple, keeping line coordinates clean and avoiding cumulative floating-point drift.
- **Window resize:** The grid reads stage dimensions on each render, so it automatically adapts.
- **Hidden grid:** When `visible` is `false`, the grid `Layer` is not rendered at all (`visible && <Layer>...</Layer>` in `Canvas`).

## Testing

### Unit tests for `GridBackground`

- Render inside a `Stage` with a fixed `window.innerWidth/Height` mock.
- Verify the custom `sceneFunc` draws horizontal and vertical lines.
- Verify no lines are drawn when `visible={false}`.
- Verify major lines are drawn at multiples of 100 world units and minor lines at multiples of 20 world units for a default viewport.

### Store tests

- Extend `editorStore.test.ts`:
  - `showGrid` defaults to `true` when no `localStorage` value exists.
  - `setShowGrid(false)` updates state and writes `false` to `localStorage`.

### Integration tests

- `Canvas.test.tsx`: verify the grid layer renders behind shapes and does not interfere with existing pointer interactions.

## Files to Create or Modify

- **Create:** `src/utils/grid.ts`
- **Create:** `src/components/GridBackground.tsx`
- **Create:** `src/components/GridBackground.test.tsx`
- **Modify:** `src/components/Canvas.tsx`
- **Modify:** `src/components/TopBar.tsx`
- **Modify:** `src/store/editorStore.ts`
- **Modify:** `src/store/editorStore.test.ts`
- **Modify:** `src/components/Canvas.test.tsx`

## Non-Goals

- Snap-to-grid behavior is out of scope.
- Per-board grid settings are out of scope.
- Configurable spacing or colors beyond the approved defaults are out of scope.
- Grid is not included in exported images or printed output in this iteration.
