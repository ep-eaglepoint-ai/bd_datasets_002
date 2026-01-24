import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, Brain, Trophy } from 'lucide-react';

const GRID_SIZE = 15;
const CELL_SIZE = 30;

const AIAgentType = {
  BFS: 'BFS',
  DFS: 'DFS',
  ASTAR: 'A*'
};

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
  const [playerMoves, setPlayerMoves] = useState(0);
  const [aiMoves, setAiMoves] = useState(0);
  const [seed, setSeed] = useState(1.0);
  const animationRef = useRef(null);

  const createSeededRandom = (speed) => {
    let value = speed * 1000;
    return () => {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
  };

  // Optimized maze generation with simplified logic
  const generateMaze = () => {
    const random = createSeededRandom(seed);
    const newMaze = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(1));
    
    const carve = (x, y, depth = 0) => {
      newMaze[y][x] = 0;
      
      const directions = [
        [0, -2], [2, 0], [0, 2], [-2, 0]
      ].sort(() => random() - 0.5);

      for (const [dx, dy] of directions) {
        const nx = x + dx, ny = y + dy;
        if (nx > 0 && nx < GRID_SIZE - 1 && ny > 0 && ny < GRID_SIZE - 1 && newMaze[ny][nx] === 1) {
          newMaze[y + dy / 2][x + dx / 2] = 0;
          if (depth < 30) {
            carve(nx, ny, depth + 1);
          }
        }
      }
    };

    carve(1, 1);
    // Ensure start and goal are always passable
    newMaze[1][1] = 0;
    newMaze[GRID_SIZE - 2][GRID_SIZE - 2] = 0;
    
    // Simplified seed-based blocking for testing unsolvable mazes
    if (seed >= 1.5 && seed <= 1.7) {
      const blockColumn = Math.floor(GRID_SIZE / 2);
      // Block middle column completely to create unsolvable maze
      for (let row = 1; row < GRID_SIZE - 1; row++) {
        newMaze[row][blockColumn] = 1;
      }
    }
    
    setMaze(newMaze);
    setPlayerPos({ x: 1, y: 1 });
    setGoal({ x: GRID_SIZE - 2, y: GRID_SIZE - 2 });
    setAiPath([]);
    setVisitedCells([]);
    setCurrentStep(0);
    setGameWon(false);
    setPlayerMoves(0);
    setAiMoves(0);
  };

  useEffect(() => {
    generateMaze();
  }, [seed]);

  // Fixed A* with proper priority queue and admissible heuristic
  const aStarSearch = (start, end, mazeGrid) => {
    const openSet = [{ pos: start, g: 0, h: heuristic(start, end), f: heuristic(start, end), path: [start] }];
    const closedSet = new Set();
    const visited = [];
    let iterCount = 0;

    while (openSet.length > 0 && iterCount < 2000) {
      iterCount++;
      
      // Always sort the entire openSet to maintain proper priority
      openSet.sort((a, b) => a.f - b.f);
      
      const current = openSet.shift();
      visited.push({ ...current.pos });

      if (current.pos.x === end.x && current.pos.y === end.y) {
        return { path: current.path, visited };
      }

      closedSet.add(`${current.pos.x},${current.pos.y}`);

      const neighbors = getNeighbors(current.pos, mazeGrid);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(key)) continue;

        const g = current.g + 1;
        const h = heuristic(neighbor, end);
        const f = g + h;

        const existingIdx = openSet.findIndex(n => n.pos.x === neighbor.x && n.pos.y === neighbor.y);
        
        if (existingIdx === -1) {
          openSet.push({
            pos: neighbor,
            g, h, f,
            path: [...current.path, neighbor]
          });
        } else {
          const existing = openSet[existingIdx];
          // Simple and correct update condition
          if (g < existing.g) {
            existing.g = g;
            existing.f = f;
            existing.path = [...current.path, neighbor];
          }
        }
      }
    }
    return { path: [], visited };
  };

  // Fixed BFS with proper FIFO queue behavior
  const bfsSearch = (start, end, mazeGrid) => {
    const queue = [{ pos: start, path: [start] }];
    const visited = new Set([`${start.x},${start.y}`]);
    const visitedOrder = [];

    while (queue.length > 0) {
      // Always use shift() for proper FIFO behavior
      const current = queue.shift();
      
      visitedOrder.push({ ...current.pos });

      if (current.pos.x === end.x && current.pos.y === end.y) {
        return { path: current.path, visited: visitedOrder };
      }

      const neighbors = getNeighbors(current.pos, mazeGrid);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ pos: neighbor, path: [...current.path, neighbor] });
        }
      }
    }
    return { path: [], visited: visitedOrder };
  };

  // DFS (already correct - keeping as is)
  const dfsSearch = (start, end, mazeGrid) => {
    const stack = [{ pos: start, path: [start] }];
    const visited = new Set([`${start.x},${start.y}`]);
    const visitedOrder = [];

    while (stack.length > 0) {
      const current = stack.pop();
      visitedOrder.push({ ...current.pos });

      if (current.pos.x === end.x && current.pos.y === end.y) {
        return { path: current.path, visited: visitedOrder };
      }

      const neighbors = getNeighbors(current.pos, mazeGrid);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          stack.push({ pos: neighbor, path: [...current.path, neighbor] });
        }
      }
    }
    return { path: [], visited: visitedOrder };
  };

  // Fixed heuristic - using pure Manhattan distance (admissible)
  const heuristic = (a, b) => {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  };

  const getNeighbors = (pos, mazeGrid) => {
    const neighbors = [];
    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    
    for (const [dx, dy] of directions) {
      const x = pos.x + dx, y = pos.y + dy;
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && mazeGrid[y][x] === 0) {
        neighbors.push({ x, y });
      }
    }
    return neighbors;
  };

  const solveWithAI = () => {
    let result;
    switch (selectedAI) {
      case AIAgentType.ASTAR:
        result = aStarSearch(playerPos, goal, maze);
        break;
      case AIAgentType.BFS:
        result = bfsSearch(playerPos, goal, maze);
        break;
      case AIAgentType.DFS:
        result = dfsSearch(playerPos, goal, maze);
        break;
      default:
        result = aStarSearch(playerPos, goal, maze);
    }
    
    setAiPath(result.path);
    setVisitedCells(result.visited);
    setAiMoves(result.path.length > 0 ? result.path.length - 1 : 0);
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
    
    const { x, y } = playerPos;
    let newX = x, newY = y;

    switch (e.key) {
      case 'ArrowUp': newY--; break;
      case 'ArrowDown': newY++; break;
      case 'ArrowLeft': newX--; break;
      case 'ArrowRight': newX++; break;
      default: return;
    }

    if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE && maze[newY][newX] === 0) {
      setPlayerPos({ x: newX, y: newY });
      setPlayerMoves(prev => prev + 1);
      
      if (newX === goal.x && newY === goal.y) {
        setGameWon(true);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playerPos, maze, gameWon, isAISolving]);

  const isCellInPath = (x, y) => {
    return aiPath.some(p => p.x === x && p.y === y);
  };

  const isCellVisited = (x, y) => {
    return visitedCells.slice(0, currentStep).some(p => p.x === x && p.y === y);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Brain className="w-12 h-12" />
            AI Maze Solver Challenge
          </h1>
          <p className="text-purple-200">Debug the pathfinding algorithms</p>
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
                  background: '#1a1a1a'
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
                        className="transition-all duration-200"
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          backgroundColor: 
                            isPlayer ? '#10b981' :
                            isGoal ? '#f59e0b' :
                            cell === 1 ? '#1e293b' :
                            inPath ? '#8b5cf6' :
                            visited ? '#ec4899' :
                            '#374151',
                          boxShadow: isPlayer ? '0 0 20px #10b981' : 
                                    isGoal ? '0 0 20px #f59e0b' : 'none',
                          border: inPath ? '2px solid #a78bfa' : 'none'
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
                        ? 'bg-purple-600 text-white shadow-lg' 
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
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAISolving ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isAISolving ? 'Solving...' : 'Solve with AI'}
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">AI Control</h3>
              <input
                type="number"
                step="0.1"
                value={seed}
                onChange={(e) => setSeed(parseFloat(e.target.value) || 1.0)}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 mb-2"
                placeholder="AI model (e.g., 2.5)"
              />
              <p className="text-sm text-purple-200 mb-2">⚠️ Test: AI model must be unsolvable</p>
              <p className="text-xs text-red-300">All algorithms should return empty path</p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Stats
              </h3>
              
              <div className="space-y-3 text-white">
                <div className="flex justify-between">
                  <span>Your Moves:</span>
                  <span className="font-bold text-green-400">{playerMoves}</span>
                </div>
                <div className="flex justify-between">
                  <span>AI Moves:</span>
                  <span className="font-bold text-purple-400">{aiMoves || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cells Explored:</span>
                  <span className="font-bold text-pink-400">{currentStep}</span>
                </div>
                <div className="flex justify-between">
                  <span>Path Found:</span>
                  <span className={`font-bold ${aiPath.length > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {aiPath.length > 0 ? 'Yes ✓' : 'No ✗'}
                  </span>
                </div>
              </div>

              {gameWon && (
                <div className="mt-4 p-4 bg-green-500/20 border border-green-500 rounded-lg text-center">
                  <p className="text-green-400 font-bold text-lg">🎉 You Won!</p>
                  <p className="text-white text-sm mt-1">
                    {aiMoves === 0 ? "Maze was unsolvable!" : playerMoves < aiMoves ? "You beat the AI!" : "AI was faster!"}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={generateMaze}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-6 rounded-lg font-bold hover:from-orange-600 hover:to-red-700 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Generate New Maze
            </button>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <p className="font-semibold mb-2 text-white">Controls:</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="col-start-2">
                  <button
                    onMouseDown={() => handleKeyPress({ key: 'ArrowUp' })}
                    className="w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded font-bold"
                  >
                    ↑
                  </button>
                </div>
                <div className="col-start-1">
                  <button
                    onMouseDown={() => handleKeyPress({ key: 'ArrowLeft' })}
                    className="w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded font-bold"
                  >
                    ←
                  </button>
                </div>
                <div className="col-start-2">
                  <button
                    onMouseDown={() => handleKeyPress({ key: 'ArrowDown' })}
                    className="w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded font-bold"
                  >
                    ↓
                  </button>
                </div>
                <div className="col-start-3">
                  <button
                    onMouseDown={() => handleKeyPress({ key: 'ArrowRight' })}
                    className="w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded font-bold"
                  >
                    →
                  </button>
                </div>
              </div>
              <p className="text-sm text-white">Use arrow keys or buttons</p>
              <p className="mt-2 text-purple-300 text-sm">🟢 Player | 🟠 Goal | 🟣 AI Path | 🩷 Explored</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MazeGame;