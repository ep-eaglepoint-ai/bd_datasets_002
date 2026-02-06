import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { Board } from "../types";

interface BoardListProps {
  onSelectBoard: (boardId: number) => void;
}

export const BoardList = ({ onSelectBoard }: BoardListProps) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardName, setNewBoardName] = useState("");

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      const data = await api.getBoards();
      setBoards(data.boards || []);
    } catch (err) {
      console.error("Failed to load boards");
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    try {
      await api.createBoard(newBoardName);
      setNewBoardName("");
      loadBoards();
    } catch (err) {
      console.error("Failed to create board");
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: "24px" }}>My Boards</h2>
      <form onSubmit={handleCreateBoard} className="input-group">
        <input
          type="text"
          placeholder="New board name"
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
        />
        <button type="submit">Create Board</button>
      </form>
      <div className="board-grid">
        {boards.map((board) => (
          <div
            key={board.id}
            onClick={() => onSelectBoard(board.id)}
            className="card"
            style={{ cursor: "pointer" }}
          >
            <h3>{board.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};
