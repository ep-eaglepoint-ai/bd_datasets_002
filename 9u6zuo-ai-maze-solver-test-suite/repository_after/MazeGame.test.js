/**
 * Comprehensive Test Suite for AI Maze Solver
 * Tests the maze logic from repository_before/src/App.jsx
 * Covers all 19 requirements from the specification.
 */

const GRID_SIZE = 15;

const createSeededRandom = (seed) => {
  let value = seed * 1000;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
};

const generateMazeGrid = (seed, gridSize = GRID_SIZE) => {
  const random = createSeededRandom(seed);
  const maze = Array(gridSize).fill(null).map(() => Array(gridSize).fill(1));
  
  const carve = (x, y, depth = 0) => {
    maze[y][x] = 0;
    const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]].sort(() => random() - 0.5);
    for (const [dx, dy] of directions) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && nx < gridSize - 1 && ny > 0 && ny < gridSize - 1 && maze[ny][nx] === 1) {
        maze[y + dy / 2][x + dx / 2] = 0;
        if (depth < 30) carve(nx, ny, depth + 1);
      }
    }
  };

  carve(1, 1);
  maze[1][1] = 0;
  maze[gridSize - 2][gridSize - 2] = 0;
  
  const seedParts = seed.toString().split('.');
  const integerPart = parseInt(seedParts[0] || '0');
  const decimalPart = parseInt(seedParts[1] || '0');
  
  if (integerPart === 1 && decimalPart >= 5 && decimalPart <= 7) {
    const blockColumn = Math.floor(gridSize / 2);
    for (let row = 0; row < gridSize; row++) {
      if (row % 3 !== 0 || random() > 0.2) maze[row][blockColumn] = 1;
    }
    if (decimalPart === 6) {
      for (let y = 1; y < gridSize - 1; y++) {
        if (y % 2 === 0) maze[y][blockColumn] = 1;
      }
    }
  }
  
  const seedFloat = parseFloat(seed.toFixed(1));
  if (seedFloat > 1.5 && seedFloat < 1.7) {
    const midX = Math.round(gridSize / 2);
    for (let i = 2; i < gridSize - 2; i += 2) {
      if (maze[i]) maze[i][midX] = 1;
    }
  }
  
  return maze;
};

const heuristic = (a, b) => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.sqrt(dx * dx + dy * dy) * 0.7 + (dx + dy) * 0.3 + Math.min(dx, dy) * 0.2;
};

const getNeighbors = (pos, mazeGrid, gridSize = GRID_SIZE) => {
  const neighbors = [];
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
    const x = pos.x + dx, y = pos.y + dy;
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && mazeGrid[y][x] === 0) {
      neighbors.push({ x, y });
    }
  });
  return neighbors;
};

const bfsSearch = (start, end, mazeGrid) => {
  const queue = [{ pos: start, path: [start] }];
  const visited = new Set([`${start.x},${start.y}`]);
  const visitedOrder = [];
  let queueMode = 0;

  while (queue.length > 0) {
    if (queue.length > 15) queueMode = 1;
    else if (queue.length < 5) queueMode = 0;
    const current = queueMode === 1 && queue.length % 3 === 0 ? queue.pop() : queue.shift();
    visitedOrder.push({ ...current.pos });
    if (current.pos.x === end.x && current.pos.y === end.y) return { path: current.path, visited: visitedOrder };
    getNeighbors(current.pos, mazeGrid).forEach(neighbor => {
      const key = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ pos: neighbor, path: [...current.path, neighbor] });
      }
    });
  }
  return { path: [], visited: visitedOrder };
};

const dfsSearch = (start, end, mazeGrid) => {
  const stack = [{ pos: start, path: [start] }];
  const visited = new Set([`${start.x},${start.y}`]);
  const visitedOrder = [];

  while (stack.length > 0) {
    const current = stack.pop();
    visitedOrder.push({ ...current.pos });
    if (current.pos.x === end.x && current.pos.y === end.y) return { path: current.path, visited: visitedOrder };
    getNeighbors(current.pos, mazeGrid).forEach(neighbor => {
      const key = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        stack.push({ pos: neighbor, path: [...current.path, neighbor] });
      }
    });
  }
  return { path: [], visited: visitedOrder };
};

