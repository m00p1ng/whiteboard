import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { ThemeMenu } from '@/components/ThemeMenu';
import { Button } from '@/components/ui/button';
import { useBoardStore } from '@/store/boardStore';
import { useRelativeTime } from '@/hooks/useRelativeTime';

function BoardUpdatedAt({ updatedAt }: { updatedAt: number }) {
  const relative = useRelativeTime(updatedAt);
  return (
    <p
      className="mt-1 text-sm text-muted-foreground"
      title={new Date(updatedAt).toLocaleString()}
    >
      Updated {relative}
    </p>
  );
}

export function HomePage() {
  const boards = useBoardStore((state) => state.boards);
  const createBoard = useBoardStore((state) => state.createBoard);
  const openBoard = useBoardStore((state) => state.openBoard);
  const renameBoard = useBoardStore((state) => state.renameBoard);
  const deleteBoard = useBoardStore((state) => state.deleteBoard);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sortedBoards = [...boards].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  const handleRename = (id: string, value: string) => {
    renameBoard(id, value);
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-canvas p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Boards</h1>
          <div className="flex items-center gap-1">
            <Button onClick={() => createBoard()}>
              <Plus className="h-4 w-4 mr-2" />
              New board
            </Button>
            <ThemeMenu />
          </div>
        </div>

        {boards.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No boards yet.</p>
            <Button onClick={() => createBoard()} className="mt-4">
              Create your first board
            </Button>
          </div>
        ) : (
          <div
            data-testid="board-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {sortedBoards.map((board) => (
              <div
                key={board.id}
                className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-shadow hover:shadow-md"
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
                    className="w-full rounded border bg-background px-2 py-1 text-sm"
                  />
                ) : (
                  <h2
                    className="font-semibold text-lg cursor-pointer"
                    onClick={() => openBoard(board.id)}
                  >
                    {board.name}
                  </h2>
                )}
                <BoardUpdatedAt updatedAt={board.updatedAt} />
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
