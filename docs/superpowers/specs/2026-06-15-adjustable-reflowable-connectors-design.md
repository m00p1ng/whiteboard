# Adjustable Reflowable Connectors Design

## Goal

Allow users to select a flowchart connector, reshape its orthogonal route, and
reconnect either endpoint while keeping the connector attached to its nodes.
Users can remove a selected connector with `Delete` or `Backspace`.

## Scope

This feature adds:

- bend handles for manually shaping a selected connector;
- segment dragging to introduce a new offset into a straight route;
- endpoint handles for reconnecting an edge to a visible node port;
- fixed canvas-space manual waypoints that survive node movement;
- automatic removal of duplicate and collinear path points;
- keyboard deletion through the existing undoable edge removal command; and
- undo and redo for connector geometry and endpoint changes.

A visible delete button or floating connector toolbar is not included.

## Edge Data

Extend `FlowchartEdge` with an optional waypoint list:

```ts
interface Point {
  x: number;
  y: number;
}

interface FlowchartEdge {
  // Existing fields remain unchanged.
  waypoints?: Point[];
}
```

Waypoints are stored in world coordinates. Existing persisted edges require no
migration because a missing or empty `waypoints` list continues to use the
current automatic orthogonal route.

Only user-controlled interior geometry is persisted. Computed port positions,
port exit points, and the complete rendered point list remain derived data.

## Routing

### Automatic Edges

Edges without manual waypoints use the existing `computeOrthogonalPath`
behavior.

### Edited Edges

An edited edge is routed in this order:

1. current source port;
2. a short source exit perpendicular to that port;
3. the stored manual waypoints;
4. a short target entry perpendicular to the target port; and
5. current target port.

The router inserts the minimum orthogonal transitions needed between these
anchors. Manual waypoints stay at their absolute world positions when either
node moves, while the source and target sections recompute from the current
port locations.

If overlapping nodes or invalid geometry prevents a clean orthogonal route,
the router keeps the stored waypoints and uses the shortest valid orthogonal
connection it can produce between adjacent anchors. It must always return a
renderable path and must not discard user waypoints silently.

### Path Normalization

A shared normalization helper processes routes after waypoint, segment, or
endpoint edits. It:

- removes consecutive duplicate points;
- removes an interior point when it is collinear with its neighbors;
- repeats simplification until no redundant points remain; and
- preserves the source and target endpoints.

This makes consecutive bends on the same horizontal or vertical line render
as one straight segment.

## Selection And Hit Testing

Clicking or tapping a connector selects it without allowing the event to reach
the canvas. The visible stroke remains unchanged except for the existing
selected color.

`EdgeRenderer` adds a transparent, wider hit path above the visible arrow so
thin connectors are practical to select. The hit path follows the complete
rendered route and does not alter connector appearance.

Handles render only for the selected edge.

## Bend Editing

Each interior bend in the rendered route is shown as a draggable handle. For
an automatic edge, starting the first bend drag converts the rendered interior
bends into candidate manual waypoints. Only the dragged result is persisted;
canceling the drag leaves the edge automatic.

During a bend drag:

1. pointer movement is converted to world coordinates;
2. the affected waypoint is updated in a local preview;
3. adjacent sections remain horizontal or vertical;
4. the route is normalized for rendering; and
5. one undoable edge update is committed when the drag ends.

Live drag updates must not create one undo command per pointer movement.

## Segment Dragging

Each interior route segment has an expanded invisible drag target. For an
automatic edge, starting the first segment drag converts the rendered interior
route into candidate manual waypoints before applying the offset.

Dragging a segment perpendicular to its orientation offsets that section:

- dragging a horizontal segment changes its vertical position;
- dragging a vertical segment changes its horizontal position; and
- the operation creates the minimum two bends needed to connect the offset
  segment to its neighbors.

Dragging parallel to the segment has no routing effect. The resulting manual
waypoints are normalized before commit, so overlapping or collinear bends are
collapsed.

End segments immediately adjacent to a node port are not segment-draggable.
Endpoint handles own those sections and avoid conflicting interactions.

## Endpoint Reconnection

The selected edge displays source and target endpoint handles at their current
ports.

Dragging an endpoint:

1. keeps the opposite endpoint and manual waypoints fixed;
2. previews an orthogonal route to the pointer;
3. highlights a valid port under the pointer; and
4. commits only when dropped on one of a node's four visible ports.

