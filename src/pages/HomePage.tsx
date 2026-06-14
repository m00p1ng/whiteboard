import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBoardStore } from '@/store/boardStore';

export function HomePage() {
  const boards = useBoardStore((state) => state.boards);
  const createBoard = useBoardStore((state) => state.createBoard);
  const openBoard = useBoardStore((state) => state.openBoard);
  const renameBoard = useBoardStore((state) => state.renameBoard);
  const deleteBoard = useBoardStore((state) => state.deleteBoard);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleRename = (id: string, value: string) => {
    renameBoard(id, value);
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Boards</h1>
          <Button onClick={() => createBoard()}>
            <Plus className="h-4 w-4 mr-2" />
            New board
          </Button>
        </div>

        {boards.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">No boards yet.</p>
            <Button onClick={() => createBoard()} className="mt-4">
              Create your first board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {editingId === board.id ? (
                  <input
                    autoFocus
                    data-testid="rename-input"
                    defaultValue={board.name}
                    onBlur={(e) => handleRename(board.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRename(board.id, e.currentTarget.value);
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                ) : (
                  <h2
                    className="font-semibold text-lg cursor-pointer"
                    onClick={() => openBoard(board.id)}
                  >
                    {board.name}
                  </h2>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Updated {new Date(board.updatedAt).toLocaleString()}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingId(board.id)}
                    aria-label={`Rename ${board.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteBoard(board.id)}
                    aria-label={`Delete ${board.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
