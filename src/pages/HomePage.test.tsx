import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { HomePage } from './HomePage';
import { useBoardStore } from '@/store/boardStore';

beforeEach(() => {
  useBoardStore.setState({ boards: [], currentBoardId: null });
});

describe('HomePage', () => {
  it('shows empty state when no boards exist', () => {
    render(<HomePage />);
    expect(screen.getByText(/no boards yet/i)).toBeInTheDocument();
  });

  it('creates a board', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByRole('button', { name: /new board/i }));
    expect(useBoardStore.getState().boards).toHaveLength(1);
    expect(useBoardStore.getState().currentBoardId).not.toBeNull();
  });

  it('lists existing boards', () => {
    useBoardStore.getState().createBoard('Project plan');
    render(<HomePage />);
    expect(screen.getByText('Project plan')).toBeInTheDocument();
  });

  it('deletes a board', () => {
    useBoardStore.getState().createBoard('Delete me');
    render(<HomePage />);
    fireEvent.click(screen.getByLabelText(/delete delete me/i));
    expect(useBoardStore.getState().boards).toHaveLength(0);
  });

  it('orders boards by most recent edit without mutating store order', () => {
    useBoardStore.setState({
      boards: [
        {
          id: 'older',
          name: 'Older board',
          createdAt: 1,
          updatedAt: 100,
          shapes: {},
        },
        {
          id: 'newer',
          name: 'Newer board',
          createdAt: 2,
          updatedAt: 300,
          shapes: {},
        },
        {
          id: 'middle',
          name: 'Middle board',
          createdAt: 3,
          updatedAt: 200,
          shapes: {},
        },
      ],
      currentBoardId: null,
    });

    render(<HomePage />);

    const boardGrid = screen.getByTestId('board-grid');
    const headings = within(boardGrid).getAllByRole('heading', { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Newer board',
      'Middle board',
      'Older board',
    ]);
    expect(useBoardStore.getState().boards.map((board) => board.id)).toEqual([
      'older',
      'newer',
      'middle',
    ]);

    expect(within(boardGrid).getAllByText(/Updated/).length).toBe(3);
  });

  it('shows relative update time for each board', () => {
    vi.useFakeTimers();
    try {
      const now = Date.now();
      vi.setSystemTime(now);

      useBoardStore.setState({
        boards: [
          {
            id: 'recent',
            name: 'Recent board',
            createdAt: now - 5 * 60 * 1000,
            updatedAt: now - 5 * 60 * 1000,
            shapes: {},
          },
        ],
        currentBoardId: null,
      });

      render(<HomePage />);
      expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