A drop on empty canvas or outside a port cancels and restores the edge.
Self-connections and duplicate edges with the same source node, source port,
target node, and target port remain invalid.

Reconnecting the source updates `fromNodeId` and `fromPort`. Reconnecting the
target updates `toNodeId` and `toPort`. Existing manual waypoints are retained
and the endpoint section is reflowed to them.

## Deletion

When an edge is selected, `Delete` or `Backspace` calls the existing
`removeEdge` action. Removal remains undoable and clears selection.

Keyboard deletion must not run while focus is in an input, textarea, or other
editable control.

## Component Boundaries

### `orthogonalRouter`

- Route through optional world-space waypoints.
- Normalize duplicate and collinear points.
- Provide route metadata needed to map rendered bends and segments back to
  editable waypoint operations.

### `EdgeRenderer`

- Draw the visible arrow and label.
- Draw the transparent selection hit path.
- Keep rendering independent from drag state.

### `EdgeHandles`

A new component that:

- renders bend, segment, and endpoint interaction targets;
- maintains live preview geometry during a drag;
- reports one completed geometry or endpoint update to the canvas; and
- exposes callbacks rather than accessing the store directly.

### `FlowchartCanvas`

- Renders `EdgeHandles` for the selected edge.
- Converts pointer positions to world coordinates.
- Resolves endpoint drop targets from visible node ports.
- Supplies live preview state to the selected edge.
- Commits completed edits through store actions.

### `flowchartStore`

- Uses the existing undoable `updateEdge` command for waypoint and endpoint
  changes.
- Rejects self-connections and duplicate endpoint combinations before commit.
- Uses the existing `removeEdge` command for keyboard deletion.

## Data Flow

1. The user selects an edge.
2. The canvas computes the current rendered route.
3. `EdgeHandles` derives bend, segment, and endpoint targets from that route.
4. A drag updates local preview state only.
5. The renderer displays the preview route while dragging.
6. Drag completion normalizes the waypoints and requests one store update.
7. The store records one undoable command and persistence saves the updated
   graph through the existing board subscription.

## Error Handling And Edge Cases

- Missing source or target nodes continue to make an edge non-renderable.
- Invalid endpoint drops cancel without changing state or adding undo history.
- A drag that normalizes back to the original waypoints is a no-op.
- Canceling the first edit of an automatic edge does not create `waypoints`.
- Routes with no remaining manual bends return to automatic routing by
  removing or emptying `waypoints`.
- Node movement does not mutate stored waypoints.
- Very short segments do not render overlapping segment and bend targets.
- Pointer and touch events cancel bubbling so edge editing does not pan or
  deselect the canvas.
- Labels continue to use a computed route midpoint and move with the edited
  path.

## Testing

### Router Unit Tests

- Existing edges without waypoints preserve current route output.
- Routes pass through manual waypoints.
- Moving a node changes only derived endpoint sections, not stored waypoints.
- Duplicate points are removed.
- Horizontal and vertical collinear points collapse.
- Repeated normalization reaches a stable result.
- Edited routes remain orthogonal.

### Store Tests

- Waypoint updates are undoable and redoable.
- Source and target reconnections update the correct edge fields.
- Self-connections are rejected.
- Duplicate endpoint combinations are rejected.
- Invalid updates do not add undo history.
- Edge deletion clears selection and is undoable.

### Component Tests

- A selected edge renders bend, segment, and endpoint handles.
- An unselected edge renders no handles.
- The transparent hit path selects the edge.
- Bend dragging previews and commits one normalized update.
- Segment dragging creates the minimum offset bends.
- Endpoint drops on valid ports commit.
- Endpoint drops elsewhere cancel.
- Drag events do not reach the canvas.

### Canvas And Hotkey Tests

- Moving a connected node reflows an edited connector while preserving its
  waypoints.
- `Delete` and `Backspace` remove a selected edge.
- Deletion is ignored while editing text.
- Undo and redo restore connector edits and deletion.

## Out Of Scope

- A visible delete button or connector toolbar.
- Free-angle or curved connectors.
- Dragging endpoints to empty canvas.
- Arbitrary ports beyond the existing top, right, bottom, and left ports.
- Automatic obstacle avoidance around unrelated nodes.
- Multi-edge or multi-node selection.
