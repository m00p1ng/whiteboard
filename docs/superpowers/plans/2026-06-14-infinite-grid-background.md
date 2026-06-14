# Infinite Grid Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an infinite major/minor grid background behind the whiteboard canvas with a top-bar toggle and persisted visibility state.

**Architecture:** A new `GridBackground` Konva component renders only the visible world bounds as minor/major lines inside a bottom layer. `editorStore` owns a global `showGrid` boolean that is read from and written to `localStorage`. `TopBar` exposes a toggle that mutates this state.

**Tech Stack:** React 19, TypeScript, Vite, react-konva, Zustand, Tailwind CSS v4, Vitest, Testing Library.

---

## File Structure

- **Create:** `src/components/GridBackground.tsx` — Konva layer that draws the grid.
- **Create:** `src/components/GridBackground.test.tsx` — unit tests for the grid drawing.
- **Modify:** `src/store/editorStore.ts` — add `showGrid` state, `setShowGrid` action, and localStorage sync.
- **Modify:** `src/store/editorStore.test.ts` — add tests for the grid toggle and persistence.
- **Modify:** `src/components/TopBar.tsx` — add a grid visibility toggle button.
- **Modify:** `src/components/TopBar.test.tsx` — add tests for the grid toggle.
- **Modify:** `src/components/Canvas.tsx` — render `<GridBackground />` as the first layer.
- **Modify:** `src/components/Canvas.test.tsx` — mock `Shape` and add an integration test.

---

## Task 1: Extend editorStore with `showGrid` and localStorage persistence

**Files:**
- Modify: `src/store/editorStore.ts`

**Context:** The store already resets `viewport` in `reset()`. The new `showGrid` field should **not** be reset, because it is a global UI preference, not board state.

- [ ] **Step 1: Add the storage helper and key**

Add above the `useEditorStore` creation call:

```ts
const SHOW_GRID_KEY = 'whiteboard:showGrid';

function readShowGrid(): boolean {
  try {
    const value = window.localStorage.getItem(SHOW_GRID_KEY);
    return value === 'true' || value === null;
  } catch {
    return true;
  }
}

function writeShowGrid(value: boolean): void {
  try {
    window.localStorage.setItem(SHOW_GRID_KEY, String(value));
  } catch {
    // Ignore storage errors.
  }
}
```

- [ ] **Step 2: Update the EditorState interface**

Add inside `EditorState`:

```ts
showGrid: boolean;
setShowGrid: (value: boolean) => void;
```

- [ ] **Step 3: Update the store initial state and actions**

Add to the object passed to `create`:

```ts
showGrid: readShowGrid(),
setShowGrid: (value) => {
  writeShowGrid(value);
  set({ showGrid: value });
},
```

- [ ] **Step 4: Commit**

```bash
git add src/store/editorStore.ts
git commit -m "feat(store): add showGrid state with localStorage persistence"
```

---

## Task 2: Test editorStore grid state

**Files:**
- Modify: `src/store/editorStore.test.ts`

**Context:** The existing tests reset the store in `beforeEach`. `showGrid` should survive the reset (it is a preference), so reset tests must reflect the stored value. Tests also need a stubbed `localStorage` to avoid cross-test pollution.

- [ ] **Step 1: Stub `localStorage` in the existing `beforeEach`**

Add inside the first `describe('editorStore', ...)` `beforeEach`:

```ts
const values = new Map<string, string>();
vi.stubGlobal('localStorage', {
  get length() {
    return values.size;
  },
  clear: vi.fn(() => values.clear()),
  getItem: vi.fn((key: string) => values.get(key) ?? null),
  key: vi.fn((index: number) => [...values.keys()][index] ?? null),
  removeItem: vi.fn((key: string) => values.delete(key)),
  setItem: vi.fn((key: string, value: string) => values.set(key, value)),
} satisfies Storage);
```

- [ ] **Step 2: Add a test for the default `true` value**

Inside the first `describe('editorStore', ...)` block, add:

```ts
it('defaults showGrid to true when localStorage is empty', () => {
  expect(useEditorStore.getState().showGrid).toBe(true);
});
```

- [ ] **Step 3: Add a test for setting and persisting the value**

Add inside the same describe block:

