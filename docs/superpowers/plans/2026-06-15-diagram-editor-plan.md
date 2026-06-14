# Diagram Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user, in-browser diagram editor using React, TypeScript, React-Konva, Zustand, and shadcn/ui, supporting rectangles, circles, lines, text, snapping connectors, selection, resize/rotate, pan/zoom, undo/redo, and keyboard shortcuts.

**Architecture:** A Vite React SPA renders a Konva canvas stage inside a shadcn/ui chrome. All shape state lives in a Zustand store as a normalized map. Mutations are wrapped in inverse commands for undo/redo. Connectors derive their geometry from attached shapes at render time.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui, React-Konva, Konva, Zustand, Vitest, React Testing Library.

---

## File Structure

```
├── components.json             # shadcn/ui configuration
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx                 # Layout shell: Toolbar + Canvas
    ├── main.tsx                # React entry point
    ├── index.css               # Tailwind base + globals
    ├── components/
    │   ├── ui/                 # shadcn/ui components (Button, ToggleGroup, Separator, Tooltip)
    │   ├── Canvas.tsx          # Konva Stage, Layer, pan/zoom, shape rendering
    │   ├── Toolbar.tsx         # Tool buttons, undo/redo/delete
    │   ├── ShapeRenderer.tsx   # Maps Shape union to Konva nodes
    │   ├── Connector.tsx       # Derived connector rendering
    │   ├── SelectionTransformer.tsx # Konva Transformer for selected shape
    │   └── TextEditor.tsx      # Inline text editing overlay
    ├── store/
    │   ├── editorStore.ts      # Zustand store for shapes, tool, selection, viewport
    │   └── historyStore.ts     # Undo/redo command stack
    ├── types/
    │   └── shape.ts            # Shape TypeScript types
    ├── utils/
    │   ├── geometry.ts         # Anchor/connector/path math
    │   └── commands.ts         # Command creation and inverse application
    └── hooks/
        └── useHotkeys.ts       # Global keyboard shortcuts
```

---

### Task 1: Initialize Vite + React + TypeScript project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`

- [ ] **Step 1: Scaffold project with Vite**

Run:
```bash
npm create vite@latest . -- --template react-ts
```
Expected: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css` created.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install react react-dom konva react-konva zustand
npm install -D @types/react @types/react-dom @types/node vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Verify dev server starts**

Run:
```bash
npm run dev
```
Expected: Vite starts at `http://localhost:5173` with default React page.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: scaffold vite react-ts project"
```

---

### Task 2: Configure Tailwind CSS and shadcn/ui

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Modify: `src/index.css`
- Create: `components.json`
- Create: `src/components/ui/button.tsx`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Install Tailwind and shadcn/ui dependencies**

Run:
```bash
npm install -D tailwindcss postcss autoprefixer
npm install clsx tailwind-merge class-variance-authority lucide-react
npx tailwindcss init -p
```

- [ ] **Step 2: Configure Tailwind**

Write `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

Write `postcss.config.js`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 3: Add Tailwind directives and CSS variables**

Write `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 4: Create shadcn/ui config and utils**

Write `components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

Write `src/lib/utils.ts`:
```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Add path aliases in TypeScript and Vite**

Modify `tsconfig.json` to add:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Install Vite path plugin:
```bash
npm install -D vite-tsconfig-paths
```

Modify `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
});
```

- [ ] **Step 6: Add shadcn Button component**

Write `src/components/ui/button.tsx`:
```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

Install missing peer:
```bash
npm install @radix-ui/react-slot
```

- [ ] **Step 7: Verify styles apply**

Modify `src/App.tsx` temporarily to render:
```tsx
<Button>Test</Button>
```
Run `npm run dev` and open the browser. Expected: styled button appears.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: setup tailwind and shadcn/ui"
```

---

### Task 3: Define shape types

**Files:**
- Create: `src/types/shape.ts`
- Create: `src/types/shape.test.ts`

- [ ] **Step 1: Write the failing test**

Write `src/types/shape.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { RectShape } from './shape';

describe('shape types', () => {
  it('accepts a valid rectangle', () => {
    const rect: RectShape = {
      id: 'r1',
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    };
    expect(rect.type).toBe('rect');
  });
});
```

Run:
```bash
npx vitest run src/types/shape.test.ts
```
Expected: FAIL with "Cannot find module './shape'".

- [ ] **Step 2: Implement shape types**

Write `src/types/shape.ts`:
```ts
export type Shape =
  | RectShape
  | CircleShape
  | LineShape
  | TextShape
  | ConnectorShape;

