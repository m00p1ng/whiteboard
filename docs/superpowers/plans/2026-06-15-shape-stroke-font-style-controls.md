# Shape Stroke and Font Style Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stroke color, font size, font color, and font family controls to the flowchart node's properties panel.

**Architecture:** Extend the existing `NodeStyle` type with `fontFamily`, update the default node factory and renderer, and add an "Appearance" section to `PropertiesPanel`. Reuse the existing `updateNodeStyle` store action so changes remain undoable/redoable.

**Tech Stack:** React, TypeScript, Tailwind CSS, react-konva, Zustand, Vitest, Testing Library.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/types/flowchart.ts` | Modify | Add `fontFamily?: string` to `NodeStyle`. |
| `src/store/flowchartStore.ts` | Modify | Add `fontFamily: 'Inter'` to `createDefaultNode` defaults. |
| `src/components/flowchart/NodeRenderer.tsx` | Modify | Read `style.fontFamily` and pass it to Konva `Text`. |
| `src/components/ui/color-input.tsx` | Create | Reusable color picker + hex text input. |
| `src/components/ui/select.tsx` | Create | Reusable styled `<select>` wrapper. |
| `src/components/flowchart/PropertiesPanel.tsx` | Modify | Add "Appearance" section with the four style controls. |
| `src/store/flowchartStore.test.ts` | Modify | Verify `createDefaultNode` includes `fontFamily`. |
| `src/components/flowchart/NodeRenderer.test.tsx` | Modify | Verify `fontFamily` is applied. |
| `src/components/flowchart/PropertiesPanel.test.tsx` | Modify | Verify each style control calls `updateNodeStyle`. |

---

## Task 1: Add `fontFamily` to `NodeStyle`

**Files:**
- Modify: `src/types/flowchart.ts:65-71`

- [ ] **Step 1: Add the field**

```ts
export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  textColor?: string;
  fontFamily?: string; // NEW
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/flowchart.ts
git commit -m "feat(types): add fontFamily to NodeStyle"
```

---

## Task 2: Add default `fontFamily` to `createDefaultNode`

**Files:**
- Modify: `src/store/flowchartStore.ts:113-119`

- [ ] **Step 1: Add the default value**

In `createDefaultNode`, update the `style` object:

```ts
style: {
  fill: '#ffffff',
  stroke: '#334155',
  strokeWidth: 2,
  fontSize: 14,
  textColor: '#0f172a',
  fontFamily: 'Inter',
},
```

- [ ] **Step 2: Write the test**

In `src/store/flowchartStore.test.ts`, add:

```ts
it('defaults new nodes with Inter font family', () => {
  const node = createDefaultNode('process', 100, 100);
  expect(node.style.fontFamily).toBe('Inter');
});
```

- [ ] **Step 3: Run the new test**

Run: `npx vitest run src/store/flowchartStore.test.ts -t "defaults new nodes with Inter font family"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/store/flowchartStore.ts src/store/flowchartStore.test.ts
git commit -m "feat(store): default new nodes to Inter font family"
```

---

## Task 3: Apply `fontFamily` in `NodeRenderer`

**Files:**
- Modify: `src/components/flowchart/NodeRenderer.tsx:30-35` and `src/components/flowchart/NodeRenderer.tsx:99-109`

- [ ] **Step 1: Read and apply the font family**

After the existing style destructuring, add:

```ts
const fontFamily = style.fontFamily ?? 'Inter';
```

Then pass it to the `Text` component:

```tsx
<Text
  width={width}
  height={height}
  text={label}
  fontSize={fontSize}
  fill={textColor}
  fontFamily={fontFamily}
  align="center"
  verticalAlign="middle"
  wrap="word"
  listening={false}
/>
```

- [ ] **Step 2: Write the test**

In `src/components/flowchart/NodeRenderer.test.tsx`, add:

```ts
it('applies custom fontFamily to label text', () => {
  const layerRef = { current: null as LayerType | null };
  const customNode: FlowchartNode = {
    ...node,
    style: { ...node.style, fontFamily: 'Georgia' },
  };

  function Wrapper() {
    return (
      <Stage width={400} height={400}>
        <Layer ref={(el) => { layerRef.current = el; }}>
          <NodeRenderer node={customNode} />
        </Layer>
      </Stage>
    );
  }

  render(<Wrapper />);

  const group = layerRef.current?.children[0];
  const textNode = group?.children.find(
    (child) => child.getClassName() === 'Text'
  );
  expect(textNode?.fontFamily()).toBe('Georgia');
});
```

- [ ] **Step 3: Run the new test**

Run: `npx vitest run src/components/flowchart/NodeRenderer.test.tsx -t "applies custom fontFamily to label text"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/flowchart/NodeRenderer.tsx src/components/flowchart/NodeRenderer.test.tsx
git commit -m "feat(renderer): apply fontFamily to node labels"
```

---

## Task 4: Create `ColorInput` UI Component

**Files:**
- Create: `src/components/ui/color-input.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import { Input } from '@/components/ui/input';

