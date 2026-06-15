# Revamped Board Connector Design

## Goal

Replace the board's straight-line connector tool with an auto-routing
orthogonal connector that is easier to create and edit. Users can drag from
anywhere on one shape to another shape to connect, the connector snaps to the
nearest edges, draws with an arrowhead, and reflows automatically when shapes
move. Selected connectors can be reconnected by dragging endpoints or rerouted
by dragging segments, and removed with the keyboard.

## Background

The current board connector (`ConnectorShape`) is rendered by
`src/components/Connector.tsx` as a direct center-to-center line. There is no
hit path, no arrowhead, no selection feedback, and no way to adjust the route
after creation. The flowchart editor already has a more sophisticated edge
system with orthogonal routing and handles; this design adapts those patterns
to the free-form board without unifying the two stores.

## Scope

This feature changes the board connector tool only:

- Drag-to-connect creation from any shape body to another shape.
- Orthogonal routing with a simple arrowhead at the target end.
- Nearest-edge anchoring for both source and target.
- Selection via a wide transparent hit path.
- Endpoint dragging to reconnect to a different shape.
- Segment dragging to introduce manual offsets (persisted as waypoints).
- Keyboard deletion with `Delete` / `Backspace`.
- Auto-reflow when connected shapes move.
- Undo and redo through the existing command system.

A visible floating toolbar, labels on connectors, curved routes, and obstacle
avoidance around unrelated shapes are not included.

## Data Model

Extend `ConnectorShape` in `src/types/shape.ts`:

```ts
export interface ConnectorShape extends BaseShape {
  type: 'connector';
  fromId: string;
  toId: string;
  fromAnchor?: ConnectorAnchor;
  toAnchor?: ConnectorAnchor;
  waypoints?: Point[];
}

export type ConnectorAnchor = 'top' | 'right' | 'bottom' | 'left';

interface Point {
  x: number;
  y: number;
}
```

`x` and `y` remain required by `BaseShape` but are ignored for connectors;
all geometry is derived from the attached shapes and waypoints.

Migration rules for existing persisted connectors:

- Missing `fromAnchor` / `toAnchor` → compute nearest edge from the current
  source/target positions at first render.
- Missing or empty `waypoints` → automatic orthogonal routing.

Waypoints are stored in world coordinates. When a connected shape moves, the
source/target sections recompute from the new edge positions while the stored
waypoints stay fixed.

## Creation Gesture

1. The user activates the connector tool (toolbar or `Ctrl/Cmd + K`).
2. `pointerdown` on a rect or circle shape starts a connector draft with that
   shape as the source. The source is highlighted. Lines and text shapes are
   ignored as connector sources or targets.
3. During the drag, a preview orthogonal route is drawn from the source's
   nearest edge to the current pointer position.
4. `pointerup` over a different shape creates a `ConnectorShape` with anchors
   chosen from the nearest edges of source and target.
5. `pointerup` over the source shape itself or over empty canvas cancels the
   draft.

The existing two-click connector creation is removed.

## Routing

### Automatic Routes

A new utility `src/utils/boardConnectorGeometry.ts` computes the route:

1. Determine the source anchor point on the source shape's nearest edge.
2. Determine the target anchor point on the target shape's nearest edge.
3. Add a short exit perpendicular to the source edge.
4. Add a short entry perpendicular to the target edge.
5. Insert the minimum orthogonal elbows between exit and entry.
6. Normalize the result to remove duplicate and collinear points.

The router reuses `normalizeOrthogonalPoints` (and related helpers) from
`src/utils/orthogonalRouter.ts` to avoid duplication.

### Routes with Waypoints

When `waypoints` is non-empty, the router builds anchors in this order:

```
source point -> source exit -> waypoints... -> target entry -> target point
```

It inserts orthogonal elbows between consecutive anchors that are diagonal,
normalizes the full path, and renders the result. Waypoints remain at their
absolute world positions when either shape moves; only the source and target
sections reflow.

### Fallback

If the source and target shapes overlap, or if geometry is too small to form a
valid orthogonal route, the router returns a direct source-to-target line. It
never fails to render.

## Component Architecture

### `BoardConnector`

Replaces `src/components/Connector.tsx`. Responsibilities:

- Read connected shapes from `useEditorStore`.
- Compute the orthogonal route.
- Render a visible `Line` with an arrowhead marker.
- Render a wide transparent hit path for selection.
- Render `BoardConnectorHandles` when the connector is selected.

Props:

```ts
interface BoardConnectorProps {
  connector: ConnectorShape;
  isSelected: boolean;
  previewPoints?: number[];
  onSelect: () => void;
  onWaypointPreview?: (index: number, point: Point) => void;
  onWaypointCommit?: () => void;
  onSegmentPreview?: (segmentIndex: number, delta: Point) => void;
  onSegmentCommit?: () => void;
  onEndpointPreview?: (endpoint: 'source' | 'target', point: Point) => void;
  onEndpointCommit?: (endpoint: 'source' | 'target', point: Point) => void;
}
```