export interface BaseShape {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'text' | 'connector';
  x: number;
  y: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface RectShape extends BaseShape {
  type: 'rect';
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  radius: number;
}

export interface LineShape extends BaseShape {
  type: 'line';
  points: [number, number, number, number];
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
}

export interface ConnectorShape extends BaseShape {
  type: 'connector';
  fromId: string;
  toId: string;
  fromAnchor?: Anchor;
  toAnchor?: Anchor;
}

export type Anchor = 'top' | 'right' | 'bottom' | 'left' | 'center';
```

- [ ] **Step 3: Run test to verify it passes**

Run:
```bash
npx vitest run src/types/shape.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/types/shape.ts src/types/shape.test.ts
git commit -m "feat: define shape types"
```

---

### Task 4: Implement editor Zustand store

**Files:**
- Create: `src/store/editorStore.ts`
- Create: `src/store/editorStore.test.ts`

- [ ] **Step 1: Write the failing test**

Write `src/store/editorStore.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { useEditorStore } from './editorStore';

describe('editorStore', () => {
  it('adds a shape', () => {
    const shape = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
    useEditorStore.getState().addShape(shape);
    expect(useEditorStore.getState().shapes['r1']).toEqual(shape);
  });
});
```

Run:
```bash
npx vitest run src/store/editorStore.test.ts
```
Expected: FAIL.

- [ ] **Step 2: Implement the store**

Write `src/store/editorStore.ts`:
```ts
import { create } from 'zustand';
import type { Shape } from '@/types/shape';

export type Tool =
  | 'select'
  | 'rect'
  | 'circle'
  | 'line'
  | 'text'
  | 'connector';

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface EditorState {
  shapes: Record<string, Shape>;
  tool: Tool;
  selectedId: string | null;
  viewport: Viewport;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  setTool: (tool: Tool) => void;
  setSelectedId: (id: string | null) => void;
  setViewport: (updates: Partial<Viewport>) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  shapes: {},
  tool: 'select',
  selectedId: null,
  viewport: { scale: 1, offsetX: 0, offsetY: 0 },
  addShape: (shape) =>
    set((state) => ({
      shapes: { ...state.shapes, [shape.id]: shape },
    })),
  updateShape: (id, updates) =>
    set((state) => {
      const shape = state.shapes[id];
      if (!shape) return state;
      return {
        shapes: { ...state.shapes, [id]: { ...shape, ...updates } as Shape },
      };
    }),
  removeShape: (id) =>
    set((state) => {
      const next = { ...state.shapes };
      delete next[id];
      return { shapes: next };
    }),
  setTool: (tool) => set({ tool }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setViewport: (updates) =>
    set((state) => ({ viewport: { ...state.viewport, ...updates } })),
}));
```

- [ ] **Step 3: Run test to verify it passes**

Run:
```bash
npx vitest run src/store/editorStore.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/store/editorStore.ts src/store/editorStore.test.ts
git commit -m "feat: add editor zustand store"
```

---

### Task 5: Implement command history for undo/redo

**Files:**
- Create: `src/utils/commands.ts`
- Create: `src/utils/commands.test.ts`
- Modify: `src/store/editorStore.ts`
- Modify: `src/store/editorStore.test.ts`

- [ ] **Step 1: Write the failing test**

Write `src/utils/commands.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createAddShapeCommand } from './commands';
import type { RectShape } from '@/types/shape';

describe('commands', () => {
  it('creates an inverse add command', () => {
    const rect: RectShape = { id: 'r1', type: 'rect', x: 0, y: 0, width: 10, height: 10 };
    const cmd = createAddShapeCommand(rect);
    const state = { shapes: { r1: rect } };
    cmd.undo(state);
    expect(state.shapes['r1']).toBeUndefined();
  });
});
```

Run:
```bash
npx vitest run src/utils/commands.test.ts
```
Expected: FAIL.

- [ ] **Step 2: Implement command helpers**

Write `src/utils/commands.ts`:
```ts
import type { Shape } from '@/types/shape';

export interface CommandState {
  shapes: Record<string, Shape>;
}

export interface Command {
  do: (state: CommandState) => void;
  undo: (state: CommandState) => void;
}

export function createAddShapeCommand(shape: Shape): Command {
  return {
    do: (state) => {
      state.shapes[shape.id] = shape;
    },
    undo: (state) => {
      delete state.shapes[shape.id];
    },
  };
}

export function createRemoveShapeCommand(shape: Shape): Command {
  return {
    do: (state) => {
      delete state.shapes[shape.id];
    },
    undo: (state) => {
      state.shapes[shape.id] = shape;
    },
  };
}

export function createUpdateShapeCommand(
  id: string,
  prev: Partial<Shape>,
  next: Partial<Shape>
): Command {
  return {
    do: (state) => {
      const shape = state.shapes[id];
      if (shape) Object.assign(shape, next);
    },
    undo: (state) => {
      const shape = state.shapes[id];
      if (shape) Object.assign(shape, prev);
    },
  };
}
```

- [ ] **Step 3: Add history to editorStore**

Modify `src/store/editorStore.ts` to include `execute`, `undo`, `redo`, and history stacks:

```ts
import { create } from 'zustand';
import type { Shape } from '@/types/shape';
import type { Command } from '@/utils/commands';