```ts
it('updates showGrid and writes to localStorage', () => {
  useEditorStore.getState().setShowGrid(false);
  expect(useEditorStore.getState().showGrid).toBe(false);
  expect(window.localStorage.getItem('whiteboard:showGrid')).toBe('false');

  useEditorStore.getState().setShowGrid(true);
  expect(useEditorStore.getState().showGrid).toBe(true);
  expect(window.localStorage.getItem('whiteboard:showGrid')).toBe('true');
});
```

- [ ] **Step 4: Run the store tests**

```bash
npm test -- src/store/editorStore.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/editorStore.test.ts
git commit -m "test(store): add showGrid state tests"
```

---

## Task 3: Create the `GridBackground` component

**Files:**
- Create: `src/components/GridBackground.tsx`
- Modify: `src/store/editorStore.ts` (export `Viewport` type)

- [ ] **Step 1: Export `Viewport` from editorStore**

Change in `src/store/editorStore.ts`:

```ts
export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}
```

- [ ] **Step 2: Write the component and drawing helper**

Create `src/components/GridBackground.tsx`:

```tsx
import { Layer, Shape } from 'react-konva';
import type { Viewport } from '@/store/editorStore';

export interface GridBackgroundProps {
  viewport: Viewport;
  visible: boolean;
}

export const MINOR_SPACING = 20;
export const MAJOR_SPACING = 100;

export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function getGridColors() {
  if (isDarkMode()) {
    return {
      minor: '#27272a',
      major: '#52525b',
    };
  }
  return {
    minor: '#e2e8f0',
    major: '#94a3b8',
  };
}

export interface GridContext {
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  stroke: () => void;
  fillStrokeShape: (shape: unknown) => void;
  strokeStyle: string;
  lineWidth: number;
}

export function drawGrid(
  context: GridContext,
  viewport: Viewport,
  width: number,
  height: number
) {
  const { scale, offsetX, offsetY } = viewport;

  const worldMinX = -offsetX / scale;
  const worldMaxX = (width - offsetX) / scale;
  const worldMinY = -offsetY / scale;
  const worldMaxY = (height - offsetY) / scale;

  const startX = Math.floor(worldMinX / MINOR_SPACING) * MINOR_SPACING;
  const endX = Math.ceil(worldMaxX / MINOR_SPACING) * MINOR_SPACING;
  const startY = Math.floor(worldMinY / MINOR_SPACING) * MINOR_SPACING;
  const endY = Math.ceil(worldMaxY / MINOR_SPACING) * MINOR_SPACING;

  const colors = getGridColors();

  context.beginPath();
  for (let x = startX; x <= endX; x += MINOR_SPACING) {
    context.moveTo(x, worldMinY);
    context.lineTo(x, worldMaxY);
  }
  for (let y = startY; y <= endY; y += MINOR_SPACING) {
    context.moveTo(worldMinX, y);
    context.lineTo(worldMaxX, y);
  }
  context.strokeStyle = colors.minor;
  context.lineWidth = 1 / scale;
  context.stroke();

  context.beginPath();
  const majorStartX = Math.floor(worldMinX / MAJOR_SPACING) * MAJOR_SPACING;
  const majorEndX = Math.ceil(worldMaxX / MAJOR_SPACING) * MAJOR_SPACING;
  const majorStartY = Math.floor(worldMinY / MAJOR_SPACING) * MAJOR_SPACING;
  const majorEndY = Math.ceil(worldMaxY / MAJOR_SPACING) * MAJOR_SPACING;

  for (let x = majorStartX; x <= majorEndX; x += MAJOR_SPACING) {
    context.moveTo(x, worldMinY);
    context.lineTo(x, worldMaxY);
  }
  for (let y = majorStartY; y <= majorEndY; y += MAJOR_SPACING) {
    context.moveTo(worldMinX, y);
    context.lineTo(worldMaxX, y);
  }
  context.strokeStyle = colors.major;
  context.lineWidth = 1.5 / scale;
  context.stroke();
}

export function GridBackground({ viewport, visible }: GridBackgroundProps) {
  if (!visible) return null;

  return (
    <Layer listening={false}>
      <Shape
        sceneFunc={(context, shape) => {
          const stage = context.getStage();
          if (!stage) return;
          drawGrid(context as unknown as GridContext, viewport, stage.width(), stage.height());
          context.fillStrokeShape(shape);
        }}
      />
    </Layer>
  );
}
```

**Note:** The `GridContext` interface is intentionally narrow so tests can supply a mock, while Konva's actual context satisfies it.

- [ ] **Step 3: Commit**