### `BoardConnectorHandles`

A new component in `src/components/BoardConnectorHandles.tsx`. Responsibilities:

- Render endpoint circles at the first and last route points.
- Render bend/segment drag targets for interior segments.
- Emit preview callbacks during drag.
- Emit commit callbacks on drag end.
- Cancel event bubbling so drag operations do not pan or deselect the canvas.

Segment targets are invisible `Line` elements with a wide stroke width.

### `Canvas`

Responsibilities:

- Start and cancel connector drafts on pointer events.
- Render the connector preview (reuse `CreationPreview` or draw directly).
- Track `selectedConnectorPreview` state for live waypoint/segment/endpoint
  edits.
- Resolve shape hits for endpoint drops.
- Commit completed edits through `updateShape`.
- Delete the selected connector on `Delete` / `Backspace`.

### `boardConnectorGeometry.ts`

Pure utility responsibilities:

- `getNearestAnchor(shape, point): Anchor`
- `getAnchorPoint(shape, anchor): Point`
- `computeConnectorPath(source, sourceAnchor, target, targetAnchor, waypoints): number[]`
- `getManualWaypoints(route): Point[]`
- `moveWaypoint(waypoints, index, position): Point[]`
- `offsetRouteSegment(route, segmentIndex, delta): Point[]`

## Editing Interactions

### Selecting

Clicking or tapping the transparent hit path selects the connector. Clicking
canvas deselects. The visible stroke changes to the selection color.

### Endpoint Reconnection

Dragging an endpoint handle previews an orthogonal route from the new pointer
position. On drop over a different shape, the connector's `fromId`/`toId` and
`fromAnchor`/`toAnchor` update to that shape's nearest edge. Drops on empty
canvas cancel. Self-connections are rejected.

### Segment Offset

Dragging an interior segment perpendicular to its orientation offsets that
section:

- Horizontal segment → vertical delta.
- Vertical segment → horizontal delta.

The offset creates the minimum two bends needed to reconnect to neighbors.
The resulting interior points are normalized and stored as `waypoints`. If the
offset normalizes back to no bends, `waypoints` is cleared and the connector
returns to automatic routing.

### Keyboard Deletion

When a connector is selected, `Delete` or `Backspace` removes it via the
existing `removeShape` action. Deletion is ignored while editing text.

## Auto-Reflow

Connector routes are derived from shape positions and stored waypoints. No
additional store action is needed when a shape moves; the connector re-renders
with the new source/target positions while waypoints remain fixed in world
space.

## Data Flow

1. User drags to create a connector.
2. `Canvas` creates a `ConnectorShape` and calls `addShape`.
3. `BoardConnector` reads the shape and connected shapes, computes the route,
   and renders.
4. User clicks the connector to select it.
5. `BoardConnectorHandles` derives endpoint and segment targets.
6. During a drag, preview callbacks update `Canvas` state only.
7. On drag end, `Canvas` resolves the drop target and calls `updateShape` once.
8. The command system records one undoable update.

## Error Handling and Edge Cases

- Missing source or target shape renders nothing.
- Overlapping shapes fall back to a direct line.
- Endpoint drops on empty canvas or the same shape cancel without state change.
- Self-connections are rejected.
- Very short segments do not render overlapping handles.
- Connector tool pointer events do not interfere with shape selection or
canvas panning.
- Existing connectors migrate gracefully with nearest-edge anchors.

## Testing

### Geometry Unit Tests (`boardConnectorGeometry.test.ts`)

- Nearest edge is chosen based on pointer/target direction.
- Orthogonal route without waypoints has only horizontal and vertical segments.
- Routes pass through persisted waypoints.
- Moving a shape changes derived endpoint sections but not stored waypoints.
- Duplicate and collinear points are removed.
- Segment offset creates the expected bends.
- Parallel segment movement produces no change.

### Component Tests (`BoardConnector.test.tsx`)

- Renders visible line and arrowhead.
- Renders transparent hit path.
- Clicking hit path calls `onSelect`.
- Renders handles when selected.
- Unselected connector renders no handles.
- Renders preview points when supplied.

### Canvas Integration Tests (`Canvas.test.tsx`)

- Dragging from one shape to another creates a connector.
- Dragging from a shape to empty canvas does not create a connector.
- Dragging an endpoint onto another shape reconnects it.
- Dragging a segment offsets the route and persists waypoints.
- `Delete` removes the selected connector.
- Moving a connected shape reflows the route.

### Existing Tests

Update or remove tests that assert the old straight-line connector behavior
and creation model.

## Out of Scope

- Curved or freehand connectors.
- Obstacle avoidance around unrelated shapes.
- Labels on connectors.
- Floating connector toolbar or context menu.
- Multi-selection of connectors.
- Connecting to line or text shapes.

## Open Questions

None. All design sections were reviewed and approved.