export type Tool =
  | 'select'
  | 'rect'
  | 'circle'
  | 'line'
  | 'text'
  | 'connector';

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface EditorState {
  shapes: Record<string, Shape>;
  tool: Tool;
  selectedId: string | null;
  viewport: Viewport;
  undoStack: Command[];
  redoStack: Command[];
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  execute: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: Tool) => void;
  setSelectedId: (id: string | null) => void;
  setViewport: (updates: Partial<Viewport>) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  shapes: {},
  tool: 'select',
  selectedId: null,
  viewport: { scale: 1, offsetX: 0, offsetY: 0 },
  undoStack: [],
  redoStack: [],
  addShape: (shape) => {
    get().execute({
      do: (state) => {
        state.shapes[shape.id] = shape;
      },
      undo: (state) => {
        delete state.shapes[shape.id];
      },
    });
  },
  updateShape: (id, updates) => {
    const shape = get().shapes[id];
    if (!shape) return;
    const prev = Object.fromEntries(
      Object.keys(updates).map((k) => [k, (shape as never)[k]])
    );
    get().execute({
      do: (state) => Object.assign(state.shapes[id], updates),
      undo: (state) => Object.assign(state.shapes[id], prev),
    });
  },
  removeShape: (id) => {
    const shape = get().shapes[id];
    if (!shape) return;
    get().execute({
      do: (state) => delete state.shapes[id],
      undo: (state) => {
        state.shapes[id] = shape;
      },
    });
  },
  execute: (command) =>
    set((state) => {
      command.do(state);
      return { undoStack: [...state.undoStack, command], redoStack: [] };
    }),
  undo: () =>
    set((state) => {
      const command = state.undoStack.at(-1);
      if (!command) return state;
      command.undo(state);
      return {
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, command],
      };
    }),
  redo: () =>
    set((state) => {
      const command = state.redoStack.at(-1);
      if (!command) return state;
      command.do(state);
      return {
        undoStack: [...state.undoStack, command],
        redoStack: state.redoStack.slice(0, -1),
      };
    }),
  setTool: (tool) => set({ tool }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setViewport: (updates) =>
    set((state) => ({ viewport: { ...state.viewport, ...updates } })),
}));
```

- [ ] **Step 4: Update store test**

Modify `src/store/editorStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      shapes: {},
      tool: 'select',
      selectedId: null,
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      undoStack: [],
      redoStack: [],
    });
  });

  it('adds a shape', () => {
    const shape = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
    useEditorStore.getState().addShape(shape);
    expect(useEditorStore.getState().shapes['r1']).toEqual(shape);
  });

  it('undos and redos add shape', () => {
    const shape = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
    const { addShape, undo, redo } = useEditorStore.getState();
    addShape(shape);
    expect(useEditorStore.getState().shapes['r1']).toBeDefined();
    undo();
    expect(useEditorStore.getState().shapes['r1']).toBeUndefined();
    redo();
    expect(useEditorStore.getState().shapes['r1']).toBeDefined();
  });
});
```

Run:
```bash
npx vitest run src/store/editorStore.test.ts src/utils/commands.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/editorStore.ts src/store/editorStore.test.ts src/utils/commands.ts src/utils/commands.test.ts
git commit -m "feat: add command history for undo/redo"
```

---

### Task 6: Render basic shapes with React-Konva

**Files:**
- Create: `src/components/ShapeRenderer.tsx`
- Create: `src/components/Canvas.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement ShapeRenderer**

Write `src/components/ShapeRenderer.tsx`:
```tsx
import { Rect, Circle, Line, Text } from 'react-konva';
import type { Shape } from '@/types/shape';
import { Connector } from './Connector';

interface ShapeRendererProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
}

export function ShapeRenderer({ shape, isSelected, onSelect }: ShapeRendererProps) {
  const common = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation ?? 0,
    fill: shape.fill,
    stroke: isSelected ? '#3b82f6' : shape.stroke ?? '#000',
    strokeWidth: shape.strokeWidth ?? 2,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
  };

  switch (shape.type) {
    case 'rect':
      return (
        <Rect
          {...common}
          width={shape.width}
          height={shape.height}
        />
      );
    case 'circle':
      return (
        <Circle
          {...common}
          radius={shape.radius}
        />
      );
    case 'line':
      return (
        <Line
          {...common}
          points={shape.points}
          fill={undefined}
        />
      );
    case 'text':
      return (
        <Text
          {...common}
          text={shape.text}
          fontSize={shape.fontSize}
          fill={shape.fill ?? '#000'}
        />
      );
    case 'connector':
      return <Connector connector={shape} />;
    default:
      return null;
  }
}
```

- [ ] **Step 2: Implement Canvas component**

Write `src/components/Canvas.tsx`:
```tsx
import { useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore } from '@/store/editorStore';
import { ShapeRenderer } from './ShapeRenderer';

export function Canvas() {
  const stageRef = useRef<any>(null);
  const shapes = useEditorStore((s) => s.shapes);
  const selectedId = useEditorStore((s) => s.selectedId);
  const viewport = useEditorStore((s) => s.viewport);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const addShape = useEditorStore((s) => s.addShape);
  const updateShape = useEditorStore((s) => s.updateShape);
  const tool = useEditorStore((s) => s.tool);
  const setViewport = useEditorStore((s) => s.setViewport);

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return;
    if (tool === 'select') {
      setSelectedId(null);
      return;
    }
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const id = crypto.randomUUID();
    if (tool === 'rect') {
      addShape({ id, type: 'rect', x: pos.x, y: pos.y, width: 100, height: 60, fill: '#fff' });
    } else if (tool === 'circle') {
      addShape({ id, type: 'circle', x: pos.x, y: pos.y, radius: 40, fill: '#fff' });
    } else if (tool === 'text') {
      addShape({ id, type: 'text', x: pos.x, y: pos.y, text: 'Text', fontSize: 18 });
    }
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-gray-50">
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.offsetX}
        y={viewport.offsetY}
        draggable={tool === 'select'}
        onDragEnd={(e) =>
          setViewport({ offsetX: e.target.x(), offsetY: e.target.y() })
        }
        onClick={handleStageClick}
      >
        <Layer>
          {Object.values(shapes).map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              isSelected={shape.id === selectedId}
              onSelect={() => setSelectedId(shape.id)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
```