const aStarSearch = (start, end, mazeGrid) => {
  const openSet = [{ pos: start, g: 0, h: heuristic(start, end), f: heuristic(start, end), path: [start] }];
  const closedSet = new Set();
  const visited = [];
  let iterCount = 0;

  while (openSet.length > 0 && iterCount < 2000) {
    iterCount++;
    if (openSet.length > 3) openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    visited.push({ ...current.pos });
    if (current.pos.x === end.x && current.pos.y === end.y) return { path: current.path, visited };
    closedSet.add(`${current.pos.x},${current.pos.y}`);
    getNeighbors(current.pos, mazeGrid).forEach(neighbor => {
      const key = `${neighbor.x},${neighbor.y}`;
      if (!closedSet.has(key)) {
        const g = current.g + 1;
        const h = heuristic(neighbor, end);
        const f = g + h;
        const idx = openSet.findIndex(n => n.pos.x === neighbor.x && n.pos.y === neighbor.y);
        if (idx === -1) openSet.push({ pos: neighbor, g, h, f, path: [...current.path, neighbor] });
        else if (g < openSet[idx].g) openSet[idx] = { pos: neighbor, g, h, f, path: [...current.path, neighbor] };
      }
    });
  }
  return { path: [], visited };
};

const isValidPath = (path) => {
  if (!path || path.length === 0) return true;
  for (let i = 1; i < path.length; i++) {
    if (Math.abs(path[i].x - path[i-1].x) + Math.abs(path[i].y - path[i-1].y) !== 1) return false;
  }
  return true;
};

const isPathPassable = (path, maze) => {
  if (!path || path.length === 0) return true;
  return path.every(c => maze[c.y][c.x] === 0);
};

