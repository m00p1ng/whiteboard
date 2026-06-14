# Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted light/dark theme that follows the system on first visit, covers the complete editor surface, and shows undo/redo controls only when their actions are available.

**Architecture:** A focused React `ThemeProvider` owns system detection, guarded persistence, and the root `dark` class. Normal interface surfaces consume semantic CSS tokens, while canvas-backed elements read the theme context for concrete drawing colors. A reusable overflow menu exposes explicit Light and Dark choices on both application pages.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Zustand, Vitest, Testing Library, HTML Canvas

---

## File Structure

- Create `src/theme/ThemeProvider.tsx`: theme state, system preference listener, guarded storage, document class synchronization, and `useTheme`.
- Create `src/theme/ThemeProvider.test.tsx`: provider initialization, persistence, system updates, and failure handling.
- Create `src/components/ThemeMenu.tsx`: reusable overflow menu with Light and Dark choices.
- Create `src/components/ThemeMenu.test.tsx`: interaction, accessibility, Escape, and outside-click coverage.
- Create `src/components/TopBar.test.tsx`: editor theme menu placement and history-action visibility.
- Create `src/components/Minimap.test.tsx`: light/dark canvas color assertions.
- Modify `src/main.tsx`: wrap the application in `ThemeProvider`.
- Modify `src/index.css`: add dark tokens and canvas surface tokens.
- Modify `src/pages/HomePage.tsx`: semantic surfaces and home-page theme menu placement.
- Modify `src/pages/HomePage.test.tsx`: assert the shared theme menu is available.
- Modify `src/pages/BoardPage.tsx`: use the semantic canvas background.
- Modify `src/components/TopBar.tsx`: add the theme menu and conditionally render Undo/Redo.
- Modify `src/components/Canvas.tsx`: replace the hard-coded light canvas class.
- Modify `src/components/ShapeContextMenu.tsx`: convert menu surfaces and destructive states to semantic tokens.
- Modify `src/components/ShapeTextEditor.tsx`: use a themed overlay surface while preserving configured text color.
- Modify `src/components/TextEditor.tsx`: use a themed editing surface while preserving configured text color.
- Modify `src/components/Minimap.tsx`: draw theme-specific background and shape colors.

### Task 1: Theme State And Persistence

**Files:**
- Create: `src/theme/ThemeProvider.tsx`
- Create: `src/theme/ThemeProvider.test.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Write provider tests for system initialization and stored override**

Create `src/theme/ThemeProvider.test.tsx` with a controllable media query mock and a small consumer:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
} from './ThemeProvider';

function ThemeConsumer() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={() => setTheme('light')}>Light</button>
      <button type="button" onClick={() => setTheme('dark')}>Dark</button>
    </>
  );
}

function installMatchMedia(initialDark: boolean) {
  let matches = initialDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    get matches() {
      return matches;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn(
      (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.add(listener)
    ),
    removeEventListener: vi.fn(
      (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.delete(listener)
    ),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

  return {
    setDark(nextDark: boolean) {
      matches = nextDark;
      for (const listener of listeners) {
        listener({ matches: nextDark } as MediaQueryListEvent);
      }
    },
  };
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses the system preference when no preference is stored', () => {
    installMatchMedia(true);
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('uses a stored preference instead of the system preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    installMatchMedia(true);
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run:

```bash
rtk npm test -- src/theme/ThemeProvider.test.tsx
```

Expected: FAIL because `ThemeProvider.tsx` does not exist.

- [ ] **Step 3: Implement the provider and root integration**

Create `src/theme/ThemeProvider.tsx`:

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'whiteboard-theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  if (typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [hasManualTheme, setHasManualTheme] = useState(
    () => readStoredTheme() !== null
  );
  const [theme, setActiveTheme] = useState<Theme>(
    () => readStoredTheme() ?? getSystemTheme()
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (hasManualTheme || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateFromSystem = (event: MediaQueryListEvent) => {
      setActiveTheme(event.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', updateFromSystem);
    return () => mediaQuery.removeEventListener('change', updateFromSystem);
  }, [hasManualTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme(nextTheme) {
        setActiveTheme(nextTheme);
        setHasManualTheme(true);
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {
          // Keep the selected theme for this session when storage is blocked.
        }
      },
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}
```

