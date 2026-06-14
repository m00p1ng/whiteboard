# Shape Properties Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a shape is selected, show a floating right-side panel with editable style/geometry fields for that shape, with live preview and one undo step per committed edit.

**Architecture:** Two new `editorStore` actions (`setShapeDraft` for live preview without touching undo/redo, `recordFieldChange` for a single committed undo entry) back a new `ShapePropertiesPanel` component that renders a per-shape-type field set. The panel is wired into `BoardPage`, remounting via `key` on selection change.

**Tech Stack:** React 19, Zustand, Vitest + @testing-library/react, Tailwind.

---

## Reference: spec

See `docs/superpowers/specs/2026-06-15-shape-properties-panel-design.md` for full rationale.

---

### Task 1: editorStore — `setShapeDraft` and `recordFieldChange`

**Files:**
- Modify: `src/store/editorStore.ts`
- Test: `src/store/editorStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the `describe('editorStore', ...)` block in `src/store/editorStore.test.ts`, after the existing `'undos and redos add shape'` test:

```ts
  it('sets a live draft update without touching undo/redo stacks', () => {
    const shape = {
      id: 'r1',
      type: 'rect' as const,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: '#ffffff',
    };
    useEditorStore.getState().addShape(shape);
    const stackLengthBefore = useEditorStore.getState().undoStack.length;

    useEditorStore.getState().setShapeDraft('r1', { fill: '#ff0000' });

    expect(useEditorStore.getState().shapes['r1'].fill).toBe('#ff0000');
    expect(useEditorStore.getState().undoStack).toHaveLength(stackLengthBefore);
    expect(useEditorStore.getState().redoStack).toHaveLength(0);
  });

  it('records a single undo entry for a field change', () => {
    const shape = {
      id: 'r1',
      type: 'rect' as const,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: '#ffffff',
    };
    useEditorStore.getState().addShape(shape);
    useEditorStore.getState().setShapeDraft('r1', { fill: '#ff0000' });

    useEditorStore.getState().recordFieldChange('r1', 'fill', '#ffffff', '#ff0000');

    expect(useEditorStore.getState().shapes['r1'].fill).toBe('#ff0000');
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().shapes['r1'].fill).toBe('#ffffff');
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().shapes['r1'].fill).toBe('#ff0000');
  });

  it('does not record a change when prev and next values are equal', () => {
    const shape = {
      id: 'r1',
      type: 'rect' as const,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: '#ffffff',
    };
    useEditorStore.getState().addShape(shape);
    const stackLengthBefore = useEditorStore.getState().undoStack.length;

    useEditorStore.getState().recordFieldChange('r1', 'fill', '#ffffff', '#ffffff');

    expect(useEditorStore.getState().undoStack).toHaveLength(stackLengthBefore);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/editorStore.test.ts`
Expected: FAIL — `useEditorStore.getState().setShapeDraft is not a function` (and similarly for `recordFieldChange`).

- [ ] **Step 3: Implement `setShapeDraft` and `recordFieldChange`**

In `src/store/editorStore.ts`, add to the `EditorState` interface (after `setShapes`):

```ts
  setShapeDraft: (id: string, updates: Record<string, unknown>) => void;
  recordFieldChange: (
    id: string,
    field: string,
    prevValue: unknown,
    nextValue: unknown
  ) => void;
```

Add the implementations in the store body, after `setShapes`:

```ts
  setShapeDraft: (id, updates) =>
    set((state) => ({
      shapes: {
        ...state.shapes,
        [id]: { ...state.shapes[id], ...updates } as Shape,
      },
    })),
  recordFieldChange: (id, field, prevValue, nextValue) => {
    if (prevValue === nextValue) return;
    get().execute({
      do: (state) => {
        const shape = state.shapes[id];
        if (shape) (shape as unknown as Record<string, unknown>)[field] = nextValue;
      },
      undo: (state) => {
        const shape = state.shapes[id];
        if (shape) (shape as unknown as Record<string, unknown>)[field] = prevValue;
      },
    });
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/editorStore.test.ts`
Expected: PASS (all tests including the 3 new ones)

- [ ] **Step 5: Commit**

```bash
git add src/store/editorStore.ts src/store/editorStore.test.ts
git commit -m "feat: add setShapeDraft and recordFieldChange to editorStore"
```

---

### Task 2: `ShapePropertiesPanel` component

**Files:**
- Create: `src/components/ShapePropertiesPanel.tsx`
- Test: `src/components/ShapePropertiesPanel.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ShapePropertiesPanel.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ShapePropertiesPanel } from './ShapePropertiesPanel';
import { useEditorStore } from '@/store/editorStore';
import type {
  CircleShape,
  ConnectorShape,
  LineShape,
  RectShape,
  TextShape,
} from '@/types/shape';

const rect: RectShape = {
  id: 'r1',
  type: 'rect',
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  fill: '#ff0000',
  stroke: '#0000ff',
  strokeWidth: 3,
};

const circle: CircleShape = {
  id: 'c1',
  type: 'circle',
  x: 5,
  y: 6,
  radiusX: 30,
  radiusY: 40,
  fill: '#00ff00',
};

const text: TextShape = {
  id: 't1',
  type: 'text',
  x: 1,
  y: 2,
  text: 'Hello',
  fontSize: 18,
  fill: '#111111',
};

const line: LineShape = {
  id: 'l1',
  type: 'line',
  x: 0,
  y: 0,
  points: [0, 0, 100, 100],
  stroke: '#222222',
  strokeWidth: 4,
};

const connector: ConnectorShape = {
  id: 'cn1',
  type: 'connector',
  x: 0,
  y: 0,
  fromId: 'r1',
  toId: 'c1',
  stroke: '#333333',
};

beforeEach(() => {
  useEditorStore.getState().reset();
});

describe('ShapePropertiesPanel', () => {
  it('renders nothing when no shape is selected', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: null });
    render(<ShapePropertiesPanel />);
    expect(screen.queryByLabelText('Fill hex')).not.toBeInTheDocument();
  });

  it('renders rect fields with current values', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Fill hex')).toHaveValue('#ff0000');
    expect(screen.getByLabelText('Stroke hex')).toHaveValue('#0000ff');
    expect(screen.getByLabelText('Stroke width')).toHaveValue(3);
    expect(screen.getByLabelText('X')).toHaveValue(10);
    expect(screen.getByLabelText('Y')).toHaveValue(20);
    expect(screen.getByLabelText('Width')).toHaveValue(100);
    expect(screen.getByLabelText('Height')).toHaveValue(50);
  });

  it('updates the shape live while editing and commits a single undo step on blur', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    render(<ShapePropertiesPanel />);

    const widthInput = screen.getByLabelText('Width');
    fireEvent.focus(widthInput);
    fireEvent.change(widthInput, { target: { value: '150' } });

    expect(useEditorStore.getState().shapes['r1'].width).toBe(150);
    expect(useEditorStore.getState().undoStack).toHaveLength(0);

    fireEvent.blur(widthInput);

    expect(useEditorStore.getState().undoStack).toHaveLength(1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().shapes['r1'].width).toBe(100);
  });

  it('syncs the color swatch and hex inputs for Fill', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    render(<ShapePropertiesPanel />);

    const hexInput = screen.getByLabelText('Fill hex');
    fireEvent.focus(hexInput);
    fireEvent.change(hexInput, { target: { value: '#abcdef' } });

    expect(screen.getByLabelText('Fill swatch')).toHaveValue('#abcdef');
  });

  it('renders circle fields', () => {
    useEditorStore.setState({ shapes: { c1: circle }, selectedId: 'c1' });
    render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Fill hex')).toHaveValue('#00ff00');
    expect(screen.getByLabelText('Radius X')).toHaveValue(30);
    expect(screen.getByLabelText('Radius Y')).toHaveValue(40);
    expect(screen.queryByLabelText('Width')).not.toBeInTheDocument();
  });

  it('renders text fields', () => {
    useEditorStore.setState({ shapes: { t1: text }, selectedId: 't1' });
    render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Text color hex')).toHaveValue('#111111');
    expect(screen.getByLabelText('Font size')).toHaveValue(18);
    expect(screen.getByLabelText('Text')).toHaveValue('Hello');
    expect(screen.queryByLabelText('Stroke hex')).not.toBeInTheDocument();
  });

  it('renders line fields with stroke only', () => {
    useEditorStore.setState({ shapes: { l1: line }, selectedId: 'l1' });
    render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Stroke hex')).toHaveValue('#222222');
    expect(screen.getByLabelText('Stroke width')).toHaveValue(4);
    expect(screen.queryByLabelText('Fill hex')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('X')).not.toBeInTheDocument();
  });

  it('renders connector fields with stroke only', () => {
    useEditorStore.setState({ shapes: { cn1: connector }, selectedId: 'cn1' });
    render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Stroke hex')).toHaveValue('#333333');
    expect(screen.queryByLabelText('Fill hex')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ShapePropertiesPanel.test.tsx`
Expected: FAIL — cannot find module `./ShapePropertiesPanel`.

- [ ] **Step 3: Implement `ShapePropertiesPanel`**

Create `src/components/ShapePropertiesPanel.tsx`:

```tsx
import { useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';

interface NumberFieldProps {
  label: string;
  value: number;
  onLiveChange: (value: number) => void;
  onCommit: (prevValue: number, nextValue: number) => void;
}

function NumberField({ label, value, onLiveChange, onCommit }: NumberFieldProps) {
  const prevRef = useRef(value);

  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <input
        type="number"
        className="rounded border px-2 py-1 text-sm"
        value={value}
        onFocus={() => {
          prevRef.current = value;
        }}
        onChange={(e) => {
          const next = parseFloat(e.target.value);
          onLiveChange(Number.isNaN(next) ? 0 : next);
        }}
        onBlur={() => onCommit(prevRef.current, value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onLiveChange: (value: string) => void;
  onCommit: (prevValue: string, nextValue: string) => void;
}

function ColorField({ label, value, onLiveChange, onCommit }: ColorFieldProps) {
  const prevRef = useRef(value);

  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} swatch`}
          className="h-8 w-8 rounded border p-0"
          value={value}
          onFocus={() => {
            prevRef.current = value;
          }}
          onInput={(e) => onLiveChange(e.currentTarget.value)}
          onChange={(e) => onCommit(prevRef.current, e.currentTarget.value)}
        />
        <input
          type="text"
          aria-label={`${label} hex`}
          className="flex-1 rounded border px-2 py-1 text-sm"
          value={value}
          onFocus={() => {
            prevRef.current = value;
          }}
          onChange={(e) => onLiveChange(e.target.value)}
          onBlur={() => onCommit(prevRef.current, value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      </div>
    </label>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onLiveChange: (value: string) => void;
  onCommit: (prevValue: string, nextValue: string) => void;
}

function TextAreaField({ label, value, onLiveChange, onCommit }: TextAreaFieldProps) {
  const prevRef = useRef(value);

  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <textarea
        className="rounded border px-2 py-1 text-sm"
        rows={2}
        value={value}
        onFocus={() => {
          prevRef.current = value;
        }}
        onChange={(e) => onLiveChange(e.target.value)}
        onBlur={() => onCommit(prevRef.current, value)}
      />
    </label>
  );
}

export function ShapePropertiesPanel() {
  const selectedId = useEditorStore((state) => state.selectedId);
  const shape = useEditorStore((state) =>
    state.selectedId ? state.shapes[state.selectedId] : undefined
  );
  const setShapeDraft = useEditorStore((state) => state.setShapeDraft);
  const recordFieldChange = useEditorStore((state) => state.recordFieldChange);

  if (!selectedId || !shape) return null;

  const live = (updates: Record<string, unknown>) => setShapeDraft(selectedId, updates);
  const commitField =
    <T,>(field: string) =>
    (prevValue: T, nextValue: T) =>
      recordFieldChange(selectedId, field, prevValue, nextValue);

  return (
    <aside className="absolute right-3 top-1/2 z-20 flex w-56 -translate-y-1/2 flex-col gap-2 rounded-lg border bg-background p-3 shadow-md">
      {(shape.type === 'rect' || shape.type === 'circle') && (
        <ColorField
          label="Fill"
          value={shape.fill ?? '#ffffff'}
          onLiveChange={(value) => live({ fill: value })}
          onCommit={commitField<string>('fill')}
        />
      )}
      {shape.type === 'text' && (
        <ColorField
          label="Text color"
          value={shape.fill ?? '#000000'}
          onLiveChange={(value) => live({ fill: value })}
          onCommit={commitField<string>('fill')}
        />
      )}
      {shape.type !== 'text' && (
        <ColorField
          label="Stroke"
          value={shape.stroke ?? '#000000'}
          onLiveChange={(value) => live({ stroke: value })}
          onCommit={commitField<string>('stroke')}
        />
      )}
      {shape.type !== 'text' && (
        <NumberField
          label="Stroke width"
          value={shape.strokeWidth ?? 2}
          onLiveChange={(value) => live({ strokeWidth: value })}
          onCommit={commitField<number>('strokeWidth')}
        />
      )}
      {shape.type === 'text' && (
        <NumberField
          label="Font size"
          value={shape.fontSize}
          onLiveChange={(value) => live({ fontSize: value })}
          onCommit={commitField<number>('fontSize')}
        />
      )}
      {shape.type === 'text' && (
        <TextAreaField
          label="Text"
          value={shape.text}
          onLiveChange={(value) => live({ text: value })}
          onCommit={commitField<string>('text')}
        />
      )}
      {(shape.type === 'rect' || shape.type === 'circle' || shape.type === 'text') && (
        <>
          <NumberField
            label="X"
            value={shape.x}
            onLiveChange={(value) => live({ x: value })}
            onCommit={commitField<number>('x')}
          />
          <NumberField
            label="Y"
            value={shape.y}
            onLiveChange={(value) => live({ y: value })}
            onCommit={commitField<number>('y')}
          />
        </>
      )}
      {shape.type === 'rect' && (
        <>
          <NumberField
            label="Width"
            value={shape.width}
            onLiveChange={(value) => live({ width: value })}
            onCommit={commitField<number>('width')}
          />
          <NumberField
            label="Height"
            value={shape.height}
            onLiveChange={(value) => live({ height: value })}
            onCommit={commitField<number>('height')}
          />
        </>
      )}
      {shape.type === 'circle' && (
        <>
          <NumberField
            label="Radius X"
            value={shape.radiusX}
            onLiveChange={(value) => live({ radiusX: value })}
            onCommit={commitField<number>('radiusX')}
          />
          <NumberField
            label="Radius Y"
            value={shape.radiusY}
            onLiveChange={(value) => live({ radiusY: value })}
            onCommit={commitField<number>('radiusY')}
          />
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ShapePropertiesPanel.test.tsx`
Expected: PASS (all 8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ShapePropertiesPanel.tsx src/components/ShapePropertiesPanel.test.tsx
git commit -m "feat: add ShapePropertiesPanel component"
```

---

### Task 3: Wire panel into `BoardPage`

**Files:**
- Modify: `src/pages/BoardPage.tsx`
- Test: `src/pages/BoardPage.test.tsx`

- [ ] **Step 1: Write the failing test**

In `src/pages/BoardPage.test.tsx`, add `screen` to the existing import:

```tsx
import { act, render, screen } from '@testing-library/react';
```

Then add a new describe block at the end of the file:

```tsx
describe('BoardPage shape properties panel', () => {
  it('shows fields for the selected shape and swaps when selection changes', () => {
    const shapeA: RectShape = {
      id: 'a',
      type: 'rect',
      x: 1,
      y: 2,
      width: 10,
      height: 20,
      fill: '#111111',
    };
    const shapeB: RectShape = {
      id: 'b',
      type: 'rect',
      x: 3,
      y: 4,
      width: 30,
      height: 40,
      fill: '#222222',
    };

    useBoardStore.setState({
      boards: [
        {
          id: 'board-1',
          name: 'Persisted board',
          createdAt: 100,
          updatedAt: 200,
          shapes: { a: shapeA, b: shapeB },
        },
      ],
      currentBoardId: 'board-1',
    });

    render(<BoardPage />);

    act(() => {
      useEditorStore.getState().setSelectedId('a');
    });
    expect(screen.getByLabelText('X')).toHaveValue(1);

    act(() => {
      useEditorStore.getState().setSelectedId('b');
    });
    expect(screen.getByLabelText('X')).toHaveValue(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/BoardPage.test.tsx`
Expected: FAIL — `screen.getByLabelText('X')` finds no element (panel not rendered yet).

- [ ] **Step 3: Wire `ShapePropertiesPanel` into `BoardPage`**

In `src/pages/BoardPage.tsx`, add the import:

```tsx
import { ShapePropertiesPanel } from '@/components/ShapePropertiesPanel';
```

Add a `selectedId` selector alongside the existing store reads:

```tsx
  const selectedId = useEditorStore((state) => state.selectedId);
```

Add the panel to the rendered tree, after `<ZoomControls />`:

```tsx
      <ZoomControls />
      <ShapePropertiesPanel key={selectedId ?? 'none'} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/BoardPage.test.tsx`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (all test files)

- [ ] **Step 6: Commit**

```bash
git add src/pages/BoardPage.tsx src/pages/BoardPage.test.tsx
git commit -m "feat: wire ShapePropertiesPanel into BoardPage"
```