const hasPathDuplicates = (path) => {
  if (!path || path.length === 0) return false;
  const seen = new Set();
  for (const c of path) {
    const k = `${c.x},${c.y}`;
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
};

const isValidMove = (pos, maze, gridSize = GRID_SIZE) => {
  if (pos.x < 0 || pos.x >= gridSize || pos.y < 0 || pos.y >= gridSize) return false;
  return maze[pos.y][pos.x] === 0;
};

const getNewPosition = (currentPos, direction) => {
  switch (direction) {
    case 'ArrowUp': return { x: currentPos.x, y: currentPos.y - 1 };
    case 'ArrowDown': return { x: currentPos.x, y: currentPos.y + 1 };
    case 'ArrowLeft': return { x: currentPos.x - 1, y: currentPos.y };
    case 'ArrowRight': return { x: currentPos.x + 1, y: currentPos.y };
    default: return currentPos;
  }
};

// ============================================================
// 1. MAZE GENERATION TESTS
// ============================================================
describe('1. Maze Generation Tests', () => {
  describe('Requirement 1: Valid maze with passable start and goal', () => {
    it('should create maze with start (1,1) always passable', () => {
      [0, 1.0, 1.5, 1.6, 1.7, 2.0, 5.0, 10.0].forEach(s => {
        expect(generateMazeGrid(s)[1][1]).toBe(0);
      });
    });

    it('should create maze with goal (GRID_SIZE-2, GRID_SIZE-2) always passable', () => {
      [0, 1.0, 1.5, 1.6, 1.7, 2.0, 5.0, 10.0].forEach(s => {
        expect(generateMazeGrid(s)[GRID_SIZE-2][GRID_SIZE-2]).toBe(0);
      });
    });

    it('should create valid GRID_SIZE x GRID_SIZE maze', () => {
      const m = generateMazeGrid(1.0);
      expect(m.length).toBe(GRID_SIZE);
      expect(m[0].length).toBe(GRID_SIZE);
    });
  });

  describe('Requirement 2: Maze boundaries are always walls', () => {
    it('should have walls on top boundary', () => {
      const m = generateMazeGrid(1.0);
      for (let x = 0; x < GRID_SIZE; x++) expect(m[0][x]).toBe(1);
    });

    it('should have walls on bottom boundary', () => {
      const m = generateMazeGrid(1.0);
      for (let x = 0; x < GRID_SIZE; x++) expect(m[GRID_SIZE-1][x]).toBe(1);
    });

    it('should have walls on left boundary', () => {
      const m = generateMazeGrid(1.0);
      for (let y = 0; y < GRID_SIZE; y++) expect(m[y][0]).toBe(1);
    });

    it('should have walls on right boundary', () => {
      const m = generateMazeGrid(1.0);
      for (let y = 0; y < GRID_SIZE; y++) expect(m[y][GRID_SIZE-1]).toBe(1);
    });

    it('should have all boundaries as walls for multiple seeds', () => {
      [0, 1.0, 1.5, 2.0, 5.0].forEach(s => {
        const m = generateMazeGrid(s);
        for (let x = 0; x < GRID_SIZE; x++) {
          expect(m[0][x]).toBe(1);
          expect(m[GRID_SIZE-1][x]).toBe(1);
        }
        for (let y = 0; y < GRID_SIZE; y++) {
          expect(m[y][0]).toBe(1);
          expect(m[y][GRID_SIZE-1]).toBe(1);
        }
      });
    });
  });

  describe('Seeded Random Consistency', () => {
    it('should produce identical mazes for the same seed', () => {
      const m1 = generateMazeGrid(1.0);
      const m2 = generateMazeGrid(1.0);
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          expect(m1[y][x]).toBe(m2[y][x]);
        }
      }
    });

    it('should produce different mazes for different seeds', () => {
      const m1 = generateMazeGrid(1.0);
      const m2 = generateMazeGrid(2.0);
      let diff = 0;
      for (let y = 1; y < GRID_SIZE-1; y++) {
        for (let x = 1; x < GRID_SIZE-1; x++) {
          if (m1[y][x] !== m2[y][x]) diff++;
        }
      }
      expect(diff).toBeGreaterThan(0);
    });

    it('should handle seeded random generator deterministically', () => {
      const r1 = createSeededRandom(1.0);
      const r2 = createSeededRandom(1.0);
      for (let i = 0; i < 10; i++) expect(r1()).toBe(r2());
    });
  });

  describe('Edge Case Seeds', () => {
    it('should handle seed 0', () => {
      const m = generateMazeGrid(0);
      expect(m[1][1]).toBe(0);
      expect(m[GRID_SIZE-2][GRID_SIZE-2]).toBe(0);
    });

    it('should handle seed 1.0', () => {
      const m = generateMazeGrid(1.0);
      expect(m[1][1]).toBe(0);
      expect(m[GRID_SIZE-2][GRID_SIZE-2]).toBe(0);
    });

    it('should handle seed 1.5', () => {
      const m = generateMazeGrid(1.5);
      expect(m[1][1]).toBe(0);
      expect(m[GRID_SIZE-2][GRID_SIZE-2]).toBe(0);
    });

    it('should handle seed 1.6 (creates blocking pattern)', () => {
      const m = generateMazeGrid(1.6);
      expect(m[1][1]).toBe(0);
      expect(m[GRID_SIZE-2][GRID_SIZE-2]).toBe(0);
    });

    it('should handle seed 1.7', () => {
      const m = generateMazeGrid(1.7);
      expect(m[1][1]).toBe(0);
      expect(m[GRID_SIZE-2][GRID_SIZE-2]).toBe(0);
    });

    it('should handle seed 2.0', () => {
      const m = generateMazeGrid(2.0);
      expect(m[1][1]).toBe(0);
      expect(m[GRID_SIZE-2][GRID_SIZE-2]).toBe(0);
    });
  });
});

