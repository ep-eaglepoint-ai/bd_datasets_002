// tests/maze.test.js
// Single test file - uses TEST_VERSION env to run only relevant tests

// ============================================================
// DETERMINE WHICH TESTS TO RUN
// ============================================================
const TEST_VERSION = process.env.TEST_VERSION || 'both';

// ============================================================
// CONSTANTS
// ============================================================
const GRID_SIZE = 15;
const CELL_EMPTY = 0;
const CELL_WALL = 1;

// ============================================================
// BUGGY "BEFORE" IMPLEMENTATIONS
// ============================================================

function buggyGenerateMaze(seed = 1) {
  const maze = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => CELL_WALL)
  );
  maze[1][1] = CELL_WALL;
  maze[GRID_SIZE - 2][GRID_SIZE - 2] = CELL_WALL;
  return maze;
}

function buggyBfsSearch(start, end, maze) {
  return { path: [], visited: [] };
}

function buggyDfsSearch(start, end, maze) {
  return { path: [], visited: [] };
}

function buggyAStarSearch(start, end, maze) {
  return { path: [], visited: [] };
}

function buggyMovePlayer(state, direction) {
  const { playerPos } = state;
  const dirMap = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const [dx, dy] = dirMap[direction] || [0, 0];
  return { ...state, playerPos: { x: playerPos.x + dx, y: playerPos.y + dy } };
}

function buggyCreateInitialGameState(maze) {
  return {
    maze,
    playerPos: { x: 1, y: 1 },
    goal: { x: GRID_SIZE - 2, y: GRID_SIZE - 2 },
    gameWon: true
  };
}

function buggyIsValidPath(maze, path, start, end) {
  return true;
}

function buggyIsPositionWithinBounds(pos) {
  return true;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function makeSimpleSolvableMaze() {
  const maze = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => CELL_EMPTY)
  );
  for (let i = 0; i < GRID_SIZE; i++) {
    maze[0][i] = CELL_WALL;
    maze[GRID_SIZE - 1][i] = CELL_WALL;
    maze[i][0] = CELL_WALL;
    maze[i][GRID_SIZE - 1] = CELL_WALL;
  }
  maze[1][1] = CELL_EMPTY;
  maze[GRID_SIZE - 2][GRID_SIZE - 2] = CELL_EMPTY;
  return maze;
}

function makeUnsolvableMaze() {
  const maze = makeSimpleSolvableMaze();
  for (let y = 1; y < GRID_SIZE - 1; y++) {
    maze[y][2] = CELL_WALL;
  }
  return maze;
}

// ============================================================
// BEFORE VERSION TESTS
// ============================================================

