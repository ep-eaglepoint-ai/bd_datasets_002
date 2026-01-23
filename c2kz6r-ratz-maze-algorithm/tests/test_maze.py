import sys
import pytest
import importlib.util
import os
from unittest.mock import MagicMock

# ==========================================
# 1. DYNAMIC IMPORT & ROBUST LOADING
# ==========================================

def load_maze_module():
    """
    Dynamically loads the maze module based on PYTHONPATH.
    """
    impl = os.getenv("PYTHONPATH", "")
    if "repository_before" in impl:
        path = "/app/repository_before/maze.py"
    else:
        path = "/app/repository_after/maze.py"

    if not os.path.exists(path):
        # Fallback to standard import if path logic fails
        try:
            return importlib.import_module("maze")
        except ImportError:
            # Return a Mock so tests fail gracefully
            m = MagicMock()
            m.solve_maze.side_effect = Exception("Maze module could not be loaded")
            return m

    spec = importlib.util.spec_from_file_location("maze", path)
    if spec is None:
        return importlib.import_module("maze")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

@pytest.fixture
def maze_solver():
    return load_maze_module()

# ==========================================
# 2. ALGORITHM & ARCHITECTURE TESTS
# ==========================================

def test_bfs_optimality_trap(maze_solver):
    """
    Trap Maze: Tests BFS (Shortest Path) vs DFS.
    Legacy Code Failure: Returns a Grid (list) or finds a long path.
    """
    size = 20
    maze = [[0 for _ in range(size)] for _ in range(size)]

    try:
        result = maze_solver.solve_maze(maze, 0, 0, 0, 4)

        # Check Legacy Return Type
        if not isinstance(result, tuple):
             pytest.fail(f"Architecture Mismatch: Solver returned {type(result)} instead of Tuple (path, length). Legacy DFS implementation detected.")

        path, length = result

        # Check Optimality
        if length != 5:
            pytest.fail(f"Optimality Failure: Path length is {length}, expected 5. (Likely DFS traversal used instead of BFS)")

    except TypeError:
        pytest.fail("Signature Mismatch: Failed to unpack result. The solver must return (path_list, length_int).")
    except Exception as e:
        pytest.fail(f"Solver crashed: {e}")

def test_maze_is_modified_in_place(maze_solver):
    """
    Memory Efficiency: The maze should be modified in-place to track visited nodes.
    Legacy Code Failure: Creates and returns a new 2D list.
    """
    maze = [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
    ]
    original_snapshot = [row[:] for row in maze]

    try:
        maze_solver.solve_maze(maze, 0, 0, 2, 2)
    except Exception:
        # If it crashes, we just want to check the side effect, so we continue
        pass

    if maze == original_snapshot:
        pytest.fail("Memory Requirement Failed: Maze was not modified in-place. You must use the input grid for visited tracking to save memory.")

def test_recursion_limit_safe(maze_solver):
    """
    Scalability: Large mazes must not cause Stack Overflow.
    Legacy Code Failure: RecursionError (DFS).
    """
    size = 1000
    maze = [[0] * size for _ in range(size)]

    try:
        maze_solver.solve_maze(maze, 0, 0, size-1, size-1)
    except RecursionError:
        pytest.fail("Architecture Mismatch: RecursionError detected. The solution relies on System Stack (DFS) instead of Iterative Queue (BFS).")
    except Exception as e:
        # Ignore other errors (like return type mismatch) as long as it didn't overflow stack
        if "unpack" in str(e):
            pass
        else:
            pytest.fail(f"Solver failed on large input: {e}")

def test_no_solution_returns_empty(maze_solver):
    """
    Return Contract: Impossible maze returns ([], 0).
    Legacy Code Failure: Raises ValueError("No solution!").
    """
    maze = [[0, 1, 0], [1, 1, 0], [0, 0, 0]]

    try:
        result = maze_solver.solve_maze(maze, 0, 0, 0, 2)

        if not isinstance(result, tuple):
             pytest.fail("Architecture Mismatch: Solver returned List/Grid instead of (path, length) tuple.")

        path, length = result
        if path != [] or length != 0:
            pytest.fail(f"Logic Error: Expected ([], 0) for no solution, got ({path}, {length})")

    except ValueError as e:
        pytest.fail(f"Contract Violation: Raised ValueError ({e}) instead of returning ([], 0) for impossible path.")
    except Exception as e:
        pytest.fail(f"Solver crashed: {e}")

# ==========================================
# 3. EDGE CASES & VALIDATION TESTS
# ==========================================

def test_source_equals_destination(maze_solver):
    """
    Edge Case: Start == End. Should return path of length 1.
    """
    maze = [[0]]
    try:
        result = maze_solver.solve_maze(maze, 0, 0, 0, 0)
        if not isinstance(result, tuple):
            pytest.fail("Architecture Mismatch: Returned Grid instead of Tuple.")

        path, length = result
        assert length == 1
        assert path == [(0, 0)]
    except TypeError:
        pytest.fail("Signature Mismatch: Result is not unpacking correctly.")
    except Exception as e:
        pytest.fail(f"Failed handling source==destination: {e}")

def test_walls_raise_error(maze_solver):
    """
    Input Validation: Source or Destination is a wall.
    """
    maze = [[1, 0], [0, 1]]

    try:
        # Source is Wall
        with pytest.raises(ValueError, match="Source"):
            maze_solver.solve_maze(maze, 0, 0, 0, 1)

        # Destination is Wall
        with pytest.raises(ValueError, match="Destination"):
            maze_solver.solve_maze(maze, 0, 1, 1, 1)

    except AssertionError:
        pytest.fail("Input Validation Failed: Did not raise ValueError for Walls at start/end.")
    except Exception as e:
        # If the code crashes with something else (like IndexError), catch it
        if "ValueError" not in str(type(e)):
             pytest.fail(f"Unexpected error type: {type(e)}. Expected ValueError.")

def test_out_of_bounds_raises(maze_solver):
    """
    Input Validation: Coordinates outside grid.
    """
    maze = [[0]]
    try:
        with pytest.raises(ValueError):
            maze_solver.solve_maze(maze, -1, 0, 0, 0)
        with pytest.raises(ValueError):
            maze_solver.solve_maze(maze, 0, 0, 5, 5)
    except AssertionError:
        pytest.fail("Input Validation Failed: Did not raise ValueError for Out-of-Bounds.")
    except Exception as e:
         if "ValueError" not in str(type(e)):
             pytest.fail(f"Unexpected error type: {type(e)}. Expected ValueError.")

def test_empty_maze_raises(maze_solver):
    """
    Input Validation: Empty List.
    """
    try:
        with pytest.raises(ValueError, match="empty"):
            maze_solver.solve_maze([], 0, 0, 0, 0)
    except AssertionError:
        pytest.fail("Input Validation Failed: Did not raise ValueError for empty maze.")
    except IndexError:
        pytest.fail("Implementation Error: Crashed with IndexError (accessed index 0 of empty list) instead of raising ValueError.")
    except Exception as e:
         if "ValueError" not in str(type(e)):
             pytest.fail(f"Unexpected error type: {type(e)}. Expected ValueError.")