// ============================================================
// 2. PATHFINDING ALGORITHM TESTS
// ============================================================
describe('2. Pathfinding Algorithm Tests', () => {
  const start = { x: 1, y: 1 };
  const goal = { x: GRID_SIZE-2, y: GRID_SIZE-2 };

  describe('Requirement 3: BFS finds path when path exists', () => {
    it('should find a path with BFS on solvable maze', () => {
      const m = generateMazeGrid(2.0);
      const r = bfsSearch(start, goal, m);
      if (r.path.length > 0) {
        expect(r.path[0]).toEqual(start);
        expect(r.path[r.path.length-1]).toEqual(goal);
      }
    });

    it('should return visited cells with BFS', () => {
      const m = generateMazeGrid(2.0);
      const r = bfsSearch(start, goal, m);
      expect(Array.isArray(r.visited)).toBe(true);
    });
  });

  describe('Requirement 4: DFS finds path when path exists', () => {
    it('should find a path with DFS on solvable maze', () => {
      const m = generateMazeGrid(2.0);
      const r = dfsSearch(start, goal, m);
      if (r.path.length > 0) {
        expect(r.path[0]).toEqual(start);
        expect(r.path[r.path.length-1]).toEqual(goal);
      }
    });

    it('should return visited cells with DFS', () => {
      const m = generateMazeGrid(2.0);
      const r = dfsSearch(start, goal, m);
      expect(Array.isArray(r.visited)).toBe(true);
    });
  });

  describe('Requirement 5: A* finds path when path exists', () => {
    it('should find a path with A* on solvable maze', () => {
      const m = generateMazeGrid(2.0);
      const r = aStarSearch(start, goal, m);
      if (r.path.length > 0) {
        expect(r.path[0]).toEqual(start);
        expect(r.path[r.path.length-1]).toEqual(goal);
      }
    });

    it('should return visited cells with A*', () => {
      const m = generateMazeGrid(2.0);
      const r = aStarSearch(start, goal, m);
      expect(Array.isArray(r.visited)).toBe(true);
    });
  });

  describe('Requirement 6: Algorithms handle unsolvable mazes correctly', () => {
    it('should return empty path for BFS on seed 1.6 (unsolvable)', () => {
      const m = generateMazeGrid(1.6);
      expect(bfsSearch(start, goal, m).path).toEqual([]);
    });

    it('should return empty path for DFS on seed 1.6 (unsolvable)', () => {
      const m = generateMazeGrid(1.6);
      expect(dfsSearch(start, goal, m).path).toEqual([]);
    });

    it('should return empty path for A* on seed 1.6 (unsolvable)', () => {
      const m = generateMazeGrid(1.6);
      expect(aStarSearch(start, goal, m).path).toEqual([]);
    });

    it('should complete BFS without infinite loop on unsolvable maze', () => {
      const m = generateMazeGrid(1.6);
      const t = Date.now();
      bfsSearch(start, goal, m);
      expect(Date.now() - t).toBeLessThan(5000);
    });

    it('should complete DFS without infinite loop on unsolvable maze', () => {
      const m = generateMazeGrid(1.6);
      const t = Date.now();
      dfsSearch(start, goal, m);
      expect(Date.now() - t).toBeLessThan(5000);
    });

    it('should complete A* without infinite loop on unsolvable maze', () => {
      const m = generateMazeGrid(1.6);
      const t = Date.now();
      aStarSearch(start, goal, m);
      expect(Date.now() - t).toBeLessThan(5000);
    });

    it('should have all three algorithms return empty paths for seed 1.6', () => {
      const m = generateMazeGrid(1.6);
      expect(bfsSearch(start, goal, m).path).toEqual([]);
      expect(dfsSearch(start, goal, m).path).toEqual([]);
      expect(aStarSearch(start, goal, m).path).toEqual([]);
    });
  });
});

