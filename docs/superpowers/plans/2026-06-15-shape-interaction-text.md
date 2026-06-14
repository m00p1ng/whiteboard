# Shape Interaction & In-Shape Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let selected shapes remain draggable across tools, add undoable context-menu deletion, support centered text inside rectangles and circles, and improve property-panel color and numeric editing.

**Architecture:** Extend the existing rectangle/circle shape types with optional text fields and render text as a non-listening sibling Konva node so selection and transforms continue to target the geometry node. Add a dedicated DOM overlay editor for in-shape text, wire it through `Canvas`, and keep property edits on the existing `setShapeDraft`/`recordFieldChange` path. Enhance the existing local field components rather than introducing new shared abstractions.

**Tech Stack:** React 19, TypeScript 6, Zustand, Konva/react-konva, Tailwind CSS 4, Vitest, Testing Library.

---

## Reference

See `docs/superpowers/specs/2026-06-15-shape-interaction-text-design.md`.

## File Structure

- Modify `src/types/shape.ts`: define the optional text-style contract shared by rectangles and circles.
- Modify `src/components/ShapeRenderer.tsx`: render centered, non-interactive text over rectangle/circle geometry.
- Modify `src/components/ShapeRenderer.test.tsx`: verify text defaults, bounds, and empty-text behavior.
- Create `src/components/ShapeTextEditor.tsx`: provide the rectangle/circle textarea overlay and commit/cancel behavior.
- Create `src/components/ShapeTextEditor.test.tsx`: verify viewport geometry, focus/select, blur commit, and Escape cancellation.
- Modify `src/components/Canvas.tsx`: keep selected shapes draggable, open the correct editor, and delete from the context menu.
- Modify `src/components/Canvas.test.tsx`: verify draggable state, editor routing/commit integration, and deletion.
- Modify `src/components/ShapeContextMenu.tsx`: add a visually separated destructive Delete action.
- Modify `src/components/ShapeContextMenu.test.tsx`: verify the Delete callback.
- Modify `src/components/ShapePropertiesPanel.tsx`: expose rectangle/circle text fields, transparent colors, and numeric precision.
- Modify `src/components/ShapePropertiesPanel.test.tsx`: verify the new fields, transparent restoration, and rounding.

### Task 1: Add Rectangle/Circle Text Data and Rendering

**Files:**
- Modify: `src/types/shape.ts:1-31`
- Modify: `src/components/ShapeRenderer.tsx:1-85`
- Test: `src/components/ShapeRenderer.test.tsx`

- [ ] **Step 1: Write failing renderer tests**

Replace the `react-konva` mock at the top of `src/components/ShapeRenderer.test.tsx` with a mock that exposes rectangle, ellipse, and text props:

```tsx
vi.mock('react-konva', () => ({
  Rect: ({
    width,
    height,
  }: {
    width: number;
    height: number;
  }) => (
    <div
      data-testid="rect-node"
      data-width={width}
      data-height={height}
    />
  ),
  Circle: () => null,
  Line: () => null,
  Text: ({
    text,
    x,
    y,
    width,
    height,
    fill,
    fontSize,
    rotation,
    listening,
    align,
    verticalAlign,
    wrap,
  }: {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    fontSize: number;
    rotation: number;
    listening: boolean;
    align: string;
    verticalAlign: string;
    wrap: string;
  }) => (
    <div
      data-testid="shape-text"
      data-text={text}
      data-x={x}
      data-y={y}
      data-width={width}
      data-height={height}
      data-fill={fill}
      data-font-size={fontSize}
      data-rotation={rotation}
      data-listening={String(listening)}
      data-align={align}
      data-vertical-align={verticalAlign}
      data-wrap={wrap}
    />
  ),
  Ellipse: ({
    radiusX,
    radiusY,
    onTransformEnd,
    onContextMenu,
  }: {
    radiusX: number;
    radiusY: number;
    onTransformEnd: (event: { target: unknown }) => void;
    onContextMenu?: (event: { evt: Event }) => void;
  }) => (
    <button
      type="button"
      aria-label="ellipse"
      data-radius-x={radiusX}
      data-radius-y={radiusY}
      onContextMenu={(e) => onContextMenu?.({ evt: e.nativeEvent })}
      onClick={() => {
        let scaleX = 2;
        let scaleY = 3;
        const scaleXAccessor = vi.fn((value?: number) => {
          if (value !== undefined) scaleX = value;
          return scaleX;
        });
        const scaleYAccessor = vi.fn((value?: number) => {
          if (value !== undefined) scaleY = value;
          return scaleY;
        });
        onTransformEnd({
          target: {
            x: () => 30,
            y: () => 40,
            rotation: () => 15,
            scaleX: scaleXAccessor,
            scaleY: scaleYAccessor,
          },
        });
      }}
    />
  ),
}));
```

