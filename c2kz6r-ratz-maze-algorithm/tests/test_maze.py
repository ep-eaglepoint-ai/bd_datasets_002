import os
import time
import importlib.util
import pytest
import sys

# ---------------------------------------------------------
# DYNAMIC IMPORT LOGIC
# ---------------------------------------------------------
def load_maze_module():
    """
    Dynamically loads the maze module based on PYTHONPATH.
    This ensures we test the exact code running in the environment.
    """
    impl = os.getenv("PYTHONPATH", "")
    if "repository_before" in impl:
        path = "/app/repository_before/maze.py"
    else:
        path = "/app/repository_after/maze.py"

    spec = importlib.util.spec_from_file_location("maze", path)
    if spec is None:
        return importlib.import_module("maze")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

@pytest.fixture
def maze_solver():
    return load_maze_module()

# ---------------------------------------------------------
# BFS OPTIMALITY
# ---------------------------------------------------------
def test_bfs_optimality_trap(maze_solver):
    """
    Trap Maze:
    Open grid (all 0s).
    Start: Top-Left (0,0) -> End: Top-Right (0, 4).

    BFS Strategy: Goes straight Right. Path Length = 5.
    DFS Strategy: Usually prioritizes Down/Right. Will explore the whole grid
                  before coming back. Path Length >> 5.
    """
    size = 20
    maze = [[0 for _ in range(size)] for _ in range(size)]

    path, length = maze_solver.solve_maze(maze, 0, 0, 0, 4)

    # Shortest path guarantee
    assert length == 5, f"Sub-optimal path found: {length}. Expected 5 (BFS)."
    assert len(path) == 5

# ---------------------------------------------------------
# IN-PLACE MODIFICATION (Req 2)
# ---------------------------------------------------------
def test_maze_is_modified_in_place(maze_solver):
    """
    Ensures the solver marks visited cells in the original list
    instead of creating a new visited set/matrix (Memory constraint).
    """
    maze = [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
    ]
    original_snapshot = [row[:] for row in maze]

    maze_solver.solve_maze(maze, 0, 0, 2, 2)

    # The maze should be dirty (contain values != 0 or 1)
    assert maze != original_snapshot, "Maze was not modified in-place (Memory req failed)"

# ---------------------------------------------------------
# RECURSION ELIMINATION
# ---------------------------------------------------------
def test_recursion_limit_safe(maze_solver):
    """
    Iterative implementation.
    A 3000x3000 maze forces a recursion depth > 1000.
    Recursive DFS will crash (RecursionError).
    Iterative BFS will pass.
    """
    size = 1000
    # Create a path that snakes through the whole grid or just a deep simple path
    maze = [[0] * size for _ in range(size)]

    # We don't need a complex maze, just a large empty one allows BFS
    # to fill the queue without crashing the stack.
    # To force deep traversal on DFS, we can make it a line,
    # but an open grid is sufficient to test Stack Overflow on unoptimized code.

    try:
        path, length = maze_solver.solve_maze(maze, 0, 0, size-1, size-1)
    except RecursionError:
        pytest.fail("Solver crashed with RecursionError (Solution is not iterative)")

    assert length > 0

# ---------------------------------------------------------
# NO SOLUTION HANDLING
# ---------------------------------------------------------
def test_no_solution_returns_empty(maze_solver):
    """
    Return ([], 0) if no solution exists.
    (Do NOT raise ValueError).
    """
    maze = [
        [0, 1, 0],
        [1, 1, 0], # Wall blocks path
        [0, 0, 0]
    ]

    path, length = maze_solver.solve_maze(maze, 0, 0, 0, 2)

    assert path == []
    assert length == 0

# ---------------------------------------------------------
# EDGE CASES & VALIDATION
# ---------------------------------------------------------
def test_source_equals_destination(maze_solver):
    """Return immediately if source equals destination."""
    maze = [[0]]
    path, length = maze_solver.solve_maze(maze, 0, 0, 0, 0)
    assert path == [(0, 0)]
    assert length == 1

def test_walls_raise_error(maze_solver):
    """Source or Destination is a wall."""
    maze = [[1, 0], [0, 1]]

    with pytest.raises(ValueError, match="Source"):
        maze_solver.solve_maze(maze, 0, 0, 0, 1)

    with pytest.raises(ValueError, match="Destination"):
        maze_solver.solve_maze(maze, 0, 1, 1, 1)

def test_out_of_bounds_raises(maze_solver):
    """Validate bounds."""
    maze = [[0]]
    with pytest.raises(ValueError):
        maze_solver.solve_maze(maze, -1, 0, 0, 0)
    with pytest.raises(ValueError):
        maze_solver.solve_maze(maze, 0, 0, 5, 5)

def test_empty_maze_raises(maze_solver):
    """Handle empty input."""
    with pytest.raises(ValueError, match="empty"):
        maze_solver.solve_maze([], 0, 0, 0, 0)