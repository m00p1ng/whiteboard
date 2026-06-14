import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Minimap } from './Minimap';
import { ThemeProvider, THEME_STORAGE_KEY } from '@/theme/ThemeProvider';
import { useEditorStore } from '@/store/editorStore';

const fills: string[] = [];
const context = {
  clearRect: vi.fn(),
  fillRect: vi.fn(() => {
    fills.push(context.fillStyle);
  }),
  strokeRect: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
};

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
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D
  );
  useEditorStore.getState().reset();
  useEditorStore.getState().setShapes({
    shape: {
      id: 'shape',
      type: 'rect',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
    },
  });
  fills.length = 0;
  context.fillRect.mockClear();
});

describe('Minimap theme colors', () => {
  it('draws the dark minimap palette in dark mode', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    render(
      <ThemeProvider>
        <Minimap />
      </ThemeProvider>
    );

    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 180, 120);
    expect(fills[0]).toBe('#191c23');
    expect(fills).toContain('#64748b');
  });
});