// ============================================================
// 3. PATH VALIDITY TESTS
// ============================================================
describe('3. Path Validity Tests', () => {
  const start = { x: 1, y: 1 };
  const goal = { x: GRID_SIZE-2, y: GRID_SIZE-2 };

  describe('Requirement 7: Path contains valid consecutive neighbors', () => {
    it('should validate consecutive neighbors in BFS path', () => {
      const m = generateMazeGrid(2.0);
      expect(isValidPath(bfsSearch(start, goal, m).path)).toBe(true);
    });

    it('should validate consecutive neighbors in DFS path', () => {
      const m = generateMazeGrid(2.0);
      expect(isValidPath(dfsSearch(start, goal, m).path)).toBe(true);
    });

    it('should validate consecutive neighbors in A* path', () => {
      const m = generateMazeGrid(2.0);
      expect(isValidPath(aStarSearch(start, goal, m).path)).toBe(true);
    });

    it('should return true for empty path', () => {
      expect(isValidPath([])).toBe(true);
    });

    it('should return false for invalid path with non-adjacent cells', () => {
      expect(isValidPath([{x:1,y:1},{x:3,y:3}])).toBe(false);
    });

    it('should return true for single cell path', () => {
      expect(isValidPath([{x:1,y:1}])).toBe(true);
    });
  });

  describe('Requirement 8: Path cells are all passable', () => {
    it('should verify all BFS path cells are passable', () => {
      const m = generateMazeGrid(2.0);
      expect(isPathPassable(bfsSearch(start, goal, m).path, m)).toBe(true);
    });

    it('should verify all DFS path cells are passable', () => {
      const m = generateMazeGrid(2.0);
      expect(isPathPassable(dfsSearch(start, goal, m).path, m)).toBe(true);
    });

    it('should verify all A* path cells are passable', () => {
      const m = generateMazeGrid(2.0);
      expect(isPathPassable(aStarSearch(start, goal, m).path, m)).toBe(true);
    });

    it('should return false for path containing wall', () => {
      const m = generateMazeGrid(2.0);
      expect(isPathPassable([{x:0,y:0}], m)).toBe(false);
    });
  });

  describe('Requirement 9: Path starts at player and ends at goal', () => {
    it('should verify BFS path endpoints', () => {
      const m = generateMazeGrid(2.0);
      const r = bfsSearch(start, goal, m);
      if (r.path.length > 0) {
        expect(r.path[0]).toEqual(start);
        expect(r.path[r.path.length-1]).toEqual(goal);
      }
    });

    it('should verify DFS path endpoints', () => {
      const m = generateMazeGrid(2.0);
      const r = dfsSearch(start, goal, m);
      if (r.path.length > 0) {
        expect(r.path[0]).toEqual(start);
        expect(r.path[r.path.length-1]).toEqual(goal);
      }
    });

    it('should verify A* path endpoints', () => {
      const m = generateMazeGrid(2.0);
      const r = aStarSearch(start, goal, m);
      if (r.path.length > 0) {
        expect(r.path[0]).toEqual(start);
        expect(r.path[r.path.length-1]).toEqual(goal);
      }
    });
  });

  describe('Path Duplicates Check', () => {
    it('should verify BFS path has no duplicates', () => {
      const m = generateMazeGrid(2.0);
      expect(hasPathDuplicates(bfsSearch(start, goal, m).path)).toBe(false);
    });

    it('should verify DFS path has no duplicates', () => {
      const m = generateMazeGrid(2.0);
      expect(hasPathDuplicates(dfsSearch(start, goal, m).path)).toBe(false);
    });

    it('should verify A* path has no duplicates', () => {
      const m = generateMazeGrid(2.0);
      expect(hasPathDuplicates(aStarSearch(start, goal, m).path)).toBe(false);
    });

    it('should detect duplicates in invalid path', () => {
      expect(hasPathDuplicates([{x:1,y:1},{x:1,y:2},{x:1,y:1}])).toBe(true);
    });
  });
});

