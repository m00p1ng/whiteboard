# Shadcn Settings Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `ShapePropertiesPanel` form controls with local shadcn/ui primitives while preserving its floating container and editing behavior.

**Architecture:** Add focused `Input`, `Label`, and `Textarea` primitives under `src/components/ui`, then compose them inside the panel's existing field helper components. The editor store, shape model, panel placement, field visibility, and undo flow remain unchanged.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS 4, shadcn/ui conventions, Radix Label, Vitest, React Testing Library.

---

## File Structure

- Create `src/components/ui/input.tsx`: reusable shadcn text and number input primitive.
- Create `src/components/ui/label.tsx`: accessible shadcn label primitive backed by Radix Label.
- Create `src/components/ui/textarea.tsx`: reusable shadcn textarea primitive.
- Create `src/components/ui/form-controls.test.tsx`: focused contract tests for the new primitives.
- Modify `src/components/ShapePropertiesPanel.tsx`: compose the new primitives inside existing field helpers.
- Modify `package.json`: add `@radix-ui/react-label`.
- Modify `package-lock.json`: lock the installed label dependency.

### Task 1: Add shadcn Form Primitives

**Files:**
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/form-controls.test.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write the failing primitive tests**

Create `src/components/ui/form-controls.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';

describe('shadcn form controls', () => {
  it('associates a label with an input', () => {
    render(
      <>
        <Label htmlFor="width">Width</Label>
        <Input id="width" defaultValue="100" />
      </>
    );

    expect(screen.getByLabelText('Width')).toHaveValue('100');
  });

  it('merges custom classes into input and textarea styles', () => {
    render(
      <>
        <Input aria-label="Name" className="custom-input" />
        <Textarea aria-label="Description" className="custom-textarea" />
      </>
    );

    expect(screen.getByLabelText('Name')).toHaveClass(
      'border-input',
      'custom-input'
    );
    expect(screen.getByLabelText('Description')).toHaveClass(
      'border-input',
      'custom-textarea'
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
rtk npm test -- src/components/ui/form-controls.test.tsx
```

Expected: FAIL because `./input`, `./label`, and `./textarea` do not exist.

- [ ] **Step 3: Install the Radix Label dependency**

Run:

```bash
rtk npm install @radix-ui/react-label
```

Expected: `package.json` and `package-lock.json` include `@radix-ui/react-label`.

- [ ] **Step 4: Implement the shadcn primitives**

Create `src/components/ui/input.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
```

Create `src/components/ui/label.tsx`:

```tsx
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
```

Create `src/components/ui/textarea.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
```

- [ ] **Step 5: Run the primitive tests to verify they pass**

Run:

```bash
rtk npm test -- src/components/ui/form-controls.test.tsx
```

Expected: PASS with 2 tests.

- [ ] **Step 6: Commit the primitives**

```bash
rtk git add package.json package-lock.json src/components/ui/input.tsx src/components/ui/label.tsx src/components/ui/textarea.tsx src/components/ui/form-controls.test.tsx
rtk git commit -m "feat(ui): add shadcn form controls"
```

### Task 2: Migrate the Shape Properties Controls

**Files:**
- Modify: `src/components/ShapePropertiesPanel.test.tsx`
- Modify: `src/components/ShapePropertiesPanel.tsx`

- [ ] **Step 1: Add a failing accessibility and styling test**

Add this test to `src/components/ShapePropertiesPanel.test.tsx`:

```tsx
it('uses shadcn form controls without changing the floating panel', () => {
  useEditorStore.setState({ shapes: { r1: rect }, selectedId: 'r1' });
  const { container } = render(<ShapePropertiesPanel />);

  expect(screen.getByLabelText('Width')).toHaveClass('border-input');
  expect(screen.getByLabelText('Fill hex')).toHaveClass('border-input');
  expect(container.querySelector('aside')).toHaveClass(
    'absolute',
    'right-3',
    'top-1/2',
    'w-56'
  );
});
```

- [ ] **Step 2: Run the panel test to verify it fails**

Run:

```bash
rtk npm test -- src/components/ShapePropertiesPanel.test.tsx
```

Expected: FAIL because the current native fields do not have the shadcn `border-input` class.

- [ ] **Step 3: Migrate the field helpers**

Update the imports in `src/components/ShapePropertiesPanel.tsx`:

```tsx
import { useId, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEditorStore } from '@/store/editorStore';
```

In each helper, create an ID:

```tsx
const id = useId();
```

Replace `NumberField` markup with:

```tsx
<div className="flex flex-col gap-1">
  <Label htmlFor={id} className="text-xs text-muted-foreground">
    {label}
  </Label>
  <Input
    id={id}
    type="number"
    value={value}
    onFocus={() => {
      prevRef.current = value;
    }}
    onChange={(event) => {
      const next = parseFloat(event.target.value);
      onLiveChange(Number.isNaN(next) ? 0 : next);
    }}
    onBlur={() => onCommit(prevRef.current, value)}
    onKeyDown={(event) => {
      if (event.key === 'Enter') event.currentTarget.blur();
    }}
  />
</div>
```

Replace `ColorField` markup with:

```tsx
<div className="flex flex-col gap-1">
  <Label htmlFor={id} className="text-xs text-muted-foreground">
    {label}
  </Label>
  <div className="flex gap-2">
    <input
      type="color"
      aria-label={`${label} swatch`}
      className="h-9 w-9 rounded-md border border-input bg-transparent p-1"
      value={value}
      onFocus={() => {
        prevRef.current = value;
      }}
      onInput={(event) => onLiveChange(event.currentTarget.value)}
      onChange={(event) =>
        onCommit(prevRef.current, event.currentTarget.value)
      }
    />
    <Input
      id={id}
      type="text"
      aria-label={`${label} hex`}
      value={value}
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
```

Replace `TextAreaField` markup with:

```tsx
<div className="flex flex-col gap-1">
  <Label htmlFor={id} className="text-xs text-muted-foreground">
    {label}
  </Label>
  <Textarea
    id={id}
    rows={2}
    value={value}
    onFocus={() => {
      prevRef.current = value;
    }}
    onChange={(event) => onLiveChange(event.target.value)}
    onBlur={() => onCommit(prevRef.current, value)}
  />
</div>
```

Do not change the `aside` classes or the conditional field rendering.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
rtk npm test -- src/components/ShapePropertiesPanel.test.tsx src/components/ui/form-controls.test.tsx
```

Expected: PASS with all panel and primitive tests.

- [ ] **Step 5: Commit the panel migration**

```bash
rtk git add src/components/ShapePropertiesPanel.tsx src/components/ShapePropertiesPanel.test.tsx
rtk git commit -m "refactor: use shadcn settings controls"
```

### Task 3: Verify the Complete Change

**Files:**
- Verify only.

- [ ] **Step 1: Run the full test suite**

Run:

```bash
rtk npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run:

```bash
rtk npm run lint
```

Expected: exit code 0 with no lint errors.

- [ ] **Step 3: Run the production build**

Run:

```bash
rtk npm run build
```

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 4: Inspect the final diff**

Run:

```bash
rtk git status --short
rtk git diff HEAD~2 --check
rtk git diff HEAD~2 --stat
```

Expected: no whitespace errors; only the dependency files, three UI primitives, their test, and the panel files changed. The pre-existing untracked `docs/superpowers/plans/2026-06-15-shape-properties-panel.md` remains untouched.
