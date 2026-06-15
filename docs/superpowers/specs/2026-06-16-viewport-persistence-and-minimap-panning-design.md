# Viewport Persistence and Minimap Panning

## Summary

Persist the flowchart viewport (pan offset and zoom scale) with each board so reopening a board restores the last view. Make the minimap's blue viewport rectangle interactive: users can drag it to pan, and click elsewhere on the minimap to jump the viewport to that location.

## Background

The flowchart already tracks viewport state in `flowchartStore`:

```ts
export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}
```

The minimap renders the visible world as a blue rectangle over the node graph, but it is currently read-only. Board persistence only stores `nodes` and `edges`, so the viewport resets to the origin every time a board is reopened.

## Goals

1. Save the current viewport inside the persisted `Board` record.
2. Restore the saved viewport when a board is opened.
3. Allow users to drag the blue rectangle on the minimap to pan the viewport.
4. Allow users to click anywhere on the minimap to center the viewport on that point.

## Non-Goals

- Zooming via the minimap (e.g. scroll wheel or resize handles).
- Animated transitions when jumping the viewport.
- Multiple saved viewports per board.
- Viewport persistence for legacy `shapes` boards.

## Design

### Architecture

Extend the existing board and flowchart stores to include viewport in persistence, and add pointer handlers to the minimap canvas.

1. **Data model**: add `viewport?: Viewport` to `Board`.
2. **Save flow**: extend `BoardPage` to subscribe to `viewport` changes and include viewport in `saveCurrentBoard` calls.
3. **Load flow**: restore `board.viewport` (or fall back to the default) when a board is loaded.
4. **Minimap interaction**: add `pointerdown`, `pointermove`, `pointerup`, and `click` handlers on the minimap canvas to convert pixel coordinates back to world coordinates and update the store viewport.

### Components & Data Flow

#### `src/store/boardStore.ts`

```ts
export interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: Record<string, FlowchartNode>;
  edges: Record<string, FlowchartEdge>;
  viewport?: Viewport; // NEW
}
```

Update `saveCurrentBoard` to accept viewport:

```ts
saveCurrentBoard: (graph: FlowchartGraph & { viewport?: Viewport }) => void
```

The saved object spreads `...graph` into the board, so viewport is persisted alongside nodes and edges.

#### `src/pages/BoardPage.tsx`

On mount, restore the saved viewport:

```ts
useFlowchartStore.setState({
  nodes: board.nodes,
  edges: board.edges,
  viewport: board.viewport ?? { scale: 1, offsetX: 0, offsetY: 0 },
});
```

Extend the store subscription to save viewport changes:

```ts
return useFlowchartStore.subscribe((state, previousState) => {
  if (
    state.nodes !== previousState.nodes ||
    state.edges !== previousState.edges ||
    state.viewport !== previousState.viewport
  ) {
    saveCurrentBoard({
      nodes: state.nodes,
      edges: state.edges,
      viewport: state.viewport,
    });
  }
});
```

#### `src/components/flowchart/Minimap.tsx`

Expose the minimap's internal transform (scale and offset used to fit graph nodes into the fixed 160×120 canvas) so event handlers can map mouse pixel coordinates back to world coordinates.

Add interaction state:

- `dragging`: whether the user is currently dragging the viewport rectangle.
- `dragStartWorld`: the world point under the pointer at drag start.
- `dragStartViewport`: snapshot of viewport at drag start.

**Drag behavior:**

1. On `pointerdown` over the canvas, determine whether the pointer is inside the blue viewport rectangle.
2. If inside, enter drag mode.
3. On `pointermove`, compute the world delta from the drag start and apply it to the snapshot viewport's offset.
4. On `pointerup`, exit drag mode.

**Click behavior:**

- On `click` (not preceded by a drag), convert the click pixel to world coordinates and center the viewport there by setting:
  ```ts
  offsetX = canvasCenterX - worldX * scale
  offsetY = canvasCenterY - worldY * scale
  ```

**Cursor:**

- `cursor: 'grab'` when hovering the blue rectangle.
- `cursor: 'grabbing'` while dragging.

### Error Handling

- Boards without a saved `viewport` field default to `{ scale: 1, offsetX: 0, offsetY: 0 }`.
- Invalid or missing viewport values on legacy boards are ignored and replaced with the default.
- Resizing the browser while dragging behaves the same as the existing main canvas pan (current window size is used).

### Testing

- `boardStore.test.ts`: verify that `saveCurrentBoard` persists viewport and that `Board` records with a viewport load correctly.
- `BoardPage.test.tsx`: verify that opening a board restores its saved viewport; verify that changing the viewport triggers a save.
- `Minimap.test.tsx`: verify that dragging the blue rectangle updates the store viewport, and that clicking the minimap pans to the clicked world point.
- Run `npm run test` and `npm run lint` before finishing.

## Approaches Considered

1. **Save viewport in Board record on every change (selected)**: Consistent with the existing auto-save pattern for nodes/edges. Simple and reliable.
2. **Debounced viewport persistence**: Reduces IndexedDB writes. Rejected because the additional complexity is unnecessary for a single small object.
3. **Save viewport only on board close**: Minimal writes. Rejected because closing the browser tab directly would lose the last viewport.

## Open Questions

None.

## Out of Scope

- Minimap zoom controls.
- Viewport animations or smooth transitions.
- Per-user default viewport.
- Legacy shape board viewport persistence.