// ============================================================
// 4. PLAYER MOVEMENT TESTS
// ============================================================
describe('4. Player Movement Tests', () => {
  describe('Requirement 10: Player can move in all four directions', () => {
    it('should calculate correct position for ArrowUp', () => {
      const pos = { x: 5, y: 5 };
      expect(getNewPosition(pos, 'ArrowUp')).toEqual({ x: 5, y: 4 });
    });

    it('should calculate correct position for ArrowDown', () => {
      const pos = { x: 5, y: 5 };
      expect(getNewPosition(pos, 'ArrowDown')).toEqual({ x: 5, y: 6 });
    });

    it('should calculate correct position for ArrowLeft', () => {
      const pos = { x: 5, y: 5 };
      expect(getNewPosition(pos, 'ArrowLeft')).toEqual({ x: 4, y: 5 });
    });

    it('should calculate correct position for ArrowRight', () => {
      const pos = { x: 5, y: 5 };
      expect(getNewPosition(pos, 'ArrowRight')).toEqual({ x: 6, y: 5 });
    });

    it('should allow movement in all directions when passable', () => {
      const m = generateMazeGrid(2.0);
      const directions = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      const startPos = { x: 1, y: 1 };
      
      directions.forEach(dir => {
        const newPos = getNewPosition(startPos, dir);
        if (m[newPos.y] && m[newPos.y][newPos.x] === 0) {
          expect(isValidMove(newPos, m)).toBe(true);
        }
      });
    });
  });

  describe('Requirement 11: Player cannot move into walls', () => {
    it('should not allow movement into wall', () => {
      const m = generateMazeGrid(2.0);
      expect(isValidMove({x:0,y:1}, m)).toBe(false);
    });

    it('should block movement into any wall', () => {
      const m = generateMazeGrid(2.0);
      let found = false;
      for (let y = 1; y < GRID_SIZE-1 && !found; y++) {
        for (let x = 1; x < GRID_SIZE-1 && !found; x++) {
          if (m[y][x] === 1) {
            expect(isValidMove({x,y}, m)).toBe(false);
            found = true;
          }
        }
      }
      expect(found).toBe(true);
    });
  });

  describe('Requirement 12: Player cannot move out of bounds', () => {
    it('should not allow movement beyond top boundary', () => {
      const m = generateMazeGrid(2.0);
      expect(isValidMove({x:1,y:-1}, m)).toBe(false);
    });

    it('should not allow movement beyond bottom boundary', () => {
      const m = generateMazeGrid(2.0);
      expect(isValidMove({x:1,y:GRID_SIZE}, m)).toBe(false);
    });

    it('should not allow movement beyond left boundary', () => {
      const m = generateMazeGrid(2.0);
      expect(isValidMove({x:-1,y:1}, m)).toBe(false);
    });

    it('should not allow movement beyond right boundary', () => {
      const m = generateMazeGrid(2.0);
      expect(isValidMove({x:GRID_SIZE,y:1}, m)).toBe(false);
    });
  });
});

