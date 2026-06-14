import { useBoardStore } from '@/store/boardStore';
import { BoardPage } from '@/pages/BoardPage';
import { HomePage } from '@/pages/HomePage';

function App() {
  const currentBoardId = useBoardStore((state) => state.currentBoardId);
  return currentBoardId ? <BoardPage /> : <HomePage />;
}

export default App;
