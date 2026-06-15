# Navbar margin removal and zoom percentage display

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the flowchart editor navbar flush against the viewport edges and display the current zoom percentage between the zoom-out and zoom-in buttons.

**Architecture:** The active navbar (`src/components/flowchart/TopBar.tsx`) already subscribes to `viewport.scale` from `useFlowchartStore`. We will change its positioning classes to remove the floating margin, insert a read-only label between the existing zoom buttons, and add tests that verify both changes.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, Testing Library.

---

### Task 1: Add failing tests for navbar styling and zoom percentage

**Files:**
- Modify: `src/components/flowchart/TopBar.test.tsx`

- [ ] **Step 1: Import `within` and add tests**

Replace the existing test file content with the following (keeps the existing zoom-in assertion and adds the new ones):

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from './TopBar';
import { useFlowchartStore } from '@/store/flowchartStore';

beforeEach(() => {
  useFlowchartStore.setState({
    nodes: {},
    edges: {},
    selection: null,
    tool: 'select',
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    showGrid: true,
    snap: true,
    editingNodeId: null,
    undoStack: [],
    redoStack: [],
  });
});

describe('TopBar', () => {
  it('zooms in when clicked', () => {
    render(<TopBar />);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(useFlowchartStore.getState().viewport.scale).toBeGreaterThan(1);
  });

  it('displays the current zoom percentage', () => {
    render(<TopBar />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('updates the zoom percentage after zooming', () => {
    render(<TopBar />);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(screen.getByText('110%')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('does not have floating margin or rounded top corners', () => {
    render(<TopBar />);
    const header = screen.getByRole('banner');
    expect(header).not.toHaveClass('left-3');
    expect(header).not.toHaveClass('right-3');
    expect(header).not.toHaveClass('top-3');
    expect(header).not.toHaveClass('rounded-lg');
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

Run: `npm test -- src/components/flowchart/TopBar.test.tsx`

Expected: tests fail because the zoom percentage label is missing and the old margin/rounding classes are still present.

---

### Task 2: Update the TopBar component

**Files:**
- Modify: `src/components/flowchart/TopBar.tsx`

- [ ] **Step 1: Change the navbar positioning classes**

Replace the `<header>` className:

```tsx
<header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b bg-background p-2 shadow-md">
```

Old value to replace:

```tsx
<header className="absolute left-3 right-3 top-3 z-20 flex items-center justify-between rounded-lg border bg-background p-2 shadow-md">
```

- [ ] **Step 2: Add the zoom percentage label between the zoom buttons**

In the right-hand control group, between the Zoom out and Zoom in buttons, add:

```tsx
<span className="min-w-12 px-2 text-center text-xs tabular-nums text-muted-foreground">
  {Math.round(viewport.scale * 100)}%
</span>
```

The group should look like this:

```tsx
<div className="flex items-center gap-1">
  <Button variant="ghost" size="icon" onClick={zoomOut} aria-label="Zoom out">
    <ZoomOut className="h-4 w-4" />
  </Button>
  <span className="min-w-12 px-2 text-center text-xs tabular-nums text-muted-foreground">
    {Math.round(viewport.scale * 100)}%
  </span>
  <Button variant="ghost" size="icon" onClick={zoomIn} aria-label="Zoom in">
    <ZoomIn className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={fitToContent} aria-label="Fit to content">
    <Maximize className="h-4 w-4" />
  </Button>
</div>
```

- [ ] **Step 3: Run the tests**

Run: `npm test -- src/components/flowchart/TopBar.test.tsx`

Expected: all tests pass.

---

### Task 3: Verify the full test suite and build

**Files:**
- None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run the build**

Run: `npm run build`

Expected: TypeScript compilation succeeds and the Vite build completes without errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/flowchart/TopBar.tsx src/components/flowchart/TopBar.test.tsx
git commit -m "feat: remove navbar margin and show zoom percentage"
```

---

## Self-review

- **Spec coverage:** navbar flush edges (Task 2), zoom percentage between buttons (Task 2), tests (Task 1 & 3) — all covered.
- **Placeholder scan:** no TBD/TODO/fill-in-details found.
- **Type consistency:** uses `viewport.scale` consistently with existing store shape.
