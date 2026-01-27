import { useState } from "react";
import { Auth } from "./components/Auth";
import { BoardList } from "./components/BoardList";
import { Board } from "./components/Board";
import "./App.css";

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [selectedBoard, setSelectedBoard] = useState<number | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setSelectedBoard(null);
  };

  if (!token) {
    return <Auth onLogin={setToken} />;
  }

  if (selectedBoard) {
    return (
      <Board boardId={selectedBoard} onBack={() => setSelectedBoard(null)} />
    );
  }

  return (
    <div className="container">
      <header className="app-header">
        <div className="logo">TaskBoard</div>
        <button onClick={handleLogout}>Logout</button>
      </header>
      <BoardList onSelectBoard={setSelectedBoard} />
    </div>
  );
}

export default App;