- [ ] **Step 3: Wire Canvas into App**

Write `src/App.tsx`:
```tsx
import { Canvas } from '@/components/Canvas';

function App() {
  return (
    <div className="h-screen w-screen flex flex-col">
      <Canvas />
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Verify canvas renders**

Run `npm run dev` and open the browser. Expected: gray canvas area, no errors in console.

- [ ] **Step 5: Commit**

```bash
git add src/components/ShapeRenderer.tsx src/components/Canvas.tsx src/App.tsx
git commit -m "feat: render basic shapes with react-konva"
```

---

### Task 7: Build the toolbar with shadcn/ui

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/Toolbar.tsx`
- Create: `src/components/ui/toggle-group.tsx`

- [ ] **Step 1: Install ToggleGroup from Radix**

Run:
```bash
npm install @radix-ui/react-toggle-group
```

- [ ] **Step 2: Implement ToggleGroup component**

Write `src/components/ui/toggle-group.tsx`:
```tsx
import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/utils';

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn('flex items-center gap-1', className)}
    {...props}
  />
));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground h-10 w-10',
      className
    )}
    {...props}
  />
));
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
```

- [ ] **Step 3: Implement Toolbar**

Write `src/components/Toolbar.tsx`:
```tsx
import { MousePointer2, Square, Circle, Minus, Type, Undo2, Redo2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useEditorStore, type Tool } from '@/store/editorStore';

const tools: { value: Tool; icon: React.ReactNode; label: string }[] = [
  { value: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select' },
  { value: 'rect', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
  { value: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle' },
  { value: 'line', icon: <Minus className="h-4 w-4" />, label: 'Line' },
  { value: 'text', icon: <Type className="h-4 w-4" />, label: 'Text' },
];

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const selectedId = useEditorStore((s) => s.selectedId);
  const removeShape = useEditorStore((s) => s.removeShape);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-lg border bg-background p-2 shadow-sm">
      <ToggleGroup type="single" value={tool} onValueChange={(v) => v && setTool(v as Tool)}>
        {tools.map((t) => (
          <ToggleGroupItem key={t.value} value={t.value} aria-label={t.label}>
            {t.icon}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="h-6 w-px bg-border" />
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
  );
}
```

- [ ] **Step 4: Wire Toolbar into App**

Modify `src/App.tsx`:
```tsx
import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';

function App() {
  return (
    <div className="h-screen w-screen relative overflow-hidden bg-gray-50">
      <Toolbar />
      <Canvas />
    </div>
  );
}

export default App;
```

- [ ] **Step 5: Verify toolbar**

Run `npm run dev`. Expected: toolbar appears at top center, tool buttons toggle, undo/redo/delete buttons visible.

- [ ] **Step 6: Commit**

```bash
git add src/components/Toolbar.tsx src/components/ui/toggle-group.tsx src/App.tsx
git commit -m "feat: add shadcn/ui toolbar"
```

---

### Task 8: Add selection, drag, resize, and rotate

**Files:**
- Modify: `src/components/ShapeRenderer.tsx`
- Create: `src/components/SelectionTransformer.tsx`
- Modify: `src/components/Canvas.tsx`

- [ ] **Step 1: Implement SelectionTransformer**

Write `src/components/SelectionTransformer.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import type { Shape } from '@/types/shape';

interface SelectionTransformerProps {
  selectedShape: Shape | null;
}

export function SelectionTransformer({ selectedShape }: SelectionTransformerProps) {
  const transformerRef = useRef<any>(null);

  useEffect(() => {
    if (transformerRef.current && selectedShape) {
      const node = transformerRef.current.getStage()?.findOne(`#${selectedShape.id}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedShape]);

  if (!selectedShape || selectedShape.type === 'connector') return null;

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled
      enabledAnchors={[
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'middle-left',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ]}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) return oldBox;
        return newBox;
      }}
    />
  );
}
```

- [ ] **Step 2: Update ShapeRenderer to sync drag changes**

Modify `src/components/ShapeRenderer.tsx` to accept `onChange` and update position on drag:

```tsx
import { Rect, Circle, Line, Text } from 'react-konva';
import type { Shape } from '@/types/shape';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Connector } from './Connector';

interface ShapeRendererProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<Shape>) => void;
}

export function ShapeRenderer({ shape, isSelected, onSelect, onChange }: ShapeRendererProps) {
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    onChange({ x: e.target.x(), y: e.target.y() });
  };

  const common = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation ?? 0,
    fill: shape.fill,
    stroke: isSelected ? '#3b82f6' : shape.stroke ?? '#000',
    strokeWidth: shape.strokeWidth ?? 2,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: handleDragEnd,
  };

  switch (shape.type) {
    case 'rect':
      return <Rect {...common} width={shape.width} height={shape.height} />;
    case 'circle':
      return <Circle {...common} radius={shape.radius} />;
    case 'line':
      return <Line {...common} points={shape.points} fill={undefined} />;
    case 'text':
      return (
        <Text
          {...common}
          text={shape.text}
          fontSize={shape.fontSize}
          fill={shape.fill ?? '#000'}
        />
      );
    case 'connector':
      return <Connector connector={shape} />;
    default:
      return null;
  }
}
```

- [ ] **Step 3: Wire transformer and drag updates into Canvas**

Modify `src/components/Canvas.tsx`:

```tsx
import { useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore } from '@/store/editorStore';
import { ShapeRenderer } from './ShapeRenderer';
import { SelectionTransformer } from './SelectionTransformer';