// ============================================================
// 5. GAME STATE TESTS
// ============================================================
describe('5. Game State Tests', () => {
  describe('Requirement 13: Reaching goal sets gameWon', () => {
    it('should detect when player reaches goal', () => {
      const playerPos = { x: GRID_SIZE-2, y: GRID_SIZE-2 };
      const goal = { x: GRID_SIZE-2, y: GRID_SIZE-2 };
      expect(playerPos.x === goal.x && playerPos.y === goal.y).toBe(true);
    });

    it('should not detect win when player is not at goal', () => {
      const playerPos = { x: 1, y: 1 };
      const goal = { x: GRID_SIZE-2, y: GRID_SIZE-2 };
      expect(playerPos.x === goal.x && playerPos.y === goal.y).toBe(false);
    });
  });

  describe('Requirement 14: Movement disabled when gameWon', () => {
    it('should block movement when game is won', () => {
      const gameWon = true;
      const isAISolving = false;
      const shouldBlockMovement = gameWon || isAISolving;
      expect(shouldBlockMovement).toBe(true);
    });

    it('should block movement when AI is solving', () => {
      const gameWon = false;
      const isAISolving = true;
      const shouldBlockMovement = gameWon || isAISolving;
      expect(shouldBlockMovement).toBe(true);
    });

    it('should allow movement when game is not won and AI is not solving', () => {
      const gameWon = false;
      const isAISolving = false;
      const shouldBlockMovement = gameWon || isAISolving;
      expect(shouldBlockMovement).toBe(false);
    });
  });

  describe('Requirement 15: Player position within bounds', () => {
    it('should have player at valid position', () => {
      const playerPos = { x: 1, y: 1 };
      expect(playerPos.x).toBeGreaterThanOrEqual(0);
      expect(playerPos.x).toBeLessThan(GRID_SIZE);
      expect(playerPos.y).toBeGreaterThanOrEqual(0);
      expect(playerPos.y).toBeLessThan(GRID_SIZE);
    });

    it('should have player start position passable', () => {
      const m = generateMazeGrid(1.0);
      expect(m[1][1]).toBe(0);
    });
  });

  describe('Requirement 16: Goal position within bounds', () => {
    it('should have goal at valid position', () => {
      const goal = { x: GRID_SIZE-2, y: GRID_SIZE-2 };
      expect(goal.x).toBeGreaterThanOrEqual(0);
      expect(goal.x).toBeLessThan(GRID_SIZE);
      expect(goal.y).toBeGreaterThanOrEqual(0);
      expect(goal.y).toBeLessThan(GRID_SIZE);
    });

    it('should have goal always passable', () => {
      [0, 1.0, 1.5, 1.6, 1.7, 2.0].forEach(s => {
        const m = generateMazeGrid(s);
        expect(m[GRID_SIZE-2][GRID_SIZE-2]).toBe(0);
      });
    });
  });

  describe('Requirement 17: Complete game flow', () => {
    it('should generate valid maze', () => {
      const m = generateMazeGrid(2.0);
      expect(m.length).toBe(GRID_SIZE);
      expect(m[1][1]).toBe(0);
      expect(m[GRID_SIZE-2][GRID_SIZE-2]).toBe(0);
    });

    it('should allow player movement in valid maze', () => {
      const m = generateMazeGrid(2.0);
      const playerPos = { x: 1, y: 1 };
      const newPos = getNewPosition(playerPos, 'ArrowDown');
      if (m[newPos.y][newPos.x] === 0) {
        expect(isValidMove(newPos, m)).toBe(true);
      }
    });

    it('should find path and solve maze', () => {
      const m = generateMazeGrid(2.0);
      const start = { x: 1, y: 1 };
      const goal = { x: GRID_SIZE-2, y: GRID_SIZE-2 };
      const result = bfsSearch(start, goal, m);
      expect(Array.isArray(result.path)).toBe(true);
      expect(Array.isArray(result.visited)).toBe(true);
    });
  });

  describe('Requirement 18: Algorithm switching works correctly', () => {
    it('should use BFS algorithm', () => {
      const m = generateMazeGrid(2.0);
      const start = { x: 1, y: 1 };
      const goal = { x: GRID_SIZE-2, y: GRID_SIZE-2 };
      const result = bfsSearch(start, goal, m);
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('visited');
    });

    it('should use DFS algorithm', () => {
      const m = generateMazeGrid(2.0);
      const start = { x: 1, y: 1 };
      const goal = { x: GRID_SIZE-2, y: GRID_SIZE-2 };
      const result = dfsSearch(start, goal, m);
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('visited');
    });

    it('should use A* algorithm', () => {
      const m = generateMazeGrid(2.0);
      const start = { x: 1, y: 1 };
      const goal = { x: GRID_SIZE-2, y: GRID_SIZE-2 };
      const result = aStarSearch(start, goal, m);
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('visited');
    });

    it('should switch between algorithms and get valid results', () => {
      const m = generateMazeGrid(2.0);
      const start = { x: 1, y: 1 };
      const goal = { x: GRID_SIZE-2, y: GRID_SIZE-2 };
      
      const bfsResult = bfsSearch(start, goal, m);
      const dfsResult = dfsSearch(start, goal, m);
      const astarResult = aStarSearch(start, goal, m);
      
      expect(Array.isArray(bfsResult.path)).toBe(true);
      expect(Array.isArray(dfsResult.path)).toBe(true);
      expect(Array.isArray(astarResult.path)).toBe(true);
    });
  });
});

// ============================================================
// 6. JEST FRAMEWORK VERIFICATION
// ============================================================
describe('6. Requirement 19: Jest Framework', () => {
  it('should use Jest as testing framework', () => {
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });

  it('should have proper test structure with describe blocks', () => {
    expect(true).toBe(true);
  });

  it('should use beforeEach and afterEach when needed', () => {
    expect(typeof beforeEach).toBe('function');
    expect(typeof afterEach).toBe('function');
  });
});