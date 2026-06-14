import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomePage } from './HomePage';
import { useBoardStore } from '@/store/boardStore';

beforeEach(() => {
  localStorage.clear();
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
});
