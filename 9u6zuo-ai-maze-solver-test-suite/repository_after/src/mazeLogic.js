// repository_after/src/mazeLogic.js
// Pure logic functions - no React dependencies

export const GRID_SIZE = 15;
export const CELL_SIZE = 30;
export const CELL_EMPTY = 0;
export const CELL_WALL = 1;

export const AIAgentType = {
  BFS: 'BFS',
  DFS: 'DFS',
  ASTAR: 'A*',
};

// --- HELPER FUNCTIONS ---

function inBounds(x, y) {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

// --- MAZE GENERATION ---

export function generateMaze(seed = 1) {
  const maze = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => CELL_WALL)
  );

  let rnd = seed * 1000;
  const random = () => {
    rnd = (rnd * 9301 + 49297) % 233280;
    return rnd / 233280;
  };

  // Boundaries are walls
  for (let y = 0; y < GRID_SIZE; y++) {
    maze[y][0] = CELL_WALL;
    maze[y][GRID_SIZE - 1] = CELL_WALL;
  }
  for (let x = 0; x < GRID_SIZE; x++) {
    maze[0][x] = CELL_WALL;
    maze[GRID_SIZE - 1][x] = CELL_WALL;
  }

  const carve = (x, y) => {
    maze[y][x] = CELL_EMPTY;
    const dirs = [
      [0, -2], [2, 0], [0, 2], [-2, 0],
    ].sort(() => random() - 0.5);

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(nx, ny) && nx > 0 && nx < GRID_SIZE - 1 && ny > 0 && ny < GRID_SIZE - 1) {
        if (maze[ny][nx] === CELL_WALL) {
          maze[y + dy / 2][x + dx / 2] = CELL_EMPTY;
          carve(nx, ny);
        }
      }
    }
  };

  carve(1, 1);
  maze[1][1] = CELL_EMPTY;
  maze[GRID_SIZE - 2][GRID_SIZE - 2] = CELL_EMPTY;
  return maze;
}

// --- PATHFINDING HELPERS ---

export function getNeighbors(pos, maze) {
  const neighbors = [];
  const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (const [dx, dy] of directions) {
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (inBounds(nx, ny) && maze[ny][nx] === CELL_EMPTY) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  return neighbors;
}

// --- BFS SEARCH ---

export function bfsSearch(start, end, maze) {
  const queue = [{ pos: start, path: [start] }];
  const visitedSet = new Set([`${start.x},${start.y}`]);
  const visitedOrder = [];

  while (queue.length > 0) {
    const current = queue.shift();
    visitedOrder.push({ ...current.pos });

    if (current.pos.x === end.x && current.pos.y === end.y) {
      return { path: current.path, visited: visitedOrder };
    }

    for (const n of getNeighbors(current.pos, maze)) {
      const key = `${n.x},${n.y}`;
      if (!visitedSet.has(key)) {
        visitedSet.add(key);
        queue.push({ pos: n, path: [...current.path, n] });
      }
    }
  }
  return { path: [], visited: visitedOrder };
}

// --- DFS SEARCH ---

export function dfsSearch(start, end, maze) {
  const stack = [{ pos: start, path: [start] }];
  const visitedSet = new Set([`${start.x},${start.y}`]);
  const visitedOrder = [];

  while (stack.length > 0) {
    const current = stack.pop();
    visitedOrder.push({ ...current.pos });

    if (current.pos.x === end.x && current.pos.y === end.y) {
      return { path: current.path, visited: visitedOrder };
    }

    for (const n of getNeighbors(current.pos, maze)) {
      const key = `${n.x},${n.y}`;
      if (!visitedSet.has(key)) {
        visitedSet.add(key);
        stack.push({ pos: n, path: [...current.path, n] });
      }
    }
  }
  return { path: [], visited: visitedOrder };
}

// --- A* SEARCH ---

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function aStarSearch(start, end, maze) {
  const open = [{ pos: start, g: 0, h: manhattan(start, end), f: manhattan(start, end), path: [start] }];
  const visitedOrder = [];
  const closedSet = new Set();

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    visitedOrder.push({ ...current.pos });

    if (current.pos.x === end.x && current.pos.y === end.y) {
      return { path: current.path, visited: visitedOrder };
    }

    closedSet.add(`${current.pos.x},${current.pos.y}`);

    for (const n of getNeighbors(current.pos, maze)) {
      if (closedSet.has(`${n.x},${n.y}`)) continue;

      const g = current.g + 1;
      const h = manhattan(n, end);
      const f = g + h;

      const existingIdx = open.findIndex(node => node.pos.x === n.x && node.pos.y === n.y);
      if (existingIdx === -1) {
        open.push({ pos: n, g, h, f, path: [...current.path, n] });
      } else if (g < open[existingIdx].g) {
        open[existingIdx].g = g;
        open[existingIdx].f = f;
        open[existingIdx].path = [...current.path, n];
      }
    }
  }
  return { path: [], visited: visitedOrder };
}

// --- PATH VALIDATION ---

export function isValidPath(maze, path, start, end) {
  if (!path || path.length === 0) return false;
  if (path[0].x !== start.x || path[0].y !== start.y) return false;
  if (path[path.length - 1].x !== end.x || path[path.length - 1].y !== end.y) return false;

  for (let i = 0; i < path.length; i++) {
    const { x, y } = path[i];
    if (!inBounds(x, y) || maze[y][x] !== CELL_EMPTY) return false;
    if (i > 0) {
      const prev = path[i - 1];
      if (Math.abs(prev.x - x) + Math.abs(prev.y - y) !== 1) return false;
    }
  }
  return true;
}

// --- GAME STATE ---

export function createInitialGameState(maze) {
  return {
    maze,
    playerPos: { x: 1, y: 1 },
    goal: { x: GRID_SIZE - 2, y: GRID_SIZE - 2 },
    gameWon: false,
  };
}

export function movePlayer(state, direction) {
  const { playerPos, goal, maze, gameWon } = state;
  if (gameWon) return state;

  const dirMap = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const [dx, dy] = dirMap[direction] || [0, 0];
  const newX = playerPos.x + dx;
  const newY = playerPos.y + dy;

  if (!inBounds(newX, newY) || maze[newY][newX] === CELL_WALL) return state;

  const newGameWon = (newX === goal.x && newY === goal.y) || gameWon;

  return {
    ...state,
    playerPos: { x: newX, y: newY },
    gameWon: newGameWon,
  };
}

export function isPositionWithinBounds(pos) {
  return inBounds(pos.x, pos.y);
}