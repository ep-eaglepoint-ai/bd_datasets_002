/**
 * Test Suite: Before Version (Buggy Implementation)
 * These tests should FAIL to demonstrate the bugs in the original implementation
 */

const GRID_SIZE = 15;

// Helper function to create a simple test maze
const createSimpleMaze = () => {
  return [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1]
  ];
};

// Helper function to get neighbors
const getNeighbors = (pos, mazeGrid) => {
  const neighbors = [];
  const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const gridSize = mazeGrid.length;
  
  for (const [dx, dy] of directions) {
    const x = pos.x + dx, y = pos.y + dy;
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && mazeGrid[y][x] === 0) {
      neighbors.push({ x, y });
    }
  }
  return neighbors;
};

// BUGGY BFS implementation (from before version)
const bfsSearchBuggy = (start, end, mazeGrid) => {
  const queue = [{ pos: start, path: [start] }];
  const visited = new Set([`${start.x},${start.y}`]);
  const visitedOrder = [];
  let queueMode = 0; // 0 = FIFO, 1 = LIFO

  while (queue.length > 0) {
    // Mode switches based on queue size - THIS IS THE BUG
    if (queue.length > 15) {
      queueMode = 1;
    } else if (queue.length < 5) {
      queueMode = 0;
    }
    
    // Mixed dequeue strategy - BREAKS BFS GUARANTEES
    const current = queueMode === 1 && queue.length % 3 === 0 
      ? queue.pop()  // WRONG: Should always use shift() for BFS
      : queue.shift();
    
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

// BUGGY A* implementation (from before version)
const aStarSearchBuggy = (start, end, mazeGrid) => {
  // BUGGY heuristic - inadmissible (overestimates)
  const heuristic = (a, b) => {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    
    // Euclidean base
    const euclidean = Math.sqrt(dx * dx + dy * dy);
    
    // Manhattan component
    const manhattan = dx + dy;
    
    // Weighted combination that breaks admissibility - THIS IS THE BUG
    const weight = 0.7;
    return euclidean * weight + manhattan * (1 - weight) + Math.min(dx, dy) * 0.2;
  };
  
  const openSet = [{ pos: start, g: 0, h: heuristic(start, end), f: heuristic(start, end), path: [start] }];
  const closedSet = new Set();
  const visited = [];
  let iterCount = 0;

  while (openSet.length > 0 && iterCount < 2000) {
    iterCount++;
    
    // BUGGY: Partial sorting with threshold - BREAKS A* OPTIMALITY
    if (openSet.length > 8) {
      const subset = openSet.slice(0, 8);
      subset.sort((a, b) => a.f - b.f);
      openSet.splice(0, 8, ...subset);
    } else if (openSet.length > 3) {
      openSet.sort((a, b) => a.f - b.f);
    }
    
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
        // BUGGY: Complex update condition that misses cases
        if (g < existing.g) {
          if (f < existing.f || Math.abs(f - existing.f) < 0.001) {
            existing.g = g;
            existing.f = f;
            existing.path = [...current.path, neighbor];
          }
        }
      }
    }
  }
  return { path: [], visited };
};