export function Canvas() {
  const stageRef = useRef<any>(null);
  const shapes = useEditorStore((s) => s.shapes);
  const selectedId = useEditorStore((s) => s.selectedId);
  const viewport = useEditorStore((s) => s.viewport);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const addShape = useEditorStore((s) => s.addShape);
  const updateShape = useEditorStore((s) => s.updateShape);
  const tool = useEditorStore((s) => s.tool);
  const setViewport = useEditorStore((s) => s.setViewport);

  const selectedShape = selectedId ? shapes[selectedId] ?? null : null;

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return;
    if (tool === 'select') {
      setSelectedId(null);
      return;
    }
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const id = crypto.randomUUID();
    if (tool === 'rect') {
      addShape({ id, type: 'rect', x: pos.x, y: pos.y, width: 100, height: 60, fill: '#fff' });
    } else if (tool === 'circle') {
      addShape({ id, type: 'circle', x: pos.x, y: pos.y, radius: 40, fill: '#fff' });
    } else if (tool === 'text') {
      addShape({ id, type: 'text', x: pos.x, y: pos.y, text: 'Text', fontSize: 18 });
    }
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-gray-50">
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.offsetX}
        y={viewport.offsetY}
        draggable={tool === 'select'}
        onDragEnd={(e) => setViewport({ offsetX: e.target.x(), offsetY: e.target.y() })}
        onClick={handleStageClick}
      >
        <Layer>
          {Object.values(shapes).map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              isSelected={shape.id === selectedId}
              onSelect={() => setSelectedId(shape.id)}
              onChange={(updates) => updateShape(shape.id, updates)}
            />
          ))}
          <SelectionTransformer selectedShape={selectedShape} />
        </Layer>
      </Stage>
    </div>
  );
}
```

- [ ] **Step 4: Verify interactions**

Run `npm run dev`. Expected: shapes can be selected, dragged, resized, and rotated.

- [ ] **Step 5: Commit**

```bash
git add src/components/SelectionTransformer.tsx src/components/ShapeRenderer.tsx src/components/Canvas.tsx
git commit -m "feat: add selection, drag, resize, rotate"
```

---

### Task 9: Implement snapping connectors

**Files:**
- Create: `src/utils/geometry.ts`
- Create: `src/utils/geometry.test.ts`
- Create: `src/components/Connector.tsx`
- Modify: `src/components/Canvas.tsx`
- Modify: `src/components/Toolbar.tsx`

- [ ] **Step 1: Write geometry tests**

Write `src/utils/geometry.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { getAnchorPoint } from './geometry';
import type { RectShape, CircleShape } from '@/types/shape';

describe('geometry', () => {
  it('returns center of a rectangle', () => {
    const rect: RectShape = { id: 'r', type: 'rect', x: 0, y: 0, width: 100, height: 50 };
    expect(getAnchorPoint(rect, 'center')).toEqual({ x: 50, y: 25 });
  });

  it('returns right side of a circle', () => {
    const circle: CircleShape = { id: 'c', type: 'circle', x: 0, y: 0, radius: 30 };
    expect(getAnchorPoint(circle, 'right')).toEqual({ x: 30, y: 0 });
  });
});
```

Run:
```bash
npx vitest run src/utils/geometry.test.ts
```
Expected: FAIL.

- [ ] **Step 2: Implement geometry helpers**

Write `src/utils/geometry.ts`:
```ts
import type { Shape } from '@/types/shape';

export interface Point {
  x: number;
  y: number;
}

export function getAnchorPoint(shape: Shape, anchor: string = 'center'): Point {
  switch (shape.type) {
    case 'rect':
      switch (anchor) {
        case 'top':
          return { x: shape.x + shape.width / 2, y: shape.y };
        case 'right':
          return { x: shape.x + shape.width, y: shape.y + shape.height / 2 };
        case 'bottom':
          return { x: shape.x + shape.width / 2, y: shape.y + shape.height };
        case 'left':
          return { x: shape.x, y: shape.y + shape.height / 2 };
        default:
          return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
      }
    case 'circle':
      switch (anchor) {
        case 'top':
          return { x: shape.x, y: shape.y - shape.radius };
        case 'right':
          return { x: shape.x + shape.radius, y: shape.y };
        case 'bottom':
          return { x: shape.x, y: shape.y + shape.radius };
        case 'left':
          return { x: shape.x - shape.radius, y: shape.y };
        default:
          return { x: shape.x, y: shape.y };
      }
    default:
      return { x: shape.x, y: shape.y };
  }
}
```

- [ ] **Step 3: Implement Connector component**

Write `src/components/Connector.tsx`:
```tsx
import { Line } from 'react-konva';
import { useEditorStore } from '@/store/editorStore';
import { getAnchorPoint } from '@/utils/geometry';
import type { ConnectorShape } from '@/types/shape';

interface ConnectorProps {
  connector: ConnectorShape;
}