Wrap `App` in `src/main.tsx`:

```tsx
import { ThemeProvider } from './theme/ThemeProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
```

- [ ] **Step 4: Add tests for manual changes, system changes, and unavailable APIs**

Extend `ThemeProvider.test.tsx`:

```tsx
it('persists a manual theme and ignores later system changes', () => {
  const media = installMatchMedia(false);
  render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);

  fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  expect(document.documentElement).toHaveClass('dark');

  act(() => media.setDark(false));
  expect(screen.getByTestId('theme')).toHaveTextContent('dark');
});

it('tracks system changes while no manual preference exists', () => {
  const media = installMatchMedia(false);
  render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);

  act(() => media.setDark(true));
  expect(screen.getByTestId('theme')).toHaveTextContent('dark');
});

it('falls back to light when matchMedia is unavailable', () => {
  vi.stubGlobal('matchMedia', undefined);
  render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
  expect(screen.getByTestId('theme')).toHaveTextContent('light');
});

it('keeps working when storage writes fail', () => {
  installMatchMedia(false);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);

  fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
  expect(screen.getByTestId('theme')).toHaveTextContent('dark');
});

it('uses the system preference when storage reads fail', () => {
  installMatchMedia(true);
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
  expect(screen.getByTestId('theme')).toHaveTextContent('dark');
});
```

- [ ] **Step 5: Run provider tests**

Run:

```bash
rtk npm test -- src/theme/ThemeProvider.test.tsx
```

Expected: all `ThemeProvider` tests PASS.

- [ ] **Step 6: Commit theme state**

```bash
rtk git add src/theme/ThemeProvider.tsx src/theme/ThemeProvider.test.tsx src/main.tsx
rtk git commit -m "feat: add persisted theme provider"
```

### Task 2: Reusable Theme Overflow Menu

**Files:**
- Create: `src/components/ThemeMenu.tsx`
- Create: `src/components/ThemeMenu.test.tsx`

- [ ] **Step 1: Write menu interaction tests**

Create `src/components/ThemeMenu.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeMenu } from './ThemeMenu';
import { ThemeProvider } from '@/theme/ThemeProvider';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
});

function renderMenu() {
  return render(
    <ThemeProvider>
      <ThemeMenu />
      <button type="button">Outside</button>
    </ThemeProvider>
  );
}

describe('ThemeMenu', () => {
  it('opens and marks the active theme', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Light' }))
      .toHaveAttribute('aria-checked', 'true');
  });

  it('selects dark mode and closes', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Dark' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and outside pointer down', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the menu tests and verify they fail**

Run:

```bash
rtk npm test -- src/components/ThemeMenu.test.tsx
```

Expected: FAIL because `ThemeMenu.tsx` does not exist.

- [ ] **Step 3: Implement the menu**

Create `src/components/ThemeMenu.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Check, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme, type Theme } from '@/theme/ThemeProvider';

const choices: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Appearance"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-36 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {choices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === choice.value}
              className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                setTheme(choice.value);
                setOpen(false);
              }}
            >
              {choice.label}
              {theme === choice.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run menu tests**

Run:

```bash
rtk npm test -- src/components/ThemeMenu.test.tsx
```

Expected: all `ThemeMenu` tests PASS.

- [ ] **Step 5: Commit the menu**

```bash
rtk git add src/components/ThemeMenu.tsx src/components/ThemeMenu.test.tsx
rtk git commit -m "feat: add theme overflow menu"
```

### Task 3: Page Integration And Conditional History Actions

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`
- Modify: `src/components/TopBar.tsx`
- Create: `src/components/TopBar.test.tsx`

- [ ] **Step 1: Add failing home-page and top-bar tests**

In `src/pages/HomePage.test.tsx`, wrap the render calls with a local helper:

```tsx
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderHomePage() {
  return render(
    <ThemeProvider>
      <HomePage />
    </ThemeProvider>
  );
}
```

Replace each `render(<HomePage />)` with `renderHomePage()` and add:

```tsx
it('shows the appearance menu beside home-page actions', () => {
  renderHomePage();
  expect(screen.getByRole('button', { name: 'Appearance' }))
    .toBeInTheDocument();
});
```

Create `src/components/TopBar.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useBoardStore } from '@/store/boardStore';
import { useEditorStore } from '@/store/editorStore';

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  useBoardStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Project plan',
      createdAt: 1,
      updatedAt: 1,
      shapes: {},
    }],
    currentBoardId: 'board-1',
  });
  useEditorStore.getState().reset();
});