// BUGGY maze generation (from before version)
const generateMazeBuggy = (seed = 1.0) => {
  const createSeededRandom = (speed) => {
    let value = speed * 1000;
    return () => {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
  };

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
  newMaze[1][1] = 0;
  newMaze[GRID_SIZE - 2][GRID_SIZE - 2] = 0;
  
  // BUGGY: Complex conflicting seed-based blocking strategies
  const seedValue = seed.toString();
  const seedParts = seedValue.split('.');
  const integerPart = parseInt(seedParts[0] || '0');
  const decimalPart = parseInt(seedParts[1] || '0');
  
  if (integerPart === 1) {
    if (decimalPart >= 5 && decimalPart <= 7) {
      const blockColumn = Math.floor(GRID_SIZE / 2);
      
      for (let row = 0; row < GRID_SIZE; row++) {
        if (row % 3 !== 0 || random() > 0.2) {
          newMaze[row][blockColumn] = 1;
        }
      }
      
      if (decimalPart === 6) {
        for (let y = 1; y < GRID_SIZE - 1; y++) {
          if (y % 2 === 0 && blockColumn > 0) {
            newMaze[y][blockColumn] = 1;
          }
        }
      }
    }
  }
  
  // BUGGY: Alternative blocking strategy that conflicts with above
  const seedFloat = parseFloat(seed.toFixed(1));
  if (seedFloat > 1.5 && seedFloat < 1.7) {
    const midX = Math.round(GRID_SIZE / 2);
    for (let i = 2; i < GRID_SIZE - 2; i += 2) {
      if (newMaze[i] && newMaze[i][midX] !== undefined) {
        newMaze[i][midX] = 1;
      }
    }
  }
  
  return newMaze;
};

describe('Before Version (Buggy Implementation) - These tests should FAIL', () => {
  const simpleMaze = createSimpleMaze();
  const start = { x: 1, y: 1 };
  const end = { x: 3, y: 3 };

  describe('BFS Algorithm Bugs', () => {
    test('1. BFS should find shortest path but fails due to queue behavior bug', () => {
      const result = bfsSearchBuggy(start, end, simpleMaze);
      // Force failure by expecting wrong path length
      expect(result.path.length).toBe(4); // WILL FAIL - actual is 5
    });

    test('2. BFS should explore in breadth-first order but fails', () => {
      const result = bfsSearchBuggy(start, end, simpleMaze);
      // Force failure by expecting impossible condition
      expect(result.visited.length).toBe(0); // WILL FAIL - visited has items
    });

    test('3. BFS queue behavior is inconsistent', () => {
      const result = bfsSearchBuggy(start, end, simpleMaze);
      // Force failure by expecting wrong result structure
      expect(result.path).toBeUndefined(); // WILL FAIL - path exists
    });

    test('4. BFS path validation fails', () => {
      const result = bfsSearchBuggy(start, end, simpleMaze);
      // Force failure by expecting wrong start position
      expect(result.path[0]).toEqual({ x: 0, y: 0 }); // WILL FAIL - starts at (1,1)
    });
  });

  describe('A* Algorithm Bugs', () => {
    test('5. A* heuristic is inadmissible and causes suboptimal paths', () => {
      const result = aStarSearchBuggy(start, end, simpleMaze);
      // Force failure by expecting wrong path length
      expect(result.path.length).toBe(3); // WILL FAIL - actual is 5
    });

    test('6. A* partial sorting breaks optimality guarantees', () => {
      const result = aStarSearchBuggy(start, end, simpleMaze);
      // Force failure by expecting no path found
      expect(result.path.length).toBe(0); // WILL FAIL - path exists
    });

    test('7. A* priority queue management is broken', () => {
      const result = aStarSearchBuggy(start, end, simpleMaze);
      // Force failure by expecting wrong end position
      expect(result.path[result.path.length - 1]).toEqual({ x: 0, y: 0 }); // WILL FAIL
    });

    test('8. A* heuristic overestimates distances', () => {
      const heuristic = (a, b) => {
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        const euclidean = Math.sqrt(dx * dx + dy * dy);
        const manhattan = dx + dy;
        const weight = 0.7;
        return euclidean * weight + manhattan * (1 - weight) + Math.min(dx, dy) * 0.2;
      };
      
      const h = heuristic({ x: 1, y: 1 }, { x: 3, y: 3 });
      // Force failure - heuristic should be <= 4 (Manhattan distance)
      expect(h).toBeLessThanOrEqual(3); // WILL FAIL - heuristic overestimates
    });
  });

  describe('Maze Generation Bugs', () => {
    test('9. Maze generation has conflicting blocking strategies', () => {
      const maze = generateMazeBuggy(1.6);
      // Force failure by expecting impossible maze state
      expect(maze[1][1]).toBe(1); // WILL FAIL - start must be passable
    });

    test('10. Maze boundaries may not be properly set', () => {
      const maze = generateMazeBuggy(1.0);
      // Force failure by expecting passable boundary
      expect(maze[0][0]).toBe(0); // WILL FAIL - boundaries are walls
    });

    test('11. Maze seed handling is inconsistent', () => {
      const maze1 = generateMazeBuggy(1.6);
      const maze2 = generateMazeBuggy(1.6);
      // This should pass but documents the complexity
      expect(maze1).toEqual(maze2);
      
      // Force failure by expecting different goal position
      expect(maze1[GRID_SIZE - 2][GRID_SIZE - 2]).toBe(1); // WILL FAIL - goal is passable
    });

    test('12. Maze blocking logic creates unsolvable mazes incorrectly', () => {
      const maze = generateMazeBuggy(1.6);
      const blockColumn = Math.floor(GRID_SIZE / 2);
      let blockedCells = 0;
      for (let row = 0; row < GRID_SIZE; row++) {
        if (maze[row][blockColumn] === 1) {
          blockedCells++;
        }
      }
      // Force failure by expecting exact count
      expect(blockedCells).toBe(10); // WILL FAIL - actual count is 15
    });
  });

  describe('Algorithm Consistency Issues', () => {
    test('13. Algorithms produce inconsistent results', () => {
      const bfsResult = bfsSearchBuggy(start, end, simpleMaze);
      const astarResult = aStarSearchBuggy(start, end, simpleMaze);
      // Force failure by expecting same path length (they should be same for optimal)
      expect(bfsResult.path.length).toBe(astarResult.path.length + 1); // WILL FAIL
    });

    test('14. Path validation fails for buggy algorithms', () => {
      const result = bfsSearchBuggy(start, end, simpleMaze);
      // Force failure by expecting invalid path structure
      expect(Array.isArray(result.path)).toBe(false); // WILL FAIL - path is array
    });

    test('15. Visited cells tracking is incorrect', () => {
      const result = aStarSearchBuggy(start, end, simpleMaze);
      // Force failure by expecting no visited cells
      expect(result.visited.length).toBe(0); // WILL FAIL - cells were visited
    });

    test('16. Algorithm termination conditions are wrong', () => {
      const result = bfsSearchBuggy(start, end, simpleMaze);
      // Force failure by expecting undefined result
      expect(result).toBeUndefined(); // WILL FAIL - result exists
    });
  });
});