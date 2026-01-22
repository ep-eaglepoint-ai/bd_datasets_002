# C2KZ6R - ratz-maze-algorithm

**Category:** sft

## Overview
- Task ID: C2KZ6R
- Title: ratz-maze-algorithm
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: c2kz6r-ratz-maze-algorithm

## Requirements
- Use Breadth-First Search (BFS) instead of Depth-First Search. BFS explores all neighbors at the current depth before moving deeper, which guarantees finding the shortest path in an unweighted graph. Implement this using a queue data structure (collections.deque in Python) where you enqueue the starting position and iteratively dequeue positions, exploring all four adjacent cells and enqueueing valid unvisited neighbors until the destination is reached.
- Replace the 2D solutions matrix with a visited set or in-place marking. Instead of allocating a full n×n matrix to track the solution path, use a set of tuples to track visited cells or modify the input maze in-place by marking visited cells with a special value. This reduces memory overhead and improves cache locality for large mazes.
- Implement parent tracking for path reconstruction. Store a dictionary mapping each visited cell to its parent cell (the cell from which it was reached). Once the destination is found, traverse this parent chain backward from destination to source to reconstruct the actual path, then reverse it to get the path in correct order.
- Use iterative implementation instead of recursion. Replace all recursive calls with an explicit loop and queue/stack structure. This eliminates the risk of stack overflow errors on large mazes and removes the overhead of function call frames, significantly improving performance for mazes larger than a few thousand cells.
- Add early termination when destination is found. The moment the destination cell is dequeued (for BFS) or visited, immediately stop the search and begin path reconstruction. Do not continue exploring other branches of the search space as this wastes computational resources.
- Implement bounds checking before enqueueing rather than after dequeueing. Validate that a neighboring cell is within maze bounds, is not a wall, and has not been visited before adding it to the queue. This prevents invalid positions from ever entering the queue, reducing queue operations and unnecessary iterations.
- Return both the path and its length for verification. The function should return a tuple containing the solution matrix (or list of coordinates representing the path) and an integer representing the path length. This allows callers to verify optimality and provides useful metrics without requiring a second traversal of the solution.
- Handle edge cases explicitly at the start of the function. Check if source equals destination (return immediately with path length 1), if source or destination is a wall (raise ValueError), and if the maze is empty (raise ValueError). Performing these checks upfront avoids unnecessary initialization and provides clear error messages.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
