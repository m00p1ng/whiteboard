# Relative time on home page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the absolute timestamp on the home page board cards with live-updating relative time, keeping the absolute timestamp available as a hover tooltip.

**Architecture:** Add a focused `useRelativeTime` hook that wraps `date-fns/formatDistanceToNow` and re-renders on a 60-second interval. The home page consumes this hook per board and renders the relative label with a native `title` tooltip. Hook and page each get focused tests.

**Tech Stack:** React 19, TypeScript, Vitest, date-fns, React Testing Library, native `title` tooltip.

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/hooks/useRelativeTime.ts` | New reusable hook: returns relative string and auto-updates. |
| `src/hooks/useRelativeTime.test.ts` | Unit tests for the hook using fake timers. |
| `src/pages/HomePage.tsx` | Consume `useRelativeTime` for each board card. |
| `src/pages/HomePage.test.tsx` | Update existing test to assert relative-time output. |
| `package.json` / `package-lock.json` | Add `date-fns` dependency. |

---

### Task 1: Install date-fns

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the dependency**

Run:
```bash
npm install date-fns
```

Expected: `package.json` and `package-lock.json` are updated with `date-fns`.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add date-fns"
```

---

### Task 2: Create useRelativeTime hook

**Files:**
- Create: `src/hooks/useRelativeTime.ts`
- Create: `src/hooks/useRelativeTime.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useRelativeTime.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRelativeTime } from './useRelativeTime';

describe('useRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a relative time string with suffix', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const { result } = renderHook(() => useRelativeTime(now - 2 * 60 * 1000));
    expect(result.current).toMatch(/2 minutes ago/);
  });

  it('updates the string when the interval passes', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const { result } = renderHook(() => useRelativeTime(now - 2 * 60 * 1000));
    expect(result.current).toMatch(/2 minutes ago/);

    vi.advanceTimersByTime(60_000);
    expect(result.current).toMatch(/3 minutes ago/);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:
```bash
npm test -- src/hooks/useRelativeTime.test.ts
```

Expected: FAIL — `useRelativeTime` is not defined or module not found.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useRelativeTime.ts`:

```typescript
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

const UPDATE_INTERVAL_MS = 60_000;

export function useRelativeTime(timestamp: number): string {
  const [relative, setRelative] = useState(() =>
    formatDistanceToNow(timestamp, { addSuffix: true })
  );

  useEffect(() => {
    setRelative(formatDistanceToNow(timestamp, { addSuffix: true }));

    const intervalId = setInterval(() => {
      setRelative(formatDistanceToNow(timestamp, { addSuffix: true }));
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [timestamp]);

  return relative;
}
```

- [ ] **Step 4: Run the passing test**

Run:
```bash
npm test -- src/hooks/useRelativeTime.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRelativeTime.ts src/hooks/useRelativeTime.test.ts
git commit -m "feat(hooks): add useRelativeTime hook"
```

---

### Task 3: Update HomePage to use relative time

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Update HomePage**

Replace the absolute timestamp line in `src/pages/HomePage.tsx`.

Current code (around line 71-73):
```tsx
<p className="text-sm text-gray-500 mt-1">
  Updated {new Date(board.updatedAt).toLocaleString()}
</p>
```

New code:
```tsx
<BoardUpdatedAt updatedAt={board.updatedAt} />
```

Add the small component above the `HomePage` export:

```tsx
import { useRelativeTime } from '@/hooks/useRelativeTime';

function BoardUpdatedAt({ updatedAt }: { updatedAt: number }) {
  const relative = useRelativeTime(updatedAt);
  return (
    <p
      className="text-sm text-gray-500 mt-1"
      title={new Date(updatedAt).toLocaleString()}
    >
      Updated {relative}
    </p>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat(home): show relative update time with tooltip"
```

---

### Task 4: Update HomePage tests

**Files:**
- Modify: `src/pages/HomePage.test.tsx`

- [ ] **Step 1: Update the existing ordering test**

The existing test `orders boards by most recent edit without mutating store order` currently asserts heading order only. Add an assertion that each card shows a relative-time label.

After the heading-order assertion in `src/pages/HomePage.test.tsx`, add:

```typescript
expect(screen.getByText(/newer board/i).closest('div')).toHaveTextContent(/Updated/);
```

Or, more robustly, query the three cards and assert each contains a paragraph starting with "Updated":

```typescript
const cards = within(boardGrid).getAllByText(/Updated/).map((el) => el.closest('div'));
expect(cards).toHaveLength(3);
```

- [ ] **Step 2: Add a focused test for relative time rendering**

Add inside the `describe('HomePage', () => { ... })` block:

```typescript
it('shows relative update time for each board', () => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.now());
  useBoardStore.setState({
    boards: [
      {
        id: 'recent',
        name: 'Recent board',
        createdAt: Date.now() - 5 * 60 * 1000,
        updatedAt: Date.now() - 5 * 60 * 1000,
        shapes: {},
      },
    ],
    currentBoardId: null,
  });

  render(<HomePage />);
  expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
  vi.useRealTimers();
});
```

- [ ] **Step 3: Run the updated tests**

Run:
```bash
npm test -- src/pages/HomePage.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run the full test suite**

Run:
```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.test.tsx
git commit -m "test(home): assert relative update time"
```

---

## Self-review

- **Spec coverage:**
  - `date-fns` dependency → Task 1.
  - `useRelativeTime` hook with interval updates → Task 2.
  - HomePage renders relative text + tooltip → Task 3.
  - Hook and page tests → Tasks 2 and 4.
- **Placeholder scan:** No TBD/TODO/fill-in-later items.
- **Type consistency:** `updatedAt` is consistently treated as `number`.
