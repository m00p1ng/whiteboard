# Diagram Editor Design

## 1. Scope & Success Criteria

Build a single-user, in-browser diagram editor similar to Miro/draw.io, focused on drawing first.

**In scope for first version:**
- Add rectangles, circles, lines, and text to an infinite canvas (pannable and zoomable, with no fixed boundaries).
- Connectors that snap between shapes and move with them.
- Select, drag, resize, rotate, and delete shapes.
- Pan and zoom the canvas.
- Undo/redo with keyboard shortcuts.
- Tool palette and basic keyboard shortcuts.

**Out of scope for first version:**
- Real-time collaboration.
- Save/export/share.
- User accounts or backend.
- Multi-select or alignment guides.
- Freehand drawing.

**Success criteria:**
A user can open the app and, within a few clicks, create a simple diagram with connected shapes, edit it, and undo mistakes.

## 2. Architecture

- **Build tool:** Vite for fast dev server and modern tooling.
- **Framework:** React 18 with TypeScript.
- **Renderer:** React-Konva for 2D canvas rendering and built-in shape interactions.
- **Component library:** shadcn/ui for UI chrome (toolbar, buttons, panels, tooltips).
- **State management:** Zustand for global editor state.
- **History:** Command pattern storing inverse commands in a stack for undo/redo.
- **Styling:** Tailwind CSS + shadcn/ui for the chrome and inline/Konva styles for canvas shapes.

## 3. Data Model

```ts
type Shape = RectShape | CircleShape | LineShape | TextShape | ConnectorShape;

interface BaseShape {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'text' | 'connector';
  x: number;
  y: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

interface RectShape extends BaseShape {
  type: 'rect';
  width: number;
  height: number;
}

interface CircleShape extends BaseShape {
  type: 'circle';
  radius: number;
}

interface LineShape extends BaseShape {
  type: 'line';
  points: [number, number, number, number]; // x1, y1, x2, y2
}

interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
}

interface ConnectorShape extends BaseShape {
  type: 'connector';
  fromId: string;
  toId: string;
  fromAnchor?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  toAnchor?: 'top' | 'right' | 'bottom' | 'left' | 'center';
}
```

- All shapes are stored in a normalized `Record<string, Shape>` map in Zustand.
- Selection is stored as `selectedId: string | null`.
- Viewport is stored as `{ scale: number; offsetX: number; offsetY: number }`.
- Connector geometry is derived from the attached shapes; connectors do not store absolute endpoints.

## 4. Components

- **`App`** — Layout shell. Holds the toolbar and the canvas area.
- **`Toolbar`** — Vertical or horizontal toolbar built with shadcn/ui `Button`, `ToggleGroup`, and `Separator` components. Contains tool buttons and undo/redo/delete actions.
- **`Canvas`** — Konva `Stage` with pan/zoom transforms. Contains a `Layer` that renders all shapes.
- **`ShapeRenderer`** — Maps a `Shape` to the correct Konva component (`Rect`, `Circle`, `Line`, `Text`, or `Connector`).
- **`Connector`** — Custom Konva component that watches `fromId` and `toId` shapes and redraws its path when they move.
- **`SelectionTransformer`** — Wraps the selected shape with a Konva `Transformer` for resize and rotate handles.
- **`HotkeyManager`** — Global keyboard listener for shortcuts (delete, undo, redo, tool switching).
- **`TextEditor`** — Inline HTML input overlay for editing text shapes.

## 5. Data Flow

1. User selects a tool from `Toolbar` → tool mode is stored in Zustand.
2. User clicks on the canvas in creation mode → a new shape is added to the store.
3. User clicks a shape in select mode → `selectedId` is updated.
4. User drags a shape → Konva `onDragEnd` emits the new position, which is committed to the store.
5. Connector shapes subscribe to attached shape positions and recalculate their paths on every render.
6. User resizes/rotates a shape via the transformer → transformer events update the shape in the store.
7. Every mutation creates an inverse command and pushes it onto the undo stack.
8. Undo pops the last command and applies its inverse; redo stores the reversed command.
9. Pan/zoom updates the viewport store, and the Konva `Stage` scale/position follows it.

## 6. Connectors

- Connectors are created by selecting the connector tool, clicking a source shape, and clicking a target shape.
- Lines are created by selecting the line tool and clicking twice on the canvas (start point and end point).
- Snap endpoints to shape anchor points: top, right, bottom, left, center.
- Default anchor is `center` for the first version.
- When a connected shape moves, the connector path recalculates.
- If a connected shape is deleted, the connector is also deleted.

## 7. Error Handling

- Guard against applying undo/redo when the stack is empty.
- Prevent deleting shapes while a transformer is actively dragging.
- Commit or cancel text editing on blur and `Escape`.
- Ensure connector endpoints always resolve to valid shapes; invalid connectors are removed.
- Clamp shape coordinates to finite numbers to avoid NaN rendering errors.

## 8. Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `V` | Select tool |
| `R` | Rectangle tool |
| `C` | Circle tool |
| `L` | Line tool |
| `T` | Text tool |
| `Shift + L` or `Cmd/Ctrl + L` | Connector tool |
| `Delete` / `Backspace` | Delete selected shape |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Space + drag` | Pan canvas |
| `Cmd/Ctrl + +` / `-` | Zoom in/out |

## 9. Testing

- **Unit tests (Vitest):** geometry helpers, command inverse generation, connector path calculation.
- **Component tests (React Testing Library):** toolbar state changes, tool selection, hotkey dispatch.
- **Smoke test:** the app mounts and renders an empty canvas without errors.

## 10. File Structure

```
src/
  App.tsx
  components/
    Canvas.tsx
    Toolbar.tsx
    ShapeRenderer.tsx
    Connector.tsx
    SelectionTransformer.tsx
    TextEditor.tsx
  store/
    editorStore.ts
    historyStore.ts
  types/
    shape.ts
  utils/
    geometry.ts
    commands.ts
  hooks/
    useHotkeys.ts
```

## 11. Future Work

- Save/load diagrams to localStorage or a backend.
- Export to PNG/SVG/PDF.
- Multi-select and alignment/distribution tools.
- Freehand pen tool.
- Real-time collaboration.
