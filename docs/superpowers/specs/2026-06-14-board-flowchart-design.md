# Board Page Flowchart Editor Refactor — Design

## 1. Scope & Success Criteria

Rebuild the existing board page so it behaves as a focused flowchart editor for software engineers, while keeping the existing Vite + React + Konva + Zustand + IndexedDB stack.

**In scope:**
- Replace generic shape model with a flowchart-native **node/edge graph model**.
- First-class flowchart symbols: terminal, process, decision, data, plus an expandable palette of advanced/BPMN shapes.
- Orthogonal (right-angle) connectors with arrowheads, port-to-port or port-to-node creation.
- Snap-to-grid + smart alignment guides.
- Click-tool → click-canvas shape placement that auto-switches back to Select.
- Inline label editing, node/edge properties panel, and keyboard shortcuts.
- Undo/redo via command pattern.
- Local persistence to IndexedDB.

**Out of scope:**
- Real-time collaboration.
- Export to PNG/SVG/PDF.
- User accounts or backend.
- Full BPMN semantics (pools, lanes, sequence/message flows).
- Auto-layout engine.
- Backward-compatible rendering of legacy generic-shape boards.

**Success criteria:**
A user can open a board and, within a few clicks, build a readable software flowchart with connected nodes, edit labels, align nodes, undo mistakes, and return to the board later with the diagram intact.

## 2. Architecture

The refactor keeps the current UI stack but replaces the editor's data model and canvas rendering layer.

```
┌─────────────────────────────────────────────────────┐
│  UI Chrome                                          │
│  TopBar · LeftToolbar · SymbolPalette ·             │
│  PropertiesPanel                                    │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│  FlowchartCanvas (React-Konva Stage)                │
│  GridBackground · EdgeLayer · NodeLayer ·           │
│  DraftLayer · InteractionLayer                      │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│  FlowchartStore (Zustand)                           │
│  nodes: Record<string, FlowchartNode>               │
│  edges: Record<string, FlowchartEdge>               │
│  selection · viewport · undoStack · redoStack       │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│  Utilities                                          │
│  OrthogonalRouter · SnapEngine · PortGeometry ·     │
│  CommandFactory                                     │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│  Persistence (boardStore + IndexedDB)               │
└─────────────────────────────────────────────────────┘
```

**Key decisions:**
- Nodes and edges are stored as separate normalized records instead of a single `Shape` union.
- Edges are semantic references (`fromNodeId`, `toNodeId`, `fromPort`, `toPort`); the orthogonal router computes absolute path points at render time.
- Canvas layers are isolated: grid → edges → nodes → draft previews → interaction handles.
- Undo/redo remains command-based, with commands for adding/removing/moving/updating nodes and edges.

## 3. Data Model

```ts
// types/flowchart.ts

type FlowchartNodeType =
  // Basic toolbar
  | 'terminal'
  | 'process'
  | 'decision'
  | 'data'
  // Advanced palette
  | 'delay'
  | 'preparation'
  | 'display'
  | 'manualInput'
  | 'document'
  | 'storedData'
  | 'merge'
  | 'offPage'
  // BPMN palette
  | 'startEvent'
  | 'task'
  | 'gateway'
  | 'dataObject';

type PortId = 'top' | 'right' | 'bottom' | 'left';

interface FlowchartNode {
  id: string;
  type: FlowchartNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  label?: string;
  style: NodeStyle;
}

interface FlowchartEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort: PortId;
  toPort: PortId;
  label?: string;
  style: EdgeStyle;
}

type Selection =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | null;

interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  textColor?: string;
}

interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  arrowhead?: 'arrow' | 'open' | 'none';
}
```

- Nodes expose four logical ports (`top`, `right`, `bottom`, `left`).
- Default edge routing picks the two closest ports, but users can override via drag handles or the properties panel.
- The router adds an 8 px margin around each node so orthogonal lines do not clip corners.

### Default node sizes