```bash
git add src/store/editorStore.ts src/components/GridBackground.tsx
git commit -m "feat(canvas): add GridBackground component with testable drawGrid helper"
```

---

## Task 4: Test `GridBackground`

**Files:**
- Create: `src/components/GridBackground.test.tsx`

- [ ] **Step 1: Write the tests**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Stage } from 'react-konva';
import {
  drawGrid,
  getGridColors,
  GridBackground,
  isDarkMode,
  MAJOR_SPACING,
  MINOR_SPACING,
} from './GridBackground';
import type { GridContext } from './GridBackground';

function createMockContext(): GridContext & {
  strokeStyle: string;
  lineWidth: number;
  paths: Array<{ type: 'minor' | 'major'; moves: [number, number][]; lines: [number, number][] }>;
} {
  const paths: Array<{ type: 'minor' | 'major'; moves: [number, number][]; lines: [number, number][] }> = [];
  let currentPath: { type: 'minor' | 'major'; moves: [number, number][]; lines: [number, number][] } | null = null;

  return {
    strokeStyle: '',
    lineWidth: 0,
    paths,
    beginPath: () => {
      currentPath = { type: 'minor', moves: [], lines: [] };
      paths.push(currentPath);
    },
    moveTo: (x, y) => {
      currentPath?.moves.push([x, y]);
    },
    lineTo: (x, y) => {
      currentPath?.lines.push([x, y]);
    },
    stroke() {
      if (!currentPath) return;
      currentPath.type = this.strokeStyle === '#94a3b8' || this.strokeStyle === '#52525b' ? 'major' : 'minor';
    },
    fillStrokeShape: () => {},
  };
}

const viewport = { scale: 1, offsetX: 0, offsetY: 0 };

describe('GridBackground drawing', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('draws minor lines at 20px intervals and major lines at 100px intervals', () => {
    const context = createMockContext();
    drawGrid(context, viewport, 200, 200);

    const minorPath = context.paths.find((p) => p.type === 'minor');
    const majorPath = context.paths.find((p) => p.type === 'major');

    expect(minorPath).toBeDefined();
    expect(majorPath).toBeDefined();

    // With a 200x200 viewport at scale 1 and offset 0, world bounds are 0..200.
    // Minor lines: 0, 20, 40, ..., 200 => 11 vertical + 11 horizontal => 22 lines.
    // Each line is one move + one line.
    expect(minorPath!.moves).toHaveLength(22);
    expect(minorPath!.lines).toHaveLength(22);

    // Major lines: 0, 100, 200 => 3 vertical + 3 horizontal => 6 lines.
    expect(majorPath!.moves).toHaveLength(6);
    expect(majorPath!.lines).toHaveLength(6);
  });

  it('uses light mode colors by default', () => {
    expect(getGridColors()).toEqual({
      minor: '#e2e8f0',
      major: '#94a3b8',
    });
  });

  it('uses dark mode colors when html has dark class', () => {
    document.documentElement.classList.add('dark');
    expect(isDarkMode()).toBe(true);
    expect(getGridColors()).toEqual({
      minor: '#27272a',
      major: '#52525b',
    });
  });

  it('scales line width inversely with viewport scale', () => {
    const context = createMockContext();
    drawGrid(context, { scale: 2, offsetX: 0, offsetY: 0 }, 200, 200);

    expect(context.lineWidth).toBe(0.5);
  });
});