Update the type import:

```ts
import type { CircleShape, RectShape } from '@/types/shape';
```

Add these tests after the existing ellipse tests:

```tsx
describe('ShapeRenderer in-shape text', () => {
  it('renders rectangle text with explicit style and rectangle bounds', () => {
    const rect: RectShape = {
      id: 'rect',
      type: 'rect',
      x: 10,
      y: 20,
      width: 120,
      height: 70,
      rotation: 12,
      text: 'Decision',
      fontSize: 22,
      textColor: '#123456',
    };

    render(
      <ShapeRenderer
        shape={rect}
        isSelected={false}
        onSelect={() => undefined}
      />
    );

    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-text',
      'Decision'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-x',
      '10'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-y',
      '20'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-width',
      '120'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-height',
      '70'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-fill',
      '#123456'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-font-size',
      '22'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-rotation',
      '12'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-listening',
      'false'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-align',
      'center'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-vertical-align',
      'middle'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-wrap',
      'word'
    );
  });

  it('renders circle text with default style and diameter bounds', () => {
    render(
      <ShapeRenderer
        shape={{ ...ellipse, text: 'Start' }}
        isSelected={false}
        onSelect={() => undefined}
      />
    );

    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-x',
      '-15'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-y',
      '10'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-width',
      '50'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-height',
      '20'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-fill',
      '#000000'
    );
    expect(screen.getByTestId('shape-text')).toHaveAttribute(
      'data-font-size',
      '16'
    );
  });

  it.each([
    ['absent', undefined],
    ['empty', ''],
  ])('does not render %s rectangle text', (_label, text) => {
    const rect: RectShape = {
      id: 'rect',
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      text,
    };

    render(
      <ShapeRenderer
        shape={rect}
        isSelected={false}
        onSelect={() => undefined}
      />
    );

    expect(screen.queryByTestId('shape-text')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the renderer tests and verify failure**

Run:

```bash
rtk npm test -- src/components/ShapeRenderer.test.tsx
```

Expected: FAIL because `RectShape`/`CircleShape` do not expose `text`, `fontSize`, or `textColor`, and `ShapeRenderer` does not render `shape-text`.

- [ ] **Step 3: Add the shared text-style interface**

In `src/types/shape.ts`, insert after `BaseShape`:

```ts
export interface ShapeTextStyle {
  text?: string;
  fontSize?: number;
  textColor?: string;
}
```

Change the rectangle and circle declarations to:

```ts
export interface RectShape extends BaseShape, ShapeTextStyle {
  type: 'rect';
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape, ShapeTextStyle {
  type: 'circle';
  radiusX: number;
  radiusY: number;
}
```

- [ ] **Step 4: Render sibling text nodes without grouping geometry**

In `src/components/ShapeRenderer.tsx`, add this helper immediately before the component:

```tsx
function renderShapeText(shape: Extract<Shape, { type: 'rect' | 'circle' }>) {
  if (!shape.text) return null;

  const bounds =
    shape.type === 'rect'
      ? {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        }
      : {
          x: shape.x - shape.radiusX,
          y: shape.y - shape.radiusY,
          width: shape.radiusX * 2,
          height: shape.radiusY * 2,
        };

  return (
    <Text
      {...bounds}
      text={shape.text}
      fill={shape.textColor ?? '#000000'}
      fontSize={shape.fontSize ?? 16}
      rotation={shape.rotation ?? 0}
      align="center"
      verticalAlign="middle"
      wrap="word"
      listening={false}
    />
  );
}
```

Replace the rectangle and circle switch branches with fragments:

```tsx
    case 'rect':
      return (
        <>
          <Rect {...common} width={shape.width} height={shape.height} />
          {renderShapeText(shape)}
        </>
      );
    case 'circle':
      return (
        <>
          <Ellipse
            {...common}
            radiusX={shape.radiusX}
            radiusY={shape.radiusY}
          />
          {renderShapeText(shape)}
        </>
      );
```

- [ ] **Step 5: Run the renderer tests**

Run:

```bash
rtk npm test -- src/components/ShapeRenderer.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/types/shape.ts src/components/ShapeRenderer.tsx src/components/ShapeRenderer.test.tsx
rtk git commit -m "feat: render text inside shapes"
```

### Task 2: Build the In-Shape Text Editor Overlay

**Files:**
- Create: `src/components/ShapeTextEditor.tsx`
- Create: `src/components/ShapeTextEditor.test.tsx`

- [ ] **Step 1: Write failing editor tests**

Create `src/components/ShapeTextEditor.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CircleShape, RectShape } from '@/types/shape';
import { ShapeTextEditor } from './ShapeTextEditor';

const viewport = { scale: 2, offsetX: 40, offsetY: 20 };