| Node type | Default width | Default height |
| --- | --- | --- |
| Terminal | 120 px | 60 px |
| Process | 140 px | 80 px |
| Decision | 120 px | 120 px |
| Data | 140 px | 80 px |
| Other advanced/BPMN | 120 px | 80 px |

## 4. Components & UX Flow

### 4.1 Left Toolbar

A vertical rail with the most-used symbols:

1. **Select** (`V`)
2. **Process** (`P`) — rectangle
3. **Decision** (`D`) — diamond
4. **Data** (`I`) — parallelogram
5. **Terminal** (`T`) — pill
6. **Connector** (`K`) — arrow
7. **More symbols** — opens the expandable palette

Active tool is highlighted. Pressing `Esc` or `V` returns to Select.

### 4.2 Symbol Palette

A popover/panel opened from the toolbar that groups advanced symbols:

- **Advanced flowchart:** delay, preparation, display, manual input, document, stored data, merge, off-page.
- **BPMN:** start event, task, gateway, data object.

Selecting a symbol from the palette enters the same placement mode as a primary toolbar tool.

### 4.3 Creation Flow

1. User clicks a node tool.
2. Cursor changes to crosshair; a ghost preview follows the pointer.
3. User clicks the canvas.
4. Shape is dropped at the snapped position with a default size appropriate to the type.
5. Tool automatically switches back to **Select** and the new node is selected.
6. User can press any letter key to enter label-edit mode, or double-click the node later.

### 4.4 Connecting Nodes

1. Hover over a node to reveal port handles at the midpoint of each side.
2. Drag from a port onto another node or port.
3. Orthogonal router previews the path while dragging.
4. Release on a node to create an edge with closest ports; release on empty canvas to cancel.
5. Selected edges show mid-point label handle and port handles at both ends.

### 4.5 Top Bar

The top bar retains high-frequency actions that should always be visible:

- Back to boards list.
- Board name.
- Undo / redo.
- Delete selected.
- Zoom in / out / fit-to-content.

### 4.6 Right Properties Panel

Context-aware panel shown on the right side:

- **Node selected:** label, font size, fill, stroke, stroke width, width/height, rotation.
- **Edge selected:** label, line style (solid/dashed), width, color, arrowhead style, source/target port pickers.
- **Nothing selected:** grid toggle, snap toggle/strength, theme, and canvas-level zoom/fit controls.

