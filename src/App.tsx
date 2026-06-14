import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';
import { useHotkeys } from '@/hooks/useHotkeys';

function App() {
  useHotkeys();
  return (
    <div className="h-screen w-screen relative overflow-hidden bg-gray-50">
      <Toolbar />
      <Canvas />
    </div>
  );
}

export default App;
