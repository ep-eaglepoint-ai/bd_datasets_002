// repository_after/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, Brain, Trophy } from 'lucide-react';

// Import all logic from separate file
import {
  GRID_SIZE,
  CELL_SIZE,
  CELL_EMPTY,
  CELL_WALL,
  AIAgentType,
  generateMaze,
  bfsSearch,
  dfsSearch,
  aStarSearch,
  isValidPath,
  createInitialGameState,
  movePlayer,
  isPositionWithinBounds,
} from './mazeLogic.js';

// Re-export for any other imports
export {
  GRID_SIZE,
  CELL_SIZE,
  CELL_EMPTY,
  CELL_WALL,
  AIAgentType,
  generateMaze,
  bfsSearch,
  dfsSearch,
  aStarSearch,
  isValidPath,
  createInitialGameState,
  movePlayer,
  isPositionWithinBounds,
};

// --- MAIN COMPONENT ---
const MazeGame = () => {
  const [maze, setMaze] = useState([]);
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [goal, setGoal] = useState({ x: GRID_SIZE - 2, y: GRID_SIZE - 2 });
  const [aiPath, setAiPath] = useState([]);
  const [visitedCells, setVisitedCells] = useState([]);
  const [isAISolving, setIsAISolving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAI, setSelectedAI] = useState(AIAgentType.ASTAR);
  const [gameWon, setGameWon] = useState(false);
  const [seed, setSeed] = useState(1);
  const animationRef = useRef(null);

  useEffect(() => {
    const newMaze = generateMaze(seed);
    setMaze(newMaze);
    setPlayerPos({ x: 1, y: 1 });
    setGoal({ x: GRID_SIZE - 2, y: GRID_SIZE - 2 });
    setAiPath([]);
    setVisitedCells([]);
    setCurrentStep(0);
    setGameWon(false);
  }, [seed]);

  const solveWithAI = () => {
    let result;
    switch (selectedAI) {
      case AIAgentType.BFS:
        result = bfsSearch(playerPos, goal, maze);
        break;
      case AIAgentType.DFS:
        result = dfsSearch(playerPos, goal, maze);
        break;
      case AIAgentType.ASTAR:
      default:
        result = aStarSearch(playerPos, goal, maze);
    }
    setAiPath(result.path);
    setVisitedCells(result.visited);
    setCurrentStep(0);
    setIsAISolving(true);
  };

  useEffect(() => {
    if (isAISolving && currentStep < visitedCells.length) {
      animationRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 50);
    } else if (isAISolving && currentStep >= visitedCells.length) {
      setIsAISolving(false);
    }
    return () => clearTimeout(animationRef.current);
  }, [isAISolving, currentStep, visitedCells.length]);

  const handleKeyPress = (e) => {
    if (gameWon || isAISolving) return;

    const dirMap = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };

    const direction = dirMap[e.key];
    if (!direction) return;

    const state = { maze, playerPos, goal, gameWon };
    const newState = movePlayer(state, direction);
    
    setPlayerPos(newState.playerPos);
    if (newState.gameWon) {
      setGameWon(true);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playerPos, maze, gameWon, isAISolving]);

  const isCellInPath = (x, y) => aiPath.some(p => p.x === x && p.y === y);
  const isCellVisited = (x, y) => visitedCells.slice(0, currentStep).some(p => p.x === x && p.y === y);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Brain className="w-12 h-12" />
            AI Maze Solver
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div
                className="inline-block bg-gray-900 p-4 rounded-xl shadow-2xl"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                  gap: '1px',
                }}
              >
                {maze.map((row, y) =>
                  row.map((cell, x) => {
                    const isPlayer = playerPos.x === x && playerPos.y === y;
                    const isGoal = goal.x === x && goal.y === y;
                    const inPath = isCellInPath(x, y);
                    const visited = isCellVisited(x, y);

                    return (
                      <div
                        key={`${x}-${y}`}
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          backgroundColor:
                            isPlayer ? '#10b981' :
                            isGoal ? '#f59e0b' :
                            cell === CELL_WALL ? '#1e293b' :
                            inPath ? '#8b5cf6' :
                            visited ? '#ec4899' :
                            '#374151',
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI Agent
              </h3>
              <div className="space-y-3 mb-4">
                {Object.values(AIAgentType).map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedAI(type)}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                      selectedAI === type
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button
                onClick={solveWithAI}
                disabled={isAISolving}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-bold"
              >
                {isAISolving ? <Pause className="w-5 h-5 inline" /> : <Play className="w-5 h-5 inline" />}
                {isAISolving ? ' Solving...' : ' Solve with AI'}
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Controls
              </h3>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 mb-4"
                placeholder="Seed"
              />
              <button
                onClick={() => setSeed(s => s + 1)}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-6 rounded-lg font-bold flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                New Maze
              </button>
            </div>

            {gameWon && (
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 text-center">
                <p className="text-green-400 font-bold text-lg">🎉 You Won!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MazeGame;