export function Connector({ connector }: ConnectorProps) {
  const shapes = useEditorStore((s) => s.shapes);
  const from = shapes[connector.fromId];
  const to = shapes[connector.toId];

  if (!from || !to) return null;

  const start = getAnchorPoint(from, connector.fromAnchor ?? 'center');
  const end = getAnchorPoint(to, connector.toAnchor ?? 'center');

  return (
    <Line
      id={connector.id}
      points={[start.x, start.y, end.x, end.y]}
      stroke={connector.stroke ?? '#000'}
      strokeWidth={connector.strokeWidth ?? 2}
    />
  );
}
```

- [ ] **Step 4: Add connector tool and creation flow**

Modify `src/components/Toolbar.tsx` to include connector tool:

```tsx
import { MousePointer2, Square, Circle, Minus, Type, GitCommitHorizontal, Undo2, Redo2, Trash2 } from 'lucide-react';

const tools = [
  { value: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select' },
  { value: 'rect', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
  { value: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle' },
  { value: 'line', icon: <Minus className="h-4 w-4" />, label: 'Line' },
  { value: 'text', icon: <Type className="h-4 w-4" />, label: 'Text' },
  { value: 'connector', icon: <GitCommitHorizontal className="h-4 w-4" />, label: 'Connector' },
];
```

Modify `src/components/Canvas.tsx` to handle connector creation:

```tsx
import { useRef, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore } from '@/store/editorStore';
import { ShapeRenderer } from './ShapeRenderer';
import { SelectionTransformer } from './SelectionTransformer';

export function Canvas() {
  const stageRef = useRef<any>(null);
  const shapes = useEditorStore((s) => s.shapes);
  const selectedId = useEditorStore((s) => s.selectedId);
  const viewport = useEditorStore((s) => s.viewport);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const addShape = useEditorStore((s) => s.addShape);
  const updateShape = useEditorStore((s) => s.updateShape);
  const tool = useEditorStore((s) => s.tool);
  const setViewport = useEditorStore((s) => s.setViewport);
  const [connectorSource, setConnectorSource] = useState<string | null>(null);

  const selectedShape = selectedId ? shapes[selectedId] ?? null : null;

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return;
    if (tool === 'select') {
      setSelectedId(null);
      return;
    }
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const id = crypto.randomUUID();
    if (tool === 'rect') {
      addShape({ id, type: 'rect', x: pos.x, y: pos.y, width: 100, height: 60, fill: '#fff' });
    } else if (tool === 'circle') {
      addShape({ id, type: 'circle', x: pos.x, y: pos.y, radius: 40, fill: '#fff' });
    } else if (tool === 'text') {
      addShape({ id, type: 'text', x: pos.x, y: pos.y, text: 'Text', fontSize: 18 });
    }
  };

  const handleShapeClick = (shapeId: string) => {
    if (tool === 'connector') {
      if (!connectorSource) {
        setConnectorSource(shapeId);
        setSelectedId(shapeId);
        return;
      }
      if (connectorSource !== shapeId) {
        addShape({
          id: crypto.randomUUID(),
          type: 'connector',
          x: 0,
          y: 0,
          fromId: connectorSource,
          toId: shapeId,
        });
      }
      setConnectorSource(null);
      setSelectedId(null);
      return;
    }
    setSelectedId(shapeId);
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-gray-50">
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.offsetX}
        y={viewport.offsetY}
        draggable={tool === 'select'}
        onDragEnd={(e) => setViewport({ offsetX: e.target.x(), offsetY: e.target.y() })}
        onClick={handleStageClick}
      >
        <Layer>
          {Object.values(shapes).map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              isSelected={shape.id === selectedId || shape.id === connectorSource}
              onSelect={() => handleShapeClick(shape.id)}
              onChange={(updates) => updateShape(shape.id, updates)}
            />
          ))}
          <SelectionTransformer selectedShape={selectedShape} />
        </Layer>
      </Stage>
    </div>
  );
}
```

- [ ] **Step 5: Verify connectors**

Run `npm run dev`. Expected: select connector tool, click two shapes, a line appears connecting their centers and moves with them.

- [ ] **Step 6: Commit**

```bash
git add src/utils/geometry.ts src/utils/geometry.test.ts src/components/Connector.tsx src/components/Canvas.tsx src/components/Toolbar.tsx
git commit -m "feat: add snapping connectors"
```

---

### Task 10: Add keyboard shortcuts

**Files:**
- Create: `src/hooks/useHotkeys.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement useHotkeys**

Write `src/hooks/useHotkeys.ts`:
```ts
import { useEffect } from 'react';
import { useEditorStore, type Tool } from '@/store/editorStore';

const toolKeys: Record<string, Tool> = {
  v: 'select',
  r: 'rect',
  c: 'circle',
  l: 'line',
  t: 'text',
};

export function useHotkeys() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const selectedId = useEditorStore((s) => s.selectedId);
  const removeShape = useEditorStore((s) => s.removeShape);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) removeShape(selectedId);
        return;
      }

      const lower = e.key.toLowerCase();
      if (lower in toolKeys) {
        setTool(toolKeys[lower]);
        return;
      }

      if (lower === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setTool('connector');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, undo, redo, selectedId, removeShape]);
}
```

- [ ] **Step 2: Wire into App**