### 4.6 Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `V` | Select tool |
| `P` | Process tool |
| `D` | Decision tool |
| `I` | Data tool |
| `T` | Terminal tool |
| `K` | Connector tool |
| `Esc` | Cancel current tool/draft, return to Select |
| `Delete` / `Backspace` | Delete selected node(s) or edge |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Space + drag` | Pan canvas |
| `+` / `-` | Zoom in/out |
| `0` | Fit canvas to content |

### 4.7 Minimap

The existing minimap is adapted to render the node/edge graph. It shows all nodes as simplified rectangles, edges as thin lines, and a viewport rectangle. Clicking or dragging the minimap pans the main canvas.

## 5. Data Flow

### 5.1 Drop a Process Node

1. Canvas pointer handler detects a click while the tool is `process`.
2. Snap engine rounds the pointer position to the grid and computes smart-guide offsets.
3. Command factory builds an `AddNodeCommand`.
4. `FlowchartStore.execute(command)` applies the command, pushes it onto the undo stack, and notifies subscribers.
5. Persistence effect serializes `nodes` + `edges` to IndexedDB.
6. React re-renders the `NodeLayer` with the new node.
7. Store switches the active tool to `select` and sets `selection` to the new node id.

### 5.2 Move a Node

1. User drags a node; Konva emits intermediate positions during drag.
2. For performance, the node is translated directly on the canvas; dependent edges recompute each frame via the router.
3. On `dragend`, a `MoveNodeCommand` is executed to commit the final position to the store and push the undo stack.
4. Persistence effect saves the updated graph.

### 5.3 Create an Edge

1. User drags from a port handle.
2. Canvas tracks source `nodeId`/`portId` and the current pointer position.
3. During drag, `DraftEdgeLayer` renders an orthogonal preview to the snapped pointer.
4. On release over a target node, `AddEdgeCommand` is executed with the resolved ports.
5. Invalid edges (self-connect, duplicate identical edge) are rejected at the store level.

## 6. Orthogonal Routing

- Router input: source node + port, target node + port, margin.
- Router output: array of points `[x1,y1, x2,y2, ..., xn,yn]` describing the orthogonal polyline.
- Algorithm outline:
  1. Start at the source port, exit perpendicular to the node edge by the margin distance.
  2. Compute a Manhattan path toward the target using minimal bends.
  3. Enter the target port perpendicularly.
  4. If nodes overlap or no clean path exists, fall back to a straight line between port centers.
- Edge rendering uses a Konva `Line` with an arrowhead marker at the target end.

## 7. Error Handling

**Prevented at the store level:**
- Self-connecting edges (`fromNodeId === toNodeId`).
- Duplicate edges between the same ports.
- Creating edges with missing source or target nodes.
- Moving nodes to non-finite coordinates.

**Recovered gracefully:**
- Deleting a node also deletes all attached edges (cascading command).
- Router failure falls back to a straight line and logs a warning.
- IndexedDB save failure keeps the in-memory session alive and shows a non-blocking warning.
- Loading a legacy generic-shape board renders existing data as-is but editing may not preserve old shapes; a one-time warning is shown.
- Edges referencing a missing port default to the nearest valid port.

## 8. Testing

- **Unit tests (Vitest):**
  - Orthogonal router for all 16 port-to-port combinations.
  - Snap engine (grid + smart guides).
  - Port geometry for every node type.
  - Command apply/undo for nodes and edges.
- **Store tests:**
  - Add/remove/move/resize node.
  - Add/remove edge and cascading edge deletion.
  - Undo/redo sequences with mixed node and edge commands.
- **Component tests (React Testing Library):**
  - Toolbar tool switching and active state.
  - Symbol palette open/close and symbol selection.
  - Properties panel updates when selection changes.
- **Integration tests:**
  - Drop two nodes, connect them, move one, assert the edge path updates.
  - Create → undo → redo roundtrip.
- **Visual regression:**
  - A sample flowchart renders identically in light and dark themes.

## 9. File Structure

```
src/
  pages/
    BoardPage.tsx
  components/
    flowchart/
      FlowchartCanvas.tsx
      GridBackground.tsx
      NodeLayer.tsx
      EdgeLayer.tsx
      DraftLayer.tsx
      InteractionLayer.tsx
      NodeRenderer.tsx
      EdgeRenderer.tsx
      PortHandles.tsx
      SelectionHandles.tsx
      LeftToolbar.tsx
      SymbolPalette.tsx
      TopBar.tsx
      PropertiesPanel.tsx
      LabelEditor.tsx
  store/
    flowchartStore.ts
    boardStore.ts
  types/
    flowchart.ts
  utils/
    orthogonalRouter.ts
    snapEngine.ts
    portGeometry.ts
    commands.ts
    geometry.ts
  hooks/
    useFlowchartHotkeys.ts
```

## 10. Legacy & Migration

This refactor treats the board as a fresh flowchart editor. Existing boards created with the generic shape model may render incorrectly and are not migrated. The first time a legacy board is opened, the user sees a warning that the editor now focuses on flowcharts and that old shapes may not be editable. A board is treated as legacy if its persisted data contains the old `Shape` union fields (e.g., `type: 'rect' | 'circle'`). New boards use the node/edge model exclusively.

## 11. Future Work

- Export to PNG/SVG and graph formats (JSON, DOT).
- Multi-select, grouping, and alignment/distribution tools.
- Auto-layout engine for tidy flowchart arrangement.
- Collaborative cursors and real-time editing.
- Swimlanes/pools for BPMN-style diagrams.
- Custom symbol definitions.