describe('ShapeTextEditor', () => {
  it('positions and styles a rectangle editor in screen space', () => {
    const shape: RectShape = {
      id: 'rect',
      type: 'rect',
      x: 10,
      y: 15,
      width: 100,
      height: 50,
      text: 'Hello',
      fontSize: 18,
      textColor: '#123456',
    };

    render(
      <ShapeTextEditor
        shape={shape}
        viewport={viewport}
        onCommit={() => undefined}
        onClose={() => undefined}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Shape text' });
    const overlay = screen.getByTestId('shape-text-editor-overlay');
    expect(editor).toHaveValue('Hello');
    expect(editor).toHaveFocus();
    expect(editor.selectionStart).toBe(0);
    expect(editor.selectionEnd).toBe('Hello'.length);
    expect(overlay).toHaveStyle({
      left: '60px',
      top: '50px',
      width: '200px',
      height: '100px',
    });
    expect(editor).toHaveStyle({
      fontSize: '36px',
      color: '#123456',
    });
  });

  it('uses circle diameter bounds and default text styles', () => {
    const shape: CircleShape = {
      id: 'circle',
      type: 'circle',
      x: 50,
      y: 40,
      radiusX: 20,
      radiusY: 10,
    };

    render(
      <ShapeTextEditor
        shape={shape}
        viewport={viewport}
        onCommit={() => undefined}
        onClose={() => undefined}
      />
    );

    expect(screen.getByTestId('shape-text-editor-overlay')).toHaveStyle({
      left: '100px',
      top: '80px',
      width: '80px',
      height: '40px',
    });
    expect(screen.getByRole('textbox', { name: 'Shape text' })).toHaveStyle({
      fontSize: '32px',
      color: '#000000',
    });
  });

  it('commits the current value on blur and closes', () => {
    const onCommit = vi.fn();
    const onClose = vi.fn();
    const shape: RectShape = {
      id: 'rect',
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      text: 'Before',
    };

    render(
      <ShapeTextEditor
        shape={shape}
        viewport={viewport}
        onCommit={onCommit}
        onClose={onClose}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Shape text' });
    fireEvent.change(editor, { target: { value: 'After' } });
    fireEvent.blur(editor);

    expect(onCommit).toHaveBeenCalledWith('After');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes without committing on Escape', () => {
    const onCommit = vi.fn();
    const onClose = vi.fn();
    const shape: RectShape = {
      id: 'rect',
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      text: 'Before',
    };

    render(
      <ShapeTextEditor
        shape={shape}
        viewport={viewport}
        onCommit={onCommit}
        onClose={onClose}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Shape text' });
    fireEvent.keyDown(editor, { key: 'Escape' });

    expect(onCommit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the editor test and verify failure**

Run:

```bash
rtk npm test -- src/components/ShapeTextEditor.test.tsx
```

Expected: FAIL because `ShapeTextEditor.tsx` does not exist.

- [ ] **Step 3: Implement the focused overlay component**

Create `src/components/ShapeTextEditor.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import type { CircleShape, RectShape } from '@/types/shape';

interface ShapeTextEditorProps {
  shape: RectShape | CircleShape;
  viewport: { scale: number; offsetX: number; offsetY: number };
  onCommit: (text: string) => void;
  onClose: () => void;
}

export function ShapeTextEditor({
  shape,
  viewport,
  onCommit,
  onClose,
}: ShapeTextEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const worldBounds =
    shape.type === 'rect'
      ? {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        }
      : {
          x: shape.x - shape.radiusX,
          y: shape.y - shape.radiusY,
          width: shape.radiusX * 2,
          height: shape.radiusY * 2,
        };

  return (
    <div
      data-testid="shape-text-editor-overlay"
      className="absolute z-20 flex items-center border border-blue-500 bg-white/90"
      style={{
        left: worldBounds.x * viewport.scale + viewport.offsetX,
        top: worldBounds.y * viewport.scale + viewport.offsetY,
        width: worldBounds.width * viewport.scale,
        height: worldBounds.height * viewport.scale,
      }}
    >
      <textarea
        ref={inputRef}
        aria-label="Shape text"
        rows={1}
        defaultValue={shape.text ?? ''}
        className="max-h-full w-full resize-none overflow-auto border-0 bg-transparent p-2 text-center outline-none"
        style={{
          fontSize: (shape.fontSize ?? 16) * viewport.scale,
          color: shape.textColor ?? '#000000',
        }}
        onBlur={(event) => {
          if (!cancelledRef.current) onCommit(event.currentTarget.value);
          onClose();
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          cancelledRef.current = true;
          event.preventDefault();
          onClose();
        }}
      />
    </div>
  );
}
```

The `cancelledRef` prevents the blur caused by closing the editor after Escape from committing.

- [ ] **Step 4: Run the editor tests**

Run:

```bash
rtk npm test -- src/components/ShapeTextEditor.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/ShapeTextEditor.tsx src/components/ShapeTextEditor.test.tsx
rtk git commit -m "feat: add in-shape text editor"
```

### Task 3: Wire Selected-Shape Dragging and In-Shape Editing into Canvas

**Files:**
- Modify: `src/components/Canvas.tsx:5-40,289-294,329-358`
- Modify: `src/components/Canvas.test.tsx`

- [ ] **Step 1: Extend the Canvas test mocks**

In the `ShapeRenderer` mock in `src/components/Canvas.test.tsx`, accept `draggable` and `onDblClick`, expose draggable state, and add a double-click button:

```tsx
vi.mock('./ShapeRenderer', () => ({
  ShapeRenderer: ({
    shape,
    draggable,
    onSelect,
    onDblClick,
    onContextMenu,
  }: {
    shape: { id: string };
    draggable: boolean;
    onSelect: () => void;
    onDblClick?: () => void;
    onContextMenu?: (e: {
      evt: { preventDefault: () => void; clientX: number; clientY: number };
    }) => void;
  }) => (
    <div>
      <button
        type="button"
        data-testid={`shape-${shape.id}`}
        data-draggable={String(draggable)}
        onClick={onSelect}
      />
      <button
        type="button"
        aria-label={`edit-${shape.id}`}
        onDoubleClick={onDblClick}
      />
      <button
        type="button"
        aria-label={`context-menu-${shape.id}`}
        onClick={() =>
          onContextMenu?.({
            evt: { preventDefault: vi.fn(), clientX: 50, clientY: 60 },
          })
        }
      />
    </div>
  ),
}));
```

Add a `ShapeTextEditor` mock after the existing `TextEditor` mock:

```tsx
vi.mock('./ShapeTextEditor', () => ({
  ShapeTextEditor: ({
    shape,
    onCommit,
    onClose,
  }: {
    shape: { id: string; text?: string };
    onCommit: (text: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="shape-text-editor">
      <span>{shape.id}</span>
      <button type="button" onClick={() => onCommit('Updated shape text')}>
        Commit shape text
      </button>
      <button type="button" onClick={onClose}>
        Close shape text
      </button>
    </div>
  ),
}));
```

- [ ] **Step 2: Write failing Canvas interaction tests**

Add after `gesture()`:

```tsx
describe('Canvas selected shape interaction', () => {
  it('keeps the selected shape draggable while a creation tool is active', () => {
    useEditorStore.getState().setTool('circle');
    render(<Canvas />);

    expect(screen.getByTestId('shape-existing')).toHaveAttribute(
      'data-draggable',
      'true'
    );
  });

  it('does not make an unselected shape draggable outside the select tool', () => {
    useEditorStore.setState({
      shapes: {
        existing: existingShape,
        other: { ...existingShape, id: 'other' },
      },
      selectedId: 'existing',
      tool: 'rect',
    });
    render(<Canvas />);

    expect(screen.getByTestId('shape-other')).toHaveAttribute(
      'data-draggable',
      'false'
    );
  });

  it.each(['rect', 'circle'] as const)(
    'opens the in-shape editor for a %s and commits text',
    (type) => {
      const shape =
        type === 'rect'
          ? existingShape
          : {
              id: 'existing',
              type: 'circle' as const,
              x: 50,
              y: 40,
              radiusX: 20,
              radiusY: 10,
            };
      useEditorStore.setState({
        shapes: { existing: shape },
        selectedId: 'existing',
      });
      render(<Canvas />);

      fireEvent.doubleClick(
        screen.getByRole('button', { name: 'edit-existing' })
      );
      expect(screen.getByTestId('shape-text-editor')).toHaveTextContent(
        'existing'
      );

      fireEvent.click(screen.getByText('Commit shape text'));

      expect(useEditorStore.getState().shapes.existing).toMatchObject({
        text: 'Updated shape text',
      });
      expect(screen.queryByTestId('shape-text-editor')).not.toBeInTheDocument();
    }
  );
});
```

- [ ] **Step 3: Run Canvas tests and verify failure**

Run:

```bash
rtk npm test -- src/components/Canvas.test.tsx
```

Expected: FAIL because selected shapes are only draggable under the select tool and rectangle/circle double-clicks do not open an editor.

- [ ] **Step 4: Add Canvas editor state and routing**

In `src/components/Canvas.tsx`, change the shape type import and add the new component import:

```ts
import type { CircleShape, RectShape, TextShape } from '@/types/shape';
import { ShapeTextEditor } from './ShapeTextEditor';
```

Add state beside `editingTextId`:

```ts
  const [editingShapeTextId, setEditingShapeTextId] = useState<string | null>(
    null
  );
```

Replace `handleShapeDblClick` with:

```ts
  const handleShapeDblClick = (shapeId: string) => {
    const shape = shapes[shapeId];
    if (shape?.type === 'text') {
      setEditingTextId(shapeId);
      return;
    }
    if (shape?.type === 'rect' || shape?.type === 'circle') {
      setEditingShapeTextId(shapeId);
    }
  };
```

Change the `ShapeRenderer` draggable prop to:

```tsx
              draggable={
                !spacePressed &&
                (tool === 'select' || shape.id === selectedId)
              }
```

Render the new editor immediately after the existing `TextEditor` block:

```tsx
      {editingShapeTextId &&
        (shapes[editingShapeTextId]?.type === 'rect' ||
          shapes[editingShapeTextId]?.type === 'circle') && (
          <ShapeTextEditor
            shape={
              shapes[editingShapeTextId] as RectShape | CircleShape
            }
            viewport={viewport}
            onCommit={(text) => {
              updateShape(editingShapeTextId, { text });
              setEditingShapeTextId(null);
            }}
            onClose={() => setEditingShapeTextId(null)}
          />
        )}
```

- [ ] **Step 5: Run Canvas tests**

Run:

```bash
rtk npm test -- src/components/Canvas.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/Canvas.tsx src/components/Canvas.test.tsx
rtk git commit -m "feat: edit and drag selected shapes"
```

### Task 4: Add Undoable Delete to the Shape Context Menu

**Files:**
- Modify: `src/components/ShapeContextMenu.tsx:1-54`
- Modify: `src/components/ShapeContextMenu.test.tsx`
- Modify: `src/components/Canvas.tsx:25-36,359-383`
- Modify: `src/components/Canvas.test.tsx`

- [ ] **Step 1: Write the failing menu callback test**

In the first test in `src/components/ShapeContextMenu.test.tsx`, define:

```ts
    const onDelete = vi.fn();
```

Pass it to the component:

```tsx
        onDelete={onDelete}
```

Then add:

```ts
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
```

In the second test, pass:

```tsx
        onDelete={() => undefined}
```

- [ ] **Step 2: Run the context-menu tests and verify failure**

Run:

```bash
rtk npm test -- src/components/ShapeContextMenu.test.tsx
```

Expected: FAIL because `ShapeContextMenu` has no `onDelete` prop or Delete item.

- [ ] **Step 3: Add the destructive menu item**

Add to `ShapeContextMenuProps`:

```ts
  onDelete: () => void;
```

Destructure `onDelete`, then append this button after `Send to Back`:

```tsx
      <div className="my-1 border-t border-gray-200" />
      <button
        type="button"
        className={`${itemClass} text-red-600 hover:bg-red-50`}
        onClick={onDelete}
      >
        Delete
      </button>
```

- [ ] **Step 4: Run the context-menu tests**

Run:

```bash
rtk npm test -- src/components/ShapeContextMenu.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Write a failing Canvas deletion test**

Extend the `ShapeContextMenu` mock prop type in `src/components/Canvas.test.tsx` with:

```ts
    onDelete: () => void;
```

Destructure `onDelete` and append:

```tsx
      <button type="button" onClick={onDelete}>
        Delete
      </button>
```

Add to `describe('Canvas shape context menu', ...)`:

```tsx
  it('deletes the shape, clears selection, and closes the menu', () => {
    render(<Canvas />);

    fireEvent.click(
      screen.getByRole('button', { name: 'context-menu-existing' })
    );
    fireEvent.click(screen.getByText('Delete'));

    expect(useEditorStore.getState().shapes.existing).toBeUndefined();
    expect(useEditorStore.getState().selectedId).toBeNull();
    expect(useEditorStore.getState().undoStack).toHaveLength(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().shapes.existing).toEqual(existingShape);
  });
```

- [ ] **Step 6: Run the Canvas test and verify failure**

Run:

```bash
rtk npm test -- src/components/Canvas.test.tsx
```

Expected: FAIL because `Canvas` does not pass `onDelete`.

- [ ] **Step 7: Wire deletion through the existing store action**

In `src/components/Canvas.tsx`, select `removeShape` beside `updateShape`:

```ts
  const removeShape = useEditorStore((s) => s.removeShape);
```

Pass this callback to `ShapeContextMenu`:

```tsx
          onDelete={() => {
            removeShape(contextMenu.shapeId);
            setSelectedId(null);
            setContextMenu(null);
          }}
```

- [ ] **Step 8: Run both context-menu suites**

Run:

```bash
rtk npm test -- src/components/ShapeContextMenu.test.tsx src/components/Canvas.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
rtk git add src/components/ShapeContextMenu.tsx src/components/ShapeContextMenu.test.tsx src/components/Canvas.tsx src/components/Canvas.test.tsx
rtk git commit -m "feat: delete shapes from context menu"
```

### Task 5: Add Rectangle/Circle Text Fields to Properties

**Files:**
- Modify: `src/components/ShapePropertiesPanel.tsx:143-192`
- Modify: `src/components/ShapePropertiesPanel.test.tsx`

- [ ] **Step 1: Add text styles to rectangle/circle fixtures**

Update `rect` in `src/components/ShapePropertiesPanel.test.tsx`:

```ts
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
  text: 'Decision',
  fontSize: 20,
  textColor: '#123456',
};
```

Update `circle`:

```ts
const circle: CircleShape = {
  id: 'c1',
  type: 'circle',
  x: 5,
  y: 6,
  radiusX: 30,
  radiusY: 40,
  fill: '#00ff00',
  text: 'Start',
  fontSize: 18,
  textColor: '#654321',
};
```

- [ ] **Step 2: Write failing property-field assertions**

In `'renders rect fields with current values'`, add:

```ts
    expect(screen.getByLabelText('Text')).toHaveValue('Decision');
    expect(screen.getByLabelText('Font size')).toHaveValue(20);
    expect(screen.getByLabelText('Text color hex')).toHaveValue('#123456');
```

In `'renders circle fields'`, add:

```ts
    expect(screen.getByLabelText('Text')).toHaveValue('Start');
    expect(screen.getByLabelText('Font size')).toHaveValue(18);
    expect(screen.getByLabelText('Text color hex')).toHaveValue('#654321');
```

Add this test:

```tsx
  it('uses defaults and updates rectangle text fields through draft/commit', () => {
    const plainRect: RectShape = {
      id: 'plain',
      type: 'rect',
      x: 0,
      y: 0,
      width: 80,
      height: 40,
    };
    useEditorStore.setState({
      shapes: { plain: plainRect },
      selectedId: 'plain',
    });
    render(<ShapePropertiesPanel />);

    expect(screen.getByLabelText('Text')).toHaveValue('');
    expect(screen.getByLabelText('Font size')).toHaveValue(16);
    expect(screen.getByLabelText('Text color hex')).toHaveValue('#000000');

    const textInput = screen.getByLabelText('Text');
    fireEvent.focus(textInput);
    fireEvent.change(textInput, { target: { value: 'New label' } });
    fireEvent.blur(textInput);

    expect(useEditorStore.getState().shapes.plain).toMatchObject({
      text: 'New label',
    });
    expect(useEditorStore.getState().undoStack).toHaveLength(1);
  });
```

- [ ] **Step 3: Run the properties tests and verify failure**

Run:

```bash
rtk npm test -- src/components/ShapePropertiesPanel.test.tsx
```

Expected: FAIL because rectangle/circle selections do not render Text, Font size, or Text color fields.

- [ ] **Step 4: Render shape text controls after Fill/Stroke**

In `src/components/ShapePropertiesPanel.tsx`, insert after the Stroke field block and before Stroke width:

```tsx
      {(shape.type === 'rect' || shape.type === 'circle') && (
        <TextAreaField
          label="Text"
          value={shape.text ?? ''}
          onLiveChange={(value) => live({ text: value })}
          onCommit={commitField<string>('text')}
        />
      )}
      {(shape.type === 'rect' || shape.type === 'circle') && (
        <NumberField
          label="Font size"
          value={shape.fontSize ?? 16}
          onLiveChange={(value) => live({ fontSize: value })}
          onCommit={commitField<number>('fontSize')}
        />
      )}
      {(shape.type === 'rect' || shape.type === 'circle') && (
        <ColorField
          label="Text color"
          value={shape.textColor ?? '#000000'}
          onLiveChange={(value) => live({ textColor: value })}
          onCommit={commitField<string>('textColor')}
        />
      )}
```

Keep the existing standalone text-shape controls unchanged.

- [ ] **Step 5: Run the properties tests**

Run:

```bash
rtk npm test -- src/components/ShapePropertiesPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/ShapePropertiesPanel.tsx src/components/ShapePropertiesPanel.test.tsx
rtk git commit -m "feat: edit text styles for shapes"
```

### Task 6: Support Transparent Colors with Restoration

**Files:**
- Modify: `src/components/ShapePropertiesPanel.tsx:1-89`
- Modify: `src/components/ShapePropertiesPanel.test.tsx`

- [ ] **Step 1: Write failing transparent-color tests**

Add to `src/components/ShapePropertiesPanel.test.tsx`:

```tsx
  it('sets Fill to transparent and restores the last opaque value', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    render(<ShapePropertiesPanel />);

    const transparent = screen.getByRole('checkbox', {
      name: 'Fill transparent',
    });
    fireEvent.click(transparent);

    expect(useEditorStore.getState().shapes.r1.fill).toBe('transparent');
    expect(screen.getByLabelText('Fill swatch')).toBeDisabled();
    expect(screen.getByLabelText('Fill hex')).toBeDisabled();

    fireEvent.click(transparent);

    expect(useEditorStore.getState().shapes.r1.fill).toBe('#ff0000');
    expect(screen.getByLabelText('Fill swatch')).toBeEnabled();
    expect(screen.getByLabelText('Fill hex')).toBeEnabled();
  });

  it('uses the per-field fallback when an initially transparent color is restored', () => {
    const transparentRect: RectShape = {
      ...rect,
      fill: 'transparent',
      stroke: 'transparent',
      textColor: 'transparent',
    };
    useEditorStore.setState({
      shapes: { r1: transparentRect },
      selectedId: 'r1',
    });
    render(<ShapePropertiesPanel />);

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Fill transparent' })
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Stroke transparent' })
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Text color transparent' })
    );

    expect(useEditorStore.getState().shapes.r1).toMatchObject({
      fill: '#ffffff',
      stroke: '#000000',
      textColor: '#000000',
    });
  });

  it('supports transparent standalone text color', () => {
    useEditorStore.setState({ shapes: { t1: text }, selectedId: 't1' });
    render(<ShapePropertiesPanel />);

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Text color transparent' })
    );

    expect(useEditorStore.getState().shapes.t1.fill).toBe('transparent');
  });
```

- [ ] **Step 2: Run the properties tests and verify failure**

Run:

```bash
rtk npm test -- src/components/ShapePropertiesPanel.test.tsx
```

Expected: FAIL because no Transparent checkboxes exist.

- [ ] **Step 3: Track the last opaque value and render the checkbox**

Change the React import in `src/components/ShapePropertiesPanel.tsx`:

```ts
import { useEffect, useId, useRef } from 'react';
```

Replace `ColorField` with:

```tsx
function ColorField({ label, value, onLiveChange, onCommit }: ColorFieldProps) {
  const id = useId();
  const transparentId = useId();
  const prevRef = useRef(value);
  const fallback = label === 'Fill' ? '#ffffff' : '#000000';
  const lastOpaqueRef = useRef(value === 'transparent' ? fallback : value);
  const isTransparent = value === 'transparent';

  useEffect(() => {
    if (value !== 'transparent') lastOpaqueRef.current = value;
  }, [value]);

  const toggleTransparent = (checked: boolean) => {
    const nextValue = checked ? 'transparent' : lastOpaqueRef.current;
    onLiveChange(nextValue);
    onCommit(value, nextValue);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
        <label
          htmlFor={transparentId}
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <input
            id={transparentId}
            type="checkbox"
            aria-label={`${label} transparent`}
            checked={isTransparent}
            onChange={(event) => toggleTransparent(event.currentTarget.checked)}
          />
          Transparent
        </label>
      </div>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} swatch`}
          className="h-9 w-9 rounded-md border border-input bg-transparent p-1"
          value={isTransparent ? lastOpaqueRef.current : value}
          disabled={isTransparent}
          onFocus={() => {
            prevRef.current = value;
          }}
          onInput={(event) => {
            lastOpaqueRef.current = event.currentTarget.value;
            onLiveChange(event.currentTarget.value);
          }}
          onChange={(event) => {
            lastOpaqueRef.current = event.currentTarget.value;
            onCommit(prevRef.current, event.currentTarget.value);
          }}
        />
        <Input
          id={id}
          type="text"
          aria-label={`${label} hex`}
          className="flex-1"
          value={value}
          disabled={isTransparent}
          onFocus={() => {
            prevRef.current = value;
          }}
          onChange={(event) => onLiveChange(event.target.value)}
          onBlur={() => onCommit(prevRef.current, value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      </div>
    </div>
  );
}
```

The checkbox uses `onLiveChange` plus `onCommit` so toggling produces the same single undoable field change as blur-based edits.

- [ ] **Step 4: Run the properties tests**

Run:

```bash
rtk npm test -- src/components/ShapePropertiesPanel.test.tsx
```

Expected: PASS, including existing swatch/hex synchronization.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/ShapePropertiesPanel.tsx src/components/ShapePropertiesPanel.test.tsx
rtk git commit -m "feat: support transparent shape colors"
```

### Task 7: Round and Format Geometry Fields

**Files:**
- Modify: `src/components/ShapePropertiesPanel.tsx:7-41,193-240`
- Modify: `src/components/ShapePropertiesPanel.test.tsx`

- [ ] **Step 1: Write failing precision tests**

Add to `src/components/ShapePropertiesPanel.test.tsx`:

```tsx
  it('rounds X and Y to integers during editing and commit', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    render(<ShapePropertiesPanel />);

    const xInput = screen.getByLabelText('X');
    fireEvent.focus(xInput);
    fireEvent.change(xInput, { target: { value: '12.6' } });

    expect(xInput).toHaveValue(13);
    expect(useEditorStore.getState().shapes.r1.x).toBe(13);

    fireEvent.blur(xInput);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().shapes.r1.x).toBe(10);
  });

  it('rounds rectangle dimensions to two decimals', () => {
    useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
    render(<ShapePropertiesPanel />);

    const widthInput = screen.getByLabelText('Width');
    fireEvent.focus(widthInput);
    fireEvent.change(widthInput, { target: { value: '123.456' } });

    expect(widthInput).toHaveValue(123.46);
    expect(useEditorStore.getState().shapes.r1.width).toBe(123.46);
  });

  it('rounds circle radii to two decimals without rounding font size', () => {
    useEditorStore.setState({ shapes: { c1: circle }, selectedId: 'c1' });
    render(<ShapePropertiesPanel />);

    fireEvent.change(screen.getByLabelText('Radius X'), {
      target: { value: '10.555' },
    });
    fireEvent.change(screen.getByLabelText('Font size'), {
      target: { value: '18.125' },
    });

    expect(useEditorStore.getState().shapes.c1).toMatchObject({
      radiusX: 10.56,
      fontSize: 18.125,
    });
  });
```

- [ ] **Step 2: Run the properties tests and verify failure**

Run:

```bash
rtk npm test -- src/components/ShapePropertiesPanel.test.tsx
```

Expected: FAIL because `NumberField` forwards raw parsed values.

- [ ] **Step 3: Add optional precision to NumberField**

Replace `NumberFieldProps` and `NumberField` with:

```tsx
interface NumberFieldProps {
  label: string;
  value: number;
  precision?: number;
  onLiveChange: (value: number) => void;
  onCommit: (prevValue: number, nextValue: number) => void;
}

function NumberField({
  label,
  value,
  precision,
  onLiveChange,
  onCommit,
}: NumberFieldProps) {
  const id = useId();
  const prevRef = useRef(value);
  const round = (nextValue: number) =>
    precision === undefined
      ? nextValue
      : parseFloat(nextValue.toFixed(precision));
  const displayValue =
    precision === undefined ? value : value.toFixed(precision);

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        value={displayValue}
        onFocus={() => {
          prevRef.current = value;
        }}
        onChange={(event) => {
          const parsed = parseFloat(event.target.value);
          onLiveChange(round(Number.isNaN(parsed) ? 0 : parsed));
        }}
        onBlur={() => onCommit(prevRef.current, round(value))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Apply precision only to position and size fields**

Add `precision={0}` to both X and Y fields:

```tsx
          <NumberField
            label="X"
            value={shape.x}
            precision={0}
            onLiveChange={(value) => live({ x: value })}
            onCommit={commitField<number>('x')}
          />
          <NumberField
            label="Y"
            value={shape.y}
            precision={0}
            onLiveChange={(value) => live({ y: value })}
            onCommit={commitField<number>('y')}
          />
```

Use these complete rectangle dimension fields:

```tsx
          <NumberField
            label="Width"
            value={shape.width}
            precision={2}
            onLiveChange={(value) => live({ width: value })}
            onCommit={commitField<number>('width')}
          />
          <NumberField
            label="Height"
            value={shape.height}
            precision={2}
            onLiveChange={(value) => live({ height: value })}
            onCommit={commitField<number>('height')}
          />
```

Use these complete circle fields:

```tsx
          <NumberField
            label="Radius X"
            value={shape.radiusX}
            precision={2}
            onLiveChange={(value) => live({ radiusX: value })}
            onCommit={commitField<number>('radiusX')}
          />
          <NumberField
            label="Radius Y"
            value={shape.radiusY}
            precision={2}
            onLiveChange={(value) => live({ radiusY: value })}
            onCommit={commitField<number>('radiusY')}
          />
```

Do not add `precision` to either Font size field or Stroke width.

- [ ] **Step 5: Run the properties tests**

Run:

```bash
rtk npm test -- src/components/ShapePropertiesPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run the complete verification suite**

Run:

```bash
rtk npm test
rtk npm run lint
rtk npm run build
```

Expected: all Vitest suites pass, ESLint exits successfully, and TypeScript/Vite production build succeeds.

- [ ] **Step 7: Commit**

```bash
rtk git add src/components/ShapePropertiesPanel.tsx src/components/ShapePropertiesPanel.test.tsx
rtk git commit -m "feat: round shape geometry fields"
```

## Self-Review

- Spec coverage: Tasks 1-7 cover selected-shape dragging, context-menu deletion, shape text data/rendering/editing, property fields, transparent colors, and numeric precision.
- Existing behavior preserved: standalone `TextEditor`, connector click handling, stage-only creation gestures, selection transforms, and store command APIs remain unchanged.
- Type consistency: `ShapeTextStyle` uses `text`, `fontSize`, and `textColor`; `ShapeTextEditor` accepts `RectShape | CircleShape`; Canvas commits `{ text }`; the properties panel writes the same fields.
- Placeholder scan: no implementation steps use deferred or unspecified behavior.
