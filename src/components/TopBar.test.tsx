import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useBoardStore } from '@/store/boardStore';
import { useEditorStore } from '@/store/editorStore';

beforeEach(() => {
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
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  useBoardStore.setState({
    boards: [
      {
        id: 'board-1',
        name: 'Project plan',
        createdAt: 1,
        updatedAt: 1,
        shapes: {},
      },
    ],
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

    expect(
      screen.getByRole('button', { name: 'Appearance' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Undo' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Redo' })
    ).not.toBeInTheDocument();
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
    expect(
      screen.queryByRole('button', { name: 'Undo' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
  });

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
});
