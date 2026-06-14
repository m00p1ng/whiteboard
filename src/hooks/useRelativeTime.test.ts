import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toMatch(/3 minutes ago/);
  });
});
