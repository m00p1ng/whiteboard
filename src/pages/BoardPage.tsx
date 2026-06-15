import { useEffect, useState } from 'react';
import { FlowchartCanvas } from '@/components/flowchart/FlowchartCanvas';
import { LeftToolbar } from '@/components/flowchart/LeftToolbar';
import { Minimap } from '@/components/flowchart/Minimap';
import { PropertiesPanel } from '@/components/flowchart/PropertiesPanel';
import { TopBar } from '@/components/flowchart/TopBar';
import { useBoardStore } from '@/store/boardStore';
import { useFlowchartStore } from '@/store/flowchartStore';
import { useFlowchartHotkeys } from '@/hooks/useFlowchartHotkeys';

export function BoardPage() {
  useFlowchartHotkeys();
  const currentBoardId = useBoardStore((state) => state.currentBoardId);
  const currentBoard = useBoardStore((state) =>
    state.boards.find((board) => board.id === currentBoardId)
  );
  const saveCurrentBoard = useBoardStore((state) => state.saveCurrentBoard);
  const [legacyWarning, setLegacyWarning] = useState(false);

  useEffect(() => {
    const board = useBoardStore
      .getState()
      .boards.find((candidate) => candidate.id === currentBoardId);

    if (!board) return;

    useFlowchartStore.getState().reset();
    useFlowchartStore.setState({
      nodes: board.nodes,
      edges: board.edges,
    });

    const legacyShapes = (board as unknown as { shapes?: Record<string, unknown> }).shapes;
    if (legacyShapes && Object.keys(legacyShapes).length > 0) {
      setLegacyWarning(true);
    }

    return useFlowchartStore.subscribe((state, previousState) => {
      if (
        state.nodes !== previousState.nodes ||
        state.edges !== previousState.edges
      ) {
        saveCurrentBoard({ nodes: state.nodes, edges: state.edges });
      }
    });
  }, [currentBoardId, saveCurrentBoard]);

  if (!currentBoard) {
    return null;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-canvas">
      <FlowchartCanvas />
      <TopBar />
      <LeftToolbar />
      <Minimap />
      <PropertiesPanel />
      {legacyWarning && (
        <div className="absolute bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-yellow-100 px-4 py-2 text-sm text-yellow-900 shadow">
          This board was created with an older editor. Some shapes may not display correctly.
        </div>
      )}
    </div>
  );
}