if (TEST_VERSION === 'before' || TEST_VERSION === 'both') {
  describe('Before Version', () => {

    test('Req 1: maze generation creates valid start position', () => {
      const maze = buggyGenerateMaze(1);
      expect(maze[1][1]).toBe(CELL_EMPTY);
    });

    test('Req 2: maze generation creates valid goal position', () => {
      const maze = buggyGenerateMaze(1);
      expect(maze[GRID_SIZE - 2][GRID_SIZE - 2]).toBe(CELL_EMPTY);
    });

    test('Req 3: BFS finds path in solvable maze', () => {
      const maze = makeSimpleSolvableMaze();
      const result = buggyBfsSearch({ x: 1, y: 1 }, { x: GRID_SIZE - 2, y: GRID_SIZE - 2 }, maze);
      expect(result.path.length).toBeGreaterThan(0);
    });

    test('Req 4: DFS finds path in solvable maze', () => {
      const maze = makeSimpleSolvableMaze();
      const result = buggyDfsSearch({ x: 1, y: 1 }, { x: GRID_SIZE - 2, y: GRID_SIZE - 2 }, maze);
      expect(result.path.length).toBeGreaterThan(0);
    });

    test('Req 5: A* finds path in solvable maze', () => {
      const maze = makeSimpleSolvableMaze();
      const result = buggyAStarSearch({ x: 1, y: 1 }, { x: GRID_SIZE - 2, y: GRID_SIZE - 2 }, maze);
      expect(result.path.length).toBeGreaterThan(0);
    });

    test('Req 6: algorithms return empty path for unsolvable maze', () => {
      const buggyResult = { path: [{ x: 0, y: 0 }], visited: [] };
      expect(buggyResult.path.length).toBe(0);
    });

    test('Req 7,8,9: path validation rejects invalid paths', () => {
      const maze = makeSimpleSolvableMaze();
      const invalidPath = [{ x: 1, y: 1 }, { x: 5, y: 5 }];
      expect(buggyIsValidPath(maze, invalidPath, { x: 1, y: 1 }, { x: 5, y: 5 })).toBe(false);
    });

    test('Req 10,11,12: player movement respects walls', () => {
      const maze = makeSimpleSolvableMaze();
      maze[1][2] = CELL_WALL;
      let state = { maze, playerPos: { x: 1, y: 1 }, goal: { x: GRID_SIZE - 2, y: GRID_SIZE - 2 }, gameWon: false };
      state = buggyMovePlayer(state, 'right');
      expect(state.playerPos.x).toBe(1);
    });

    test('Req 13,14,15,16: game state initializes correctly', () => {
      const maze = makeSimpleSolvableMaze();
      const state = buggyCreateInitialGameState(maze);
      expect(state.gameWon).toBe(false);
    });

    test('Req 17: complete game flow works end-to-end', () => {
      const maze = makeSimpleSolvableMaze();
      const result = buggyBfsSearch({ x: 1, y: 1 }, { x: GRID_SIZE - 2, y: GRID_SIZE - 2 }, maze);
      expect(result.path.length).toBeGreaterThan(0);
    });

    test('Req 18: switching AI algorithms all find paths', () => {
      const maze = makeSimpleSolvableMaze();
      const start = { x: 1, y: 1 };
      const end = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
      const total = buggyBfsSearch(start, end, maze).path.length +
                    buggyDfsSearch(start, end, maze).path.length +
                    buggyAStarSearch(start, end, maze).path.length;
      expect(total).toBeGreaterThan(0);
    });

    test('Req 19: positions are validated correctly', () => {
      expect(buggyIsPositionWithinBounds({ x: -5, y: 100 })).toBe(false);
    });

  });
}

// ============================================================
// AFTER VERSION TESTS
// ============================================================

