import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { initBoardStore, useBoardStore } from './store/boardStore';
import { useEditorStore } from './store/editorStore';
import { ThemeProvider } from './theme/ThemeProvider';

vi.mock('./store/boardStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./store/boardStore')>();
  return {
    ...actual,
    initBoardStore: vi.fn(),
  };
});

const mockedInitBoardStore = vi.mocked(initBoardStore);

function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedInitBoardStore.mockResolvedValue(undefined);
  useBoardStore.setState({ boards: [], currentBoardId: null });
  useEditorStore.getState().reset();
});

describe('App', () => {
  it('does not render the board list until IndexedDB hydration completes', async () => {
    let finishInitialization!: () => void;
    mockedInitBoardStore.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishInitialization = resolve;
        })
    );

    renderApp();

    expect(
      screen.queryByRole('heading', { name: /boards/i })
    ).not.toBeInTheDocument();

    await act(async () => {
      finishInitialization();
    });

    expect(
      await screen.findByRole('heading', { name: /boards/i })
    ).toBeInTheDocument();
  });

  it('renders the home page after initialization', async () => {
    renderApp();

    expect(
      await screen.findByRole('button', { name: /new board/i })
    ).toBeInTheDocument();
  });

  it('still renders the app when IndexedDB initialization rejects', async () => {
    mockedInitBoardStore.mockRejectedValue(new Error('database unavailable'));

    renderApp();

    expect(
      await screen.findByRole('heading', { name: /boards/i })
    ).toBeInTheDocument();
  });

  it('switches to the editor when creating a board', async () => {
    renderApp();
    fireEvent.click(
      await screen.findByRole('button', { name: /new board/i })
    );

    expect(screen.getByLabelText(/back to boards/i)).toBeInTheDocument();
  });

  it('returns to the home page when clicking back', async () => {
    renderApp();
    fireEvent.click(
      await screen.findByRole('button', { name: /new board/i })
    );
    fireEvent.click(screen.getByLabelText(/back to boards/i));

    expect(screen.getByRole('heading', { name: /boards/i })).toBeInTheDocument();
  });
});