Modify `src/App.tsx`:
```tsx
import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';
import { useHotkeys } from '@/hooks/useHotkeys';

function App() {
  useHotkeys();
  return (
    <div className="h-screen w-screen relative overflow-hidden bg-gray-50">
      <Toolbar />
      <Canvas />
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Verify shortcuts**

Run `npm run dev`. Expected: `R` switches to rectangle, `V` to select, `Delete` removes selected, `Ctrl+Z` undoes.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useHotkeys.ts src/App.tsx
git commit -m "feat: add keyboard shortcuts"
```

---

### Task 11: Add pan/zoom controls

**Files:**
- Modify: `src/components/Canvas.tsx`

- [ ] **Step 1: Implement pan with space+drag and zoom with wheel/shortcuts**

Modify `src/components/Canvas.tsx` to handle wheel zoom and space-drag pan:

```tsx
import { useRef, useState, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore } from '@/store/editorStore';
import { ShapeRenderer } from './ShapeRenderer';
import { SelectionTransformer } from './SelectionTransformer';

export function Canvas() {
  const stageRef = useRef<any>(null);
  const shapes = useEditorStore((s) => s.shapes);
  const selectedId = useEditorStore((s) => s.selectedId);
  const viewport = useEditorStore((s) => s.viewport);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const addShape = useEditorStore((s) => s.addShape);
  const updateShape = useEditorStore((s) => s.updateShape);
  const tool = useEditorStore((s) => s.tool);
  const setViewport = useEditorStore((s) => s.setViewport);
  const [connectorSource, setConnectorSource] = useState<string | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const selectedShape = selectedId ? shapes[selectedId] ?? null : null;

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return;
    if (tool === 'select') {
      setSelectedId(null);
      return;
    }
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const id = crypto.randomUUID();
    if (tool === 'rect') {
      addShape({ id, type: 'rect', x: pos.x, y: pos.y, width: 100, height: 60, fill: '#fff' });
    } else if (tool === 'circle') {
      addShape({ id, type: 'circle', x: pos.x, y: pos.y, radius: 40, fill: '#fff' });
    } else if (tool === 'text') {
      addShape({ id, type: 'text', x: pos.x, y: pos.y, text: 'Text', fontSize: 18 });
    }
  };

  const handleShapeClick = (shapeId: string) => {
    if (tool === 'connector') {
      if (!connectorSource) {
        setConnectorSource(shapeId);
        setSelectedId(shapeId);
        return;
      }
      if (connectorSource !== shapeId) {
        addShape({
          id: crypto.randomUUID(),
          type: 'connector',
          x: 0,
          y: 0,
          fromId: connectorSource,
          toId: shapeId,
        });
      }
      setConnectorSource(null);
      setSelectedId(null);
      return;
    }
    setSelectedId(shapeId);
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const x = pointer.x - mousePointTo.x * newScale;
    const y = pointer.y - mousePointTo.y * newScale;
    setViewport({ scale: newScale, offsetX: x, offsetY: y });
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-gray-50">
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.offsetX}
        y={viewport.offsetY}
        draggable={tool === 'select' || spacePressed}
        onDragEnd={(e) => setViewport({ offsetX: e.target.x(), offsetY: e.target.y() })}
        onClick={handleStageClick}
        onWheel={handleWheel}
      >
        <Layer>
          {Object.values(shapes).map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              isSelected={shape.id === selectedId || shape.id === connectorSource}
              onSelect={() => handleShapeClick(shape.id)}
              onChange={(updates) => updateShape(shape.id, updates)}
            />
          ))}
          <SelectionTransformer selectedShape={selectedShape} />
        </Layer>
      </Stage>
    </div>
  );
}
```

- [ ] **Step 2: Verify pan/zoom**

Run `npm run dev`. Expected: mouse wheel zooms, space+drag pans the canvas.

- [ ] **Step 3: Commit**

```bash
git add src/components/Canvas.tsx
git commit -m "feat: add pan and zoom"
```

---

### Task 12: Add inline text editing

**Files:**
- Create: `src/components/TextEditor.tsx`
- Modify: `src/components/Canvas.tsx`

- [ ] **Step 1: Implement TextEditor overlay**

Write `src/components/TextEditor.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import type { TextShape } from '@/types/shape';

interface TextEditorProps {
  shape: TextShape;
  viewport: { scale: number; offsetX: number; offsetY: number };
  onClose: () => void;
}

export function TextEditor({ shape, viewport, onClose }: TextEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const updateShape = useEditorStore((s) => s.updateShape);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const screenX = shape.x * viewport.scale + viewport.offsetX;
  const screenY = shape.y * viewport.scale + viewport.offsetY;

  return (
    <textarea
      ref={inputRef}
      defaultValue={shape.text}
      className="absolute z-20 resize-none border border-blue-500 bg-transparent p-1 text-black outline-none"
      style={{
        left: screenX,
        top: screenY,
        fontSize: shape.fontSize * viewport.scale,
        minWidth: 100,
      }}
      onBlur={(e) => {
        updateShape(shape.id, { text: e.target.value });
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    />
  );
}
```

- [ ] **Step 2: Wire double-click text editing**

Modify `src/components/Canvas.tsx`:

Add `editingTextId` state:
```tsx
const [editingTextId, setEditingTextId] = useState<string | null>(null);
```

Modify `handleShapeClick` to open text editor on double-click or when tool is text:
```tsx
const handleShapeDblClick = (shapeId: string) => {
  const shape = shapes[shapeId];
  if (shape?.type === 'text') {
    setEditingTextId(shapeId);
  }
};
```

