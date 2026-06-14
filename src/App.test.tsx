import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { useBoardStore } from './store/boardStore';
import { useEditorStore } from './store/editorStore';

beforeEach(() => {
  localStorage.clear();
  useBoardStore.setState({ boards: [], currentBoardId: null });
  useEditorStore.getState().reset();
});

describe('App', () => {
  it('renders the home page by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /boards/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new board/i })).toBeInTheDocument();
  });

  it('switches to the editor when creating a board', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /new board/i }));
    expect(screen.getByLabelText(/back to boards/i)).toBeInTheDocument();
  });

  it('returns to the home page when clicking back', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /new board/i }));
    fireEvent.click(screen.getByLabelText(/back to boards/i));
    expect(screen.getByRole('heading', { name: /boards/i })).toBeInTheDocument();
  });
});
