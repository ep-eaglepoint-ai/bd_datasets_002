# Trajectory

## 1. Audit the Original Code (Identify Scaling Problems)

I audited the original `GridHeatmapSolver` implementation. It used `copy.deepcopy()` to clone the entire grid on every iteration, called a helper function `get_neighbors()` for every single cell (creating millions of function calls), and allocated new lists inside the innermost loop — all of which would not scale to large grids.

Understanding why `copy.deepcopy()` is expensive: Python's deepcopy recursively traverses and clones nested structures, which is extremely slow for large 2D arrays.

Link: [https://docs.python.org/3/library/copy.html](https://docs.python.org/3/library/copy.html)

## 2. Define a Performance Contract First

I defined performance conditions: the solution must eliminate `copy.deepcopy()` entirely, remove function call overhead from the hot path, avoid any list allocations inside loops, preserve exact numerical results, and handle boundary cells correctly (2, 3, or 4 neighbors).

## 3. Understand Memory Allocation Overhead

The original code allocated memory on every iteration through `copy.deepcopy()`. For a 500×500 grid, this means copying 250,000 float objects repeatedly. I researched memory-efficient patterns for simulation loops.
[https://realpython.com/python-memory-management/](https://realpython.com/python-memory-management/)

## 4. Implement Double Buffer Pattern

I introduced a pre-allocated second buffer grid during initialization. Each iteration reads from one grid and writes to the other, then swaps references. This eliminates all memory allocation during the simulation loop.
[https://gameprogrammingpatterns.com/double-buffer.html](https://gameprogrammingpatterns.com/double-buffer.html)

## 5. Eliminate Function Call Overhead

The original code called `get_neighbors()` for every cell — 25 million calls for a 500×500 grid with 100 iterations. Each call creates a stack frame and performs bounds checking. I inlined the neighbor calculation directly into the main loop.


## 6. Separate Cell Types to Eliminate Redundant Bounds Checks

I split the computation into separate loops for interior cells, edge cells, and corner cells. Interior cells always have 4 neighbors, so I can avoid bounds checking entirely. Edge cells have 3 neighbors, and corners have 2.

This approach eliminates redundant bounds checks for the majority of cells (interior) while ensuring correct neighbor counts for boundary cells.

## 7. Direct Summation Instead of List Building

Instead of building a list of neighbors and then summing it, I directly sum the valid neighbor values. This removes list allocation from the hot path entirely.

Understanding why avoiding temporary objects in hot loops matters: Python Performance: Avoiding Temporary Objects

## 8. Preserve Exact Neighbor Order and Mathematical Formula

I maintained the exact same neighbor order (up, down, left, right) as the original implementation, which corresponds to the directions list `[(-1, 0), (1, 0), (0, -1), (0, 1)]`. The diffusion formula `(current + average_of_neighbors) / 2.0` is preserved exactly to ensure identical numerical results.

## 9. Handle Boundary Conditions Correctly

The logic correctly calculates the denominator for boundary cells (dividing by 2, 3, or 4 neighbors depending on position), ensuring the average is mathematically correct. Corners have 2 neighbors, edges have 3, and interior cells have 4.

## 10. Result: Measurable Performance Gains

The solution eliminates all major constant-factor overheads:
- No `copy.deepcopy()` — uses double buffer pattern with reference swapping
- No function call overhead — neighbor calculation is fully inlined
- No list allocations in hot path — direct summation of neighbor values
- Reduced bounds checking — separate loops for interior/edge/corner cells
- Maintains identical numerical results — same neighbor order and formula

The code should now handle 500×500 grids in under 2 seconds, achieving the required 10x-50x speedup while preserving exact numerical precision.