function renderTopBar() {
  return render(
    <ThemeProvider>
      <TopBar />
    </ThemeProvider>
  );
}

describe('TopBar', () => {
  it('shows appearance but hides unavailable history actions', () => {
    renderTopBar();
    expect(screen.getByRole('button', { name: 'Appearance' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Redo' }))
      .not.toBeInTheDocument();
  });

  it('shows undo after an edit and redo after undo', () => {
    renderTopBar();
    act(() => {
      useEditorStore.getState().addShape({
        id: 'shape-1',
        type: 'rect',
        x: 0,
        y: 0,
        width: 20,
        height: 20,
      });
    });
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByRole('button', { name: 'Undo' }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run integration tests and verify they fail**

Run:

```bash
rtk npm test -- src/pages/HomePage.test.tsx src/components/TopBar.test.tsx
```

Expected: FAIL because neither page renders `ThemeMenu` and the top bar always renders Undo/Redo.

- [ ] **Step 3: Integrate the menu and conditional actions**

In `src/pages/HomePage.tsx`, import `ThemeMenu` and group it with the primary action:

```tsx
import { ThemeMenu } from '@/components/ThemeMenu';

<div className="flex items-center gap-1">
  <Button onClick={() => createBoard()}>
    <Plus className="mr-2 h-4 w-4" />
    New board
  </Button>
  <ThemeMenu />
</div>
```

In `src/components/TopBar.tsx`, import `ThemeMenu`, select both stacks, and render actions conditionally:

```tsx
import { ThemeMenu } from '@/components/ThemeMenu';

const canUndo = useEditorStore((state) => state.undoStack.length > 0);
const canRedo = useEditorStore((state) => state.redoStack.length > 0);

<div className="flex items-center gap-1">
  {canUndo && (
    <Button variant="ghost" size="icon" onClick={undo} aria-label="Undo">
      <Undo2 className="h-4 w-4" />
    </Button>
  )}
  {canRedo && (
    <Button variant="ghost" size="icon" onClick={redo} aria-label="Redo">
      <Redo2 className="h-4 w-4" />
    </Button>
  )}
  <Button
    variant="ghost"
    size="icon"
    disabled={!selectedId}
    onClick={() => selectedId && removeShape(selectedId)}
    aria-label="Delete"
  >
    <Trash2 className="h-4 w-4" />
  </Button>
  <ThemeMenu />
</div>
```

- [ ] **Step 4: Run page integration tests**

Run:

```bash
rtk npm test -- src/pages/HomePage.test.tsx src/components/TopBar.test.tsx
```

Expected: both test files PASS.

- [ ] **Step 5: Commit page integration**

```bash
rtk git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/components/TopBar.tsx src/components/TopBar.test.tsx
rtk git commit -m "feat: expose theme controls and history state"
```

### Task 4: Semantic Light And Dark Surfaces

**Files:**
- Modify: `src/index.css`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/BoardPage.tsx`
- Modify: `src/components/Canvas.tsx`
- Modify: `src/components/ShapeContextMenu.tsx`

- [ ] **Step 1: Add dark palette and semantic aliases**

Extend `@theme` in `src/index.css`:

```css
--color-card: hsl(var(--card));
--color-card-foreground: hsl(var(--card-foreground));
--color-popover: hsl(var(--popover));
--color-popover-foreground: hsl(var(--popover-foreground));
--color-canvas: hsl(var(--canvas));
```

Add a light canvas token to `:root`:

```css
--canvas: 210 20% 98%;
```

Add the dark palette in `@layer base`:

```css
.dark {
  --background: 222 18% 12%;
  --foreground: 210 20% 96%;
  --card: 222 17% 15%;
  --card-foreground: 210 20% 96%;
  --popover: 222 17% 15%;
  --popover-foreground: 210 20% 96%;
  --primary: 210 20% 96%;
  --primary-foreground: 222 18% 12%;
  --secondary: 220 14% 21%;
  --secondary-foreground: 210 20% 96%;
  --muted: 220 14% 21%;
  --muted-foreground: 215 14% 68%;
  --accent: 220 14% 23%;
  --accent-foreground: 210 20% 96%;
  --destructive: 0 63% 45%;
  --destructive-foreground: 210 20% 98%;
  --border: 220 13% 27%;
  --input: 220 13% 27%;
  --ring: 217 91% 70%;
  --canvas: 222 18% 12%;
}
```

- [ ] **Step 2: Replace hard-coded interface colors**

Make these class replacements:

```tsx
// HomePage.tsx
<div className="min-h-screen bg-canvas p-8">
<p className="mt-1 text-sm text-muted-foreground">
<p className="text-muted-foreground">No boards yet.</p>
<div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-shadow hover:shadow-md">
<input className="w-full rounded border bg-background px-2 py-1 text-sm">

// BoardPage.tsx and Canvas.tsx
className="relative h-screen w-screen overflow-hidden bg-canvas"
className="relative flex-1 overflow-hidden bg-canvas"
```

Convert `src/components/ShapeContextMenu.tsx`:

```tsx
const itemClass =
  'block w-full px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground disabled:text-muted-foreground disabled:hover:bg-transparent';

className="absolute z-50 min-w-[160px] rounded border bg-popover py-1 text-sm text-popover-foreground shadow-md"

<div className="my-1 border-t" />

className={`${itemClass} text-destructive hover:bg-destructive/10 hover:text-destructive`}
```

- [ ] **Step 3: Run focused component and page tests**

Run:

```bash
rtk npm test -- src/pages/HomePage.test.tsx src/pages/BoardPage.test.tsx src/components/Canvas.test.tsx src/components/ShapeContextMenu.test.tsx
```

Expected: all listed tests PASS.

- [ ] **Step 4: Run lint to catch invalid classes or imports**

Run:

```bash
rtk npm run lint
```

Expected: PASS with no ESLint errors.

- [ ] **Step 5: Commit semantic surfaces**

```bash
rtk git add src/index.css src/pages/HomePage.tsx src/pages/BoardPage.tsx src/components/Canvas.tsx src/components/ShapeContextMenu.tsx
rtk git commit -m "feat: add dark semantic surfaces"
```

### Task 5: Theme-Aware Canvas Pixels And Editing Overlays

**Files:**
- Create: `src/components/Minimap.test.tsx`
- Modify: `src/components/Minimap.tsx`
- Modify: `src/components/TextEditor.tsx`
- Modify: `src/components/ShapeTextEditor.tsx`
- Modify: `src/components/ShapeTextEditor.test.tsx`

- [ ] **Step 1: Write a failing minimap color test**

Create `src/components/Minimap.test.tsx` with a mocked 2D context:

```tsx
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Minimap } from './Minimap';
import { ThemeProvider, THEME_STORAGE_KEY } from '@/theme/ThemeProvider';
import { useEditorStore } from '@/store/editorStore';

const context = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
};
const fills: string[] = [];

beforeEach(() => {
  useEditorStore.getState().reset();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  context.fillRect.mockClear();
  fills.length = 0;
  context.fillRect.mockImplementation(() => {
    fills.push(context.fillStyle);
  });
});

describe('Minimap theme colors', () => {
  it('draws the dark minimap palette in dark mode', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(<ThemeProvider><Minimap /></ThemeProvider>);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 180, 120);
    expect(fills[0]).toBe('#191c23');
    expect(fills).toContain('#64748b');
  });
});
```

- [ ] **Step 2: Run the minimap test and verify it fails**

Run:

```bash
rtk npm test -- src/components/Minimap.test.tsx
```

Expected: FAIL because the minimap still draws `#f8fafc` and does not read theme state.

- [ ] **Step 3: Make minimap drawing theme-aware**

In `src/components/Minimap.tsx`:

```tsx
import { useTheme } from '@/theme/ThemeProvider';

const { theme } = useTheme();
const colors =
  theme === 'dark'
    ? { background: '#191c23', shape: '#64748b' }
    : { background: '#f8fafc', shape: '#94a3b8' };
```

Use `colors.background` and `colors.shape` for the two `fillStyle` assignments, and include `colors.background` and `colors.shape` in the drawing effect dependency list.

- [ ] **Step 4: Theme editing surfaces without changing shape text colors**

In `src/components/ShapeTextEditor.tsx`, replace the overlay class:

```tsx
className="absolute z-20 flex items-center border border-blue-500 bg-background/90"
```

In `src/components/TextEditor.tsx`, use the shape's configured fill and a themed editing surface:

```tsx
className="absolute z-20 resize-none border border-blue-500 bg-background/90 p-1 outline-none"
style={{
  left: screenX,
  top: screenY,
  fontSize: shape.fontSize * viewport.scale,
  minWidth: 100,
  color: shape.fill ?? '#000000',
}}
```

Add or update assertions in `src/components/ShapeTextEditor.test.tsx` to ensure the overlay has `bg-background/90` and the textarea still receives `shape.textColor`.

- [ ] **Step 5: Run canvas-specific tests**

Run:

```bash
rtk npm test -- src/components/Minimap.test.tsx src/components/ShapeTextEditor.test.tsx src/components/Canvas.test.tsx
```

Expected: all listed tests PASS.

- [ ] **Step 6: Commit canvas theme work**

```bash
rtk git add src/components/Minimap.tsx src/components/Minimap.test.tsx src/components/TextEditor.tsx src/components/ShapeTextEditor.tsx src/components/ShapeTextEditor.test.tsx
rtk git commit -m "feat: theme canvas overlays and minimap"
```

### Task 6: Full Verification And Browser Inspection

**Files:**
- Verify: all implementation and test files changed in Tasks 1-5.

- [ ] **Step 1: Run the complete automated test suite**

Run:

```bash
rtk npm test
```

Expected: all test files PASS with zero failures.

- [ ] **Step 2: Run lint**

Run:

```bash
rtk npm run lint
```

Expected: PASS with zero errors.

- [ ] **Step 3: Run the production build**

Run:

```bash
rtk npm run build
```

Expected: TypeScript and Vite build complete successfully and write `dist/`.

- [ ] **Step 4: Start the local app**

Run:

```bash
rtk npm run dev -- --host 127.0.0.1
```

Expected: Vite reports a local URL, normally `http://127.0.0.1:5173`.

- [ ] **Step 5: Inspect both pages in the in-app browser**

Use the Browser plugin to verify:

- The first visit follows the browser/OS color preference.
- The home-page overflow menu is beside New board.
- Selecting Dark changes the home background, cards, text, borders, inputs, and menu.
- Reloading keeps the explicit choice.
- A new board opens with a dark canvas, dark top bar, dark floating controls, dark properties panel, dark context menu, and dark minimap.
- Stored shape fill, stroke, and text colors do not change when switching themes.
- Undo and Redo are absent on a fresh board.
- Creating a shape shows Undo.
- Undoing the only edit hides Undo and shows Redo.
- Creating a new edit after undo hides Redo.
- Escape and outside click close the appearance menu.

- [ ] **Step 6: Check the final diff**

Run:

```bash
rtk git diff --check
rtk git status --short
```

Expected: no whitespace errors; only intended implementation files are modified.

- [ ] **Step 7: Commit any verification fixes**

If verification required changes, stage the affected files from this exact implementation set and commit:

```bash
rtk git add src/theme/ThemeProvider.tsx src/theme/ThemeProvider.test.tsx src/main.tsx src/index.css src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/pages/BoardPage.tsx src/components/ThemeMenu.tsx src/components/ThemeMenu.test.tsx src/components/TopBar.tsx src/components/TopBar.test.tsx src/components/Canvas.tsx src/components/ShapeContextMenu.tsx src/components/Minimap.tsx src/components/Minimap.test.tsx src/components/TextEditor.tsx src/components/ShapeTextEditor.tsx src/components/ShapeTextEditor.test.tsx
rtk git commit -m "fix: polish dark theme behavior"
```

If no fixes were required, do not create an empty commit.
