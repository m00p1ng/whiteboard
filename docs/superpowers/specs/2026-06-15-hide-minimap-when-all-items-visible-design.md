# Hide minimap when all items are visible

## Summary

The flowchart minimap should be hidden when every node on the board is already visible in the current viewport. An empty board should also hide the minimap because there is nothing to navigate.

## Motivation

A minimap is useful for orienting the user and jumping to off-screen content. When all content already fits on screen, the minimap duplicates the main canvas and adds visual noise. Hiding it keeps the UI clean.

## Scope

- **In scope:** `src/components/flowchart/Minimap.tsx` and its tests.
- **Out of scope:** The legacy shape-board minimap in `src/components/Minimap.tsx` is not currently used by the active board page and will not be changed.

## Behavior

### Visibility rule

The minimap is hidden when any of the following is true:

1. The board has no nodes.
2. Every node's bounding box is fully contained within the visible world rectangle.

A node's bounding box is `(x, y, x + width, y + height)`.

The visible world rectangle is derived from the viewport the same way the minimap already does:

- `left = -viewport.offsetX / viewport.scale`
- `top = -viewport.offsetY / viewport.scale`
- `width = window.innerWidth / viewport.scale`
- `height = window.innerHeight / viewport.scale`

A node is fully contained when:

- `node.x >= left`
- `node.y >= top`
- `node.x + node.width <= left + width`
- `node.y + node.height <= top + height`

No padding or margin is added.

### Transition

Show and hide are instant. The component returns `null` when hidden, removing it from the layout immediately.

### Interaction

When visible, the minimap keeps its existing pointer interactions (pan on drag).

## Implementation

### Component change

In `src/components/flowchart/Minimap.tsx`:

1. Derive `nodeList` from `nodes`.
2. If `nodeList.length === 0`, return `null`.
3. Compute the visible world rectangle from `viewport` and `window.innerWidth / window.innerHeight`.
4. If every node in `nodeList` is fully contained in that rectangle, return `null`.
5. Otherwise render the existing canvas.

The existing canvas drawing logic can remain unchanged.

### Tests

Update `src/components/flowchart/Minimap.test.tsx` to cover:

- **Empty board:** Given no nodes, the minimap is not rendered.
- **All nodes in view:** Given nodes that fit entirely within the viewport, the minimap is not rendered.
- **Node off-screen:** Given at least one node outside the viewport, the minimap is rendered.

Existing tests for canvas drawing should continue to pass.

## Risks and considerations

- **Window size changes:** The check uses `window.innerWidth / window.innerHeight`, matching the existing viewport calculation. If the canvas is ever sized to a container instead of the full window, this will need to use the container size.
- **Performance:** The check is O(n) over the node list and runs on every render. Board sizes are expected to be small enough that this is negligible.