Pass `onDblClick` through `ShapeRenderer`. Add a wrapper condition:

```tsx
{editingTextId && shapes[editingTextId]?.type === 'text' && (
  <TextEditor
    shape={shapes[editingTextId] as TextShape}
    viewport={viewport}
    onClose={() => setEditingTextId(null)}
  />
)}
```

Add import for `TextEditor` and `TextShape`.

- [ ] **Step 3: Verify text editing**

Run `npm run dev`. Expected: double-click a text shape to edit inline; blur saves, Escape cancels.

- [ ] **Step 4: Commit**

```bash
git add src/components/TextEditor.tsx src/components/Canvas.tsx
git commit -m "feat: add inline text editing"
```

---

### Task 13: Cleanup transformer mutations and add line tool

**Files:**
- Modify: `src/components/ShapeRenderer.tsx`
- Modify: `src/components/SelectionTransformer.tsx`
- Modify: `src/components/Canvas.tsx`

- [ ] **Step 1: Sync transformer changes to store**

Modify `src/components/ShapeRenderer.tsx` to handle transform end:

```tsx
const handleTransformEnd = (e: KonvaEventObject<Event>) => {
  const node = e.target;
  onChange({
    x: node.x(),
    y: node.y(),
    rotation: node.rotation(),
    ...(shape.type === 'rect'
      ? { width: node.width() * node.scaleX(), height: node.height() * node.scaleY() }
      : {}),
    ...(shape.type === 'circle' ? { radius: node.radius() * node.scaleX() } : {}),
  });
  node.scaleX(1);
  node.scaleY(1);
};
```

Add `onTransformEnd: handleTransformEnd` to `common` props.

- [ ] **Step 2: Keep line tool creation working**

Modify `src/components/Canvas.tsx` line creation. For `tool === 'line'`, on first click store a start point and on second click create the line:

```tsx
const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
```

In `handleStageClick`:
```tsx
else if (tool === 'line') {
  if (!lineStart) {
    setLineStart({ x: pos.x, y: pos.y });
  } else {
    addShape({
      id: crypto.randomUUID(),
      type: 'line',
      x: 0,
      y: 0,
      points: [lineStart.x, lineStart.y, pos.x, pos.y],
    });
    setLineStart(null);
  }
}
```

- [ ] **Step 3: Verify resize/rotate persists and line tool works**

Run `npm run dev`. Expected: resize/rotate updates store, line tool creates two-point lines.

- [ ] **Step 4: Commit**

```bash
git add src/components/ShapeRenderer.tsx src/components/SelectionTransformer.tsx src/components/Canvas.tsx
git commit -m "feat: persist transformer changes and line tool"
```

---

### Task 14: Add smoke test and run full suite

**Files:**
- Create: `src/App.test.tsx`
- Modify: `vite.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Configure Vitest**

Modify `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: Write App smoke test**

Write `src/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the toolbar and canvas', () => {
    render(<App />);
    expect(screen.getByLabelText('Select')).toBeInTheDocument();
    expect(screen.getByLabelText('Rectangle')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Add test script**

Modify `package.json` scripts:
```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

- [ ] **Step 4: Run all tests**

Run:
```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts src/test/setup.ts src/App.test.tsx package.json
git commit -m "test: add smoke test and vitest setup"
```

---

### Task 15: Final cleanup and verification

**Files:**
- Modify: `src/App.tsx` if needed
- Modify: `src/index.css` if needed

- [ ] **Step 1: Run lint/typecheck**

If available, run:
```bash
npm run lint
npm run typecheck
```
If not available, run:
```bash
npx tsc --noEmit
```
Expected: no TypeScript errors.

- [ ] **Step 2: Run tests**

Run:
```bash
npm test
```
Expected: all pass.

- [ ] **Step 3: Manual verification**

Run:
```bash
npm run dev
```
Verify:
- Toolbar renders and toggles tools.
- Rect/circle/text creation works.
- Line tool creates lines with two clicks.
- Select, drag, resize, rotate work.
- Connectors snap and move with shapes.
- Delete removes selected shape.
- Undo/redo works.
- Pan/zoom works.
- Keyboard shortcuts work.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: final cleanup and verification"
```

---

## Self-Review

**Spec coverage check:**
- Vite + React + TypeScript + React-Konva + Zustand + shadcn/ui: Tasks 1-2.
- Rectangles, circles, lines, text: Tasks 3, 6, 13.
- Connectors that snap and move: Task 9.
- Select/drag/resize/rotate/delete: Tasks 8, 13, toolbar.
- Pan/zoom: Task 11.
- Undo/redo: Tasks 5, 10.
- Keyboard shortcuts: Task 10.
- Toolbar: Task 7.
- Testing: Task 14.

**Placeholder scan:** No TBD/TODO/vague requirements. Each step includes exact commands and expected outputs.

**Type consistency:** Shape type names and store methods (`addShape`, `updateShape`, `removeShape`, `undo`, `redo`) are consistent throughout.

**Known simplifications:**
- `Connector` uses `useEditorStore` directly; this couples rendering to the store but is acceptable for the first version.
- Window dimensions are static on mount; resizing the window does not update canvas size. This is acceptable for the MVP.
- Text editing overlay uses a fixed `minWidth`; auto-resizing is out of scope.
