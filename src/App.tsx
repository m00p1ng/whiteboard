import { useEffect, useState } from 'react';
import { initBoardStore, useBoardStore } from '@/store/boardStore';
import { BoardPage } from '@/pages/BoardPage';
import { HomePage } from '@/pages/HomePage';

function App() {
  const [initialized, setInitialized] = useState(false);
  const currentBoardId = useBoardStore((state) => state.currentBoardId);

  useEffect(() => {
    let active = true;

    void initBoardStore()
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setInitialized(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!initialized) {
    return null;
  }

  return currentBoardId ? <BoardPage /> : <HomePage />;
}

export default App;