interface ColorInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorInput({ id, value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-9 shrink-0 cursor-pointer rounded border border-input bg-transparent p-1"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="font-mono text-xs uppercase"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/color-input.tsx
git commit -m "feat(ui): add ColorInput component"
```

---

## Task 5: Create `Select` UI Component

**Files:**
- Create: `src/components/ui/select.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export { Select };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/select.tsx
git commit -m "feat(ui): add Select component"
```

---

## Task 6: Add Appearance Section to `PropertiesPanel`

**Files:**
- Modify: `src/components/flowchart/PropertiesPanel.tsx`

- [ ] **Step 1: Add imports**

At the top of the file, add:

```ts
import { ColorInput } from '@/components/ui/color-input';
import { Select } from '@/components/ui/select';
```

- [ ] **Step 2: Add the Appearance section inside the node panel**

After the width/height grid (after the closing `</div>` for the grid), insert:

```tsx
<div className="mt-4 border-t pt-3">
  <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
    Appearance
  </h4>
  <div className="mb-3">
    <Label htmlFor="node-stroke">Stroke color</Label>
    <ColorInput
      id="node-stroke"
      value={node.style.stroke ?? '#334155'}
      onChange={(value) =>
        updateNodeStyle(node.id, { stroke: value })
      }
    />
  </div>
  <div className="mb-3">
    <Label htmlFor="node-text-color">Text color</Label>
    <ColorInput
      id="node-text-color"
      value={node.style.textColor ?? '#0f172a'}
      onChange={(value) =>
        updateNodeStyle(node.id, { textColor: value })
      }
    />
  </div>
  <div className="grid grid-cols-2 gap-2">
    <div>
      <Label htmlFor="node-font-size">Font size</Label>
      <Input
        id="node-font-size"
        type="number"
        min={8}
        max={72}
        value={node.style.fontSize ?? 14}
        onChange={(event) =>
          updateNodeStyle(node.id, {
            fontSize: Number(event.target.value),
          })
        }
      />
    </div>
    <div>
      <Label htmlFor="node-font-family">Font</Label>
      <Select
        id="node-font-family"
        value={node.style.fontFamily ?? 'Inter'}
        onChange={(event) =>
          updateNodeStyle(node.id, {
            fontFamily: event.target.value,
          })
        }
      >
        <option value="Inter">Inter</option>
        <option value="Courier New">Courier New</option>
        <option value="Georgia">Georgia</option>
      </Select>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Write the tests**

In `src/components/flowchart/PropertiesPanel.test.tsx`, add to the existing `beforeEach` setup so the node has all style fields:

```ts
style: {
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 2,
  fontSize: 14,
  textColor: '#0f172a',
  fontFamily: 'Inter',
},
```

Then add tests:

```ts
it('updates stroke color', () => {
  render(<PropertiesPanel />);
  const inputs = screen.getAllByDisplayValue('#000000');
  fireEvent.change(inputs[0], { target: { value: '#ff0000' } });
  expect(useFlowchartStore.getState().nodes['n1'].style.stroke).toBe('#ff0000');
});

it('updates text color', () => {
  render(<PropertiesPanel />);
  const inputs = screen.getAllByDisplayValue('#0f172a');
  fireEvent.change(inputs[0], { target: { value: '#00ff00' } });
  expect(useFlowchartStore.getState().nodes['n1'].style.textColor).toBe('#00ff00');
});

it('updates font size', () => {
  render(<PropertiesPanel />);
  const input = screen.getByDisplayValue('14');
  fireEvent.change(input, { target: { value: '24' } });
  expect(useFlowchartStore.getState().nodes['n1'].style.fontSize).toBe(24);
});

it('updates font family', () => {
  render(<PropertiesPanel />);
  const select = screen.getByDisplayValue('Inter');
  fireEvent.change(select, { target: { value: 'Georgia' } });
  expect(useFlowchartStore.getState().nodes['n1'].style.fontFamily).toBe('Georgia');
});
```

- [ ] **Step 4: Run the panel tests**

Run: `npx vitest run src/components/flowchart/PropertiesPanel.test.tsx`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/flowchart/PropertiesPanel.tsx src/components/flowchart/PropertiesPanel.test.tsx
git commit -m "feat(panel): add node appearance controls"
```

---

## Task 7: Final Verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 3: Run type check**

Run: `npx tsc -b`
Expected: no errors

- [ ] **Step 4: Commit any fixes**

If any fixes were needed, commit them with a descriptive message.

---

## Self-Review

**Spec coverage:**
- Stroke color control → Task 6, Step 2.
- Font size control → Task 6, Step 2.
- Font color control → Task 6, Step 2.
- Font family control → Tasks 1-3 and 6.
- Undo/redo support → uses existing `updateNodeStyle`, which already wraps changes in commands.
- Legacy shapes untouched → no tasks touch `src/types/shape.ts` or legacy shape code.

**Placeholder scan:**
- No TBD, TODO, or vague steps.
- Every code step includes actual code.
- Every test step includes actual test code.

**Type consistency:**
- `fontFamily` is added to `NodeStyle` in Task 1 before being used in Tasks 2, 3, and 6.
- `ColorInput` and `Select` are created in Tasks 4 and 5 before being imported in Task 6.