describe('GridBackground component', () => {
  it('renders without crashing when visible', () => {
    render(
      <Stage width={200} height={200}>
        <GridBackground viewport={viewport} visible />
      </Stage>
    );

    expect(document.querySelector('canvas')).toBeInTheDocument();
  });

  it('does not crash when hidden', () => {
    const { container } = render(
      <Stage width={200} height={200}>
        <GridBackground viewport={viewport} visible={false} />
      </Stage>
    );

    // Stage still renders its own canvas; the grid layer is simply omitted.
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npm test -- src/components/GridBackground.test.tsx
```

Expected: tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/GridBackground.test.tsx
git commit -m "test(canvas): add GridBackground drawing tests"
```

---

## Task 5: Wire `GridBackground` into `Canvas`

**Files:**
- Modify: `src/components/Canvas.tsx`
- Modify: `src/components/Canvas.test.tsx`

- [ ] **Step 1: Import the component**

Add near the other imports in `Canvas.tsx`:

```tsx
import { GridBackground } from './GridBackground';
```

- [ ] **Step 2: Read `showGrid` from the store**

Add after the other store selectors:

```ts
const showGrid = useEditorStore((s) => s.showGrid);
```

- [ ] **Step 3: Render the grid layer first**

Inside the `<Stage>`, wrap the existing `<Layer>` so the grid layer is first:

```tsx
<Stage ...>
  <GridBackground viewport={viewport} visible={showGrid} />
  <Layer>
    {/* existing shape layer content */}
  </Layer>
</Stage>
```

- [ ] **Step 4: Update Canvas test mocks**

In `src/components/Canvas.test.tsx`, add `Shape` to the `react-konva` mock:

```tsx
Shape: () => <div data-testid="grid-background-shape" />,
```

Add inside the existing `describe('Canvas selected shape interaction', ...)` or a new describe block:

```ts
describe('Canvas grid background', () => {
  it('renders the grid background when showGrid is true', () => {
    useEditorStore.setState({ showGrid: true });
    render(<Canvas />);

    expect(screen.getByTestId('grid-background-shape')).toBeInTheDocument();
  });

  it('hides the grid background when showGrid is false', () => {
    useEditorStore.setState({ showGrid: false });
    render(<Canvas />);

    expect(screen.queryByTestId('grid-background-shape')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run Canvas tests**

```bash
npm test -- src/components/Canvas.test.tsx
```

Expected: existing tests still pass and the new grid tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/Canvas.tsx src/components/Canvas.test.tsx
git commit -m "feat(canvas): render grid background behind shapes"
```

---

## Task 6: Add grid toggle to `TopBar`

**Files:**
- Modify: `src/components/TopBar.tsx`

- [ ] **Step 1: Import the grid icon and read state**

Add `Grid3X3` to the `lucide-react` import:

```tsx
import { ArrowLeft, Grid3X3, Redo2, Trash2, Undo2 } from 'lucide-react';
```

Add store selectors:

```ts
const showGrid = useEditorStore((state) => state.showGrid);
const setShowGrid = useEditorStore((state) => state.setShowGrid);
```

- [ ] **Step 2: Add the toggle button**

Add inside the right-hand button group, after the redo button:

```tsx
<Button
  variant="ghost"
  size="icon"
  aria-label={showGrid ? 'Hide grid' : 'Show grid'}
  aria-pressed={showGrid}
  onClick={() => setShowGrid(!showGrid)}
>
  <Grid3X3 className="h-4 w-4" />
</Button>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "feat(ui): add grid visibility toggle to TopBar"
```

---

## Task 7: Test the `TopBar` grid toggle

**Files:**
- Modify: `src/components/TopBar.test.tsx`

- [ ] **Step 1: Add tests**

Add inside `describe('TopBar', ...)`:

```ts
it('toggles grid visibility', () => {
  renderTopBar();

  const toggle = screen.getByRole('button', { name: 'Hide grid' });
  expect(toggle).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(toggle);

  expect(useEditorStore.getState().showGrid).toBe(false);
  expect(window.localStorage.getItem('whiteboard:showGrid')).toBe('false');
  expect(
    screen.getByRole('button', { name: 'Show grid' })
  ).toHaveAttribute('aria-pressed', 'false');
});
```

- [ ] **Step 2: Run TopBar tests**

```bash
npm test -- src/components/TopBar.test.tsx
```

Expected: tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/TopBar.test.tsx
git commit -m "test(ui): add TopBar grid toggle test"
```

---

## Task 8: Run full test suite and lint

**Files:**
- All of the above.

- [ ] **Step 1: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no lint errors.

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc -b
```

Expected: no type errors.

- [ ] **Step 4: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "chore: fix lint/types for grid background" || true
```

---

## Spec Coverage Check

| Spec Requirement | Implementing Task |
|------------------|-------------------|
| Major + minor lines | Task 3 |
| Fixed world spacing 20px / 100px | Task 3 (`MINOR_SPACING`, `MAJOR_SPACING`) |
| Neutral gray colors in light/dark mode | Task 3 (`getGridColors`) |
| Renders behind shapes | Task 5 (grid layer is first child of `Stage`) |
| Toggle on/off only | Tasks 1, 6, 7 |
| Global `localStorage` persistence | Tasks 1, 2 |
| TopBar toggle placement | Task 6 |
| Tests | Tasks 2, 4, 7, 8 |

## No Placeholders Check

- All code blocks contain concrete implementation.
- All file paths are exact.
- All commands include expected outcomes.
- No TODO/TBD/similar placeholders.