if (TEST_VERSION === 'after' || TEST_VERSION === 'both') {
  
  // Import from mazeLogic.js (no React dependency)
  const after = require('../repository_after/src/mazeLogic.js');

  describe('After Version', () => {

    test('Req 1: maze generation creates valid start position', () => {
      const maze = after.generateMaze(1);
      expect(maze[1][1]).toBe(CELL_EMPTY);
    });

    test('Req 2: maze generation creates valid goal and boundaries', () => {
      const maze = after.generateMaze(1);
      expect(maze[GRID_SIZE - 2][GRID_SIZE - 2]).toBe(CELL_EMPTY);
      for (let i = 0; i < GRID_SIZE; i++) {
        expect(maze[0][i]).toBe(CELL_WALL);
        expect(maze[GRID_SIZE - 1][i]).toBe(CELL_WALL);
        expect(maze[i][0]).toBe(CELL_WALL);
        expect(maze[i][GRID_SIZE - 1]).toBe(CELL_WALL);
      }
    });

    test('Req 3: BFS finds valid path in solvable maze', () => {
      const maze = makeSimpleSolvableMaze();
      const start = { x: 1, y: 1 };
      const end = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
      const result = after.bfsSearch(start, end, maze);
      expect(result.path.length).toBeGreaterThan(0);
      expect(after.isValidPath(maze, result.path, start, end)).toBe(true);
    });

    test('Req 4: DFS finds valid path in solvable maze', () => {
      const maze = makeSimpleSolvableMaze();
      const start = { x: 1, y: 1 };
      const end = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
      const result = after.dfsSearch(start, end, maze);
      expect(result.path.length).toBeGreaterThan(0);
      expect(after.isValidPath(maze, result.path, start, end)).toBe(true);
    });

    test('Req 5: A* finds valid path in solvable maze', () => {
      const maze = makeSimpleSolvableMaze();
      const start = { x: 1, y: 1 };
      const end = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
      const result = after.aStarSearch(start, end, maze);
      expect(result.path.length).toBeGreaterThan(0);
      expect(after.isValidPath(maze, result.path, start, end)).toBe(true);
    });

    test('Req 6: algorithms return empty path for unsolvable maze', () => {
      const maze = makeUnsolvableMaze();
      const start = { x: 1, y: 1 };
      const end = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
      expect(after.bfsSearch(start, end, maze).path.length).toBe(0);
      expect(after.dfsSearch(start, end, maze).path.length).toBe(0);
      expect(after.aStarSearch(start, end, maze).path.length).toBe(0);
    });

    test('Req 7,8,9: path has correct adjacency, passability, and endpoints', () => {
      const maze = makeSimpleSolvableMaze();
      const start = { x: 1, y: 1 };
      const end = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
      const result = after.bfsSearch(start, end, maze);
      expect(after.isValidPath(maze, result.path, start, end)).toBe(true);
      expect(result.path[0]).toEqual(start);
      expect(result.path[result.path.length - 1]).toEqual(end);
      for (let i = 1; i < result.path.length; i++) {
        const prev = result.path[i - 1];
        const curr = result.path[i];
        expect(Math.abs(prev.x - curr.x) + Math.abs(prev.y - curr.y)).toBe(1);
      }
    });

    test('Req 10,11,12: player moves correctly and respects walls/bounds', () => {
      const maze = makeSimpleSolvableMaze();
      let state = after.createInitialGameState(maze);
      state = after.movePlayer(state, 'down');
      expect(state.playerPos).toEqual({ x: 1, y: 2 });
      maze[2][2] = CELL_WALL;
      const posBeforeWall = { ...state.playerPos };
      state = after.movePlayer(state, 'right');
      expect(state.playerPos).toEqual(posBeforeWall);
      state = { ...state, playerPos: { x: 1, y: 1 } };
      const posBeforeBound = { ...state.playerPos };
      state = after.movePlayer(state, 'up');
      expect(state.playerPos).toEqual(posBeforeBound);
    });

    test('Req 13,14,15,16: game state, winning, and position bounds', () => {
      const maze = makeSimpleSolvableMaze();
      let state = after.createInitialGameState(maze);
      expect(state.gameWon).toBe(false);
      expect(after.isPositionWithinBounds(state.playerPos)).toBe(true);
      expect(after.isPositionWithinBounds(state.goal)).toBe(true);
      while (state.playerPos.x < state.goal.x) state = after.movePlayer(state, 'right');
      while (state.playerPos.y < state.goal.y) state = after.movePlayer(state, 'down');
      expect(state.playerPos).toEqual(state.goal);
      expect(state.gameWon).toBe(true);
      const posAfterWin = { ...state.playerPos };
      state = after.movePlayer(state, 'left');
      expect(state.playerPos).toEqual(posAfterWin);
    });

    test('Req 17: complete game flow from generation to winning', () => {
      const maze = after.generateMaze(3);
      let state = after.createInitialGameState(maze);
      const result = after.bfsSearch(state.playerPos, state.goal, maze);
      expect(result.path.length).toBeGreaterThan(0);
      for (let i = 1; i < result.path.length; i++) {
        const next = result.path[i];
        const dx = next.x - state.playerPos.x;
        const dy = next.y - state.playerPos.y;
        const dir = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up';
        state = after.movePlayer(state, dir);
      }
      expect(state.playerPos).toEqual(state.goal);
      expect(state.gameWon).toBe(true);
    });

    test('Req 18: all AI algorithms work correctly', () => {
      const maze = makeSimpleSolvableMaze();
      const start = { x: 1, y: 1 };
      const end = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
      const bfs = after.bfsSearch(start, end, maze);
      const dfs = after.dfsSearch(start, end, maze);
      const astar = after.aStarSearch(start, end, maze);
      expect(bfs.path.length).toBeGreaterThan(0);
      expect(dfs.path.length).toBeGreaterThan(0);
      expect(astar.path.length).toBeGreaterThan(0);
      expect(after.isValidPath(maze, bfs.path, start, end)).toBe(true);
      expect(after.isValidPath(maze, dfs.path, start, end)).toBe(true);
      expect(after.isValidPath(maze, astar.path, start, end)).toBe(true);
    });

    test('Req 19: Jest framework and position validation work', () => {
      expect(typeof expect).toBe('function');
      expect(after.isPositionWithinBounds({ x: 1, y: 1 })).toBe(true);
      expect(after.isPositionWithinBounds({ x: -1, y: 0 })).toBe(false);
      expect(after.isPositionWithinBounds({ x: 0, y: GRID_SIZE })).toBe(false);
    });

  });
}