# Miro-Style Board Layout Design

## 1. Scope & Success Criteria

Restructure the board UI chrome from a single floating top-center toolbar into a Miro-style frame: top bar, left vertical tool rail, bottom-right zoom controls, and an interactive minimap.

**In scope:**
- Top bar: back-to-boards + board name (left), undo/redo/delete (right).
- Left vertical tool rail: select, rect, circle, line, text, connector tools.
- Bottom-right zoom controls: zoom out / percentage (click to reset to 100%) / zoom in, wired to the existing viewport scale.
- Bottom-right minimap: scaled overview of all shapes, with the current viewport drawn as a rectangle. Click/drag pans the main viewport.

**Out of scope:**
- Any Miro chrome with no equivalent feature in this app (share, comments, notifications, search, templates, presentation mode, frames).
- Multi-board minimap thumbnails, zoom presets dropdown, keyboard zoom shortcuts.
- Resizing/repositioning the minimap or zoom controls.

**Success criteria:** Board page looks and behaves like the reference Miro layout for the features this app already has — tools on the left, board identity + history controls on top, zoom/minimap bottom-right — with no regression to existing drawing/undo/redo/delete functionality.

## 2. Component Breakdown

Replaces `src/components/Toolbar.tsx` with four new components:

- **`TopBar.tsx`** — full-width thin bar, fixed to top. Left side: back button (`ArrowLeft`, only shown when `currentBoardId` set) + board name text (from `currentBoard.name`). Right side: undo, redo, delete buttons (same logic/disabled state as current `Toolbar`).
- **`LeftToolbar.tsx`** — vertical floating bar, fixed to left edge, vertically centered. Contains the existing `ToggleGroup` of tool icons (select, rect, circle, line, text, connector), stacked vertically.
- **`ZoomControls.tsx`** — bottom-right floating bar. Zoom-out button, percentage label, zoom-in button.
- **`Minimap.tsx`** — bottom-right floating panel, positioned above `ZoomControls`. Canvas-2D rendered overview + viewport rectangle, click/drag to pan.

`BoardPage.tsx` renders `TopBar`, `LeftToolbar`, `Canvas`, `ZoomControls`, `Minimap` instead of `Toolbar` + `Canvas`.

## 3. Zoom Controls

- Zoom-in / zoom-out multiply `viewport.scale` by `1.2` / `1/1.2`, clamped to `[0.1, 4]`.
- Anchored at screen center: given `pointer = {x: innerWidth/2, y: innerHeight/2}`, recompute `offsetX`/`offsetY` so the world point under screen-center stays fixed (same math as the existing wheel-zoom handler in `Canvas.tsx`).
- Percentage label shows `Math.round(viewport.scale * 100) + '%'`. Clicking it resets `scale` to `1` using the same center-anchor math.
- New pure helper in `src/utils/geometry.ts`: `zoomAtPoint(viewport, point, newScale)` returns the new `{scale, offsetX, offsetY}`. Used by both the wheel handler (refactor) and `ZoomControls`.

## 4. Minimap

- Fixed panel size, e.g. 180×120px, rendered via plain `<canvas>` + 2D context (no Konva).
- **Bounds calculation**: new helper `getShapeBounds(shape): {x, y, width, height} | null` in `geometry.ts`, per shape type:
  - `rect`: `{x, y, width, height}`
  - `circle`: `{x: x-radius, y: y-radius, width: 2*radius, height: 2*radius}`
  - `line`: bbox of `points`
  - `text`: `{x, y, width: text.length * fontSize * 0.6, height: fontSize * 1.2}` (approximation)
  - `connector`: returns `null` (skipped — endpoints already covered by the shapes it connects)
- World bounds = union of all non-null shape bounds. If no shapes exist, fall back to a default box (e.g. `{x: -400, y: -300, width: 800, height: 600}`) so the panel isn't empty/degenerate.
- `mmScale = min(panelWidth / boundsWidth, panelHeight / boundsHeight)` with small padding; shapes drawn as filled rects at `mmScale`.
- **Viewport rectangle**: visible world region is `{x: -offsetX/scale, y: -offsetY/scale, width: innerWidth/scale, height: innerHeight/scale}`. Mapped into minimap space via `mmScale` + bounds offset, drawn as an outlined rect.
- **Click/drag to pan**: pointer position within the minimap panel → inverse-mapped to world coords `(worldX, worldY)` → `setViewport({offsetX: innerWidth/2 - worldX*scale, offsetY: innerHeight/2 - worldY*scale})`, recentering the main viewport on that point. Drag continuously updates while mouse is down.

## 5. Testing

- `geometry.test.ts`: unit tests for `getShapeBounds` (one case per shape type, including `connector` → `null`) and `zoomAtPoint` (clamping at 0.1/4, center-anchor math, reset-to-1).
- No new component/render tests, consistent with existing coverage (no tests for `Canvas`/`Toolbar` today).

## 6. Migration Notes

- `Toolbar.tsx` is deleted; its back/title/undo/redo/delete/tool-selection logic is split across `TopBar` and `LeftToolbar` as described above.
- `Canvas.tsx`'s wheel-zoom handler is refactored to use the new `zoomAtPoint` helper for consistency with `ZoomControls`.
