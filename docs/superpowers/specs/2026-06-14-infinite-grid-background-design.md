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

The custom `sceneFunc` receives the Konva context and shape. On every render:

1. Read `context.getStage()` width and height in screen pixels.
2. Compute visible world bounds from `viewport`:
   - `worldMinX = -offsetX / scale`
   - `worldMaxX = (stageWidth - offsetX) / scale`
   - `worldMinY = -offsetY / scale`
   - `worldMaxY = (stageHeight - offsetY) / scale`
3. Align bounds to the minor grid:
   - `startX = floor(worldMinX / MINOR_SPACING) * MINOR_SPACING`
   - `endX = ceil(worldMaxX / MINOR_SPACING) * MINOR_SPACING`
   - (same for Y)
4. Draw all minor vertical and horizontal lines within the bounds using the minor line color.
5. Draw all major vertical and horizontal lines (multiples of `MAJOR_SPACING`) using the major line color and a slightly thicker stroke.

Because the grid layer is inside the same transformed `Stage`, the existing `scaleX/scaleY/x/y` transform on the `Stage` applies to the grid automatically.

## Visual Style

| Mode | Minor Lines | Major Lines | Existing Canvas Background |
|------|-------------|-------------|----------------------------|
| Light | `#e2e8f0` (slate-200), 1px | `#94a3b8` (slate-400), 1.5px | `bg-gray-50` |
| Dark | `#27272a` (zinc-800), 1px | `#52525b` (zinc-600), 1.5px | Dark mode background (`--canvas`) |

Colors are defined as constants in `GridBackground.tsx`. The active mode is detected by checking `document.documentElement.classList.contains('dark')`, which matches the Tailwind dark-mode convention used in the project.

## Spacing & Zoom Behavior

- `MINOR_SPACING = 20` world units.
- `MAJOR_SPACING = 100` world units.
- The grid uses fixed world spacing: as the user zooms out, fewer lines are visible on screen; as they zoom in, more lines appear. This is the simplest behavior and matches the approved approach.

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
