# Deconfliction Module Implementation Trajectory

1. Define Core Structures
   I started by defining the fundamental data structures: `Vector3` for 3D coordinates/velocity, and `Drone` containing ID, Position, Velocity, and Battery. This provided a type-safe foundation for the physics calculations.

2. Implement Projection and Collision Logic
   I implemented the `ResolveConflicts` function. The core logic projects the drone's position 10 seconds into the future (`P_future = P + V*10`).
   Collision detection uses a quadratic minimization approach to calculate the minimum Euclidean distance between two flight paths over the [0, 10] second interval. If the minimum distance is < 5.0m, a conflict is flagged.

3. Priority Resolution Strategy
   I implemented the pairwise priority logic. For every conflicting pair, the drone with the lower battery percentage is granted right-of-way (Action: `MAINTAIN`). The higher battery drone must adjust.
   Ties in battery are broken deterministically by ID to ensure stable results.

4. Spatial Adjustment (Z-Axis)
   The `ADJUST_ALTITUDE` action shifts the drone's Z position by +/- 2.0 meters.
   The direction is chosen by simulating both potential moves (+2m and -2m) and calculating the distance to the priority drone. The move that results in the larger separation is selected.

5. Optimization for Performance (20ms Constraint)
   To meet the strict 20ms processing window for 100 drones, I utilized Go's concurrency primitives.
   The collision detection phase (O(N^2) complexity) was parallelized using `sync.WaitGroup` and 4 worker goroutines. This ensures we leverage multi-core CPUs efficiently.
   Benchmark tests confirmed execution times well under 1ms, safely satisfying the requirement.

6. Verification and Testing
   I created a suite of tests in `tests/deconfliction_test.go`:
   - `TestConvergence`: Verifies the correct priority arbitration and spatial separation for a known collision scenario.
   - `TestStressPerformance`: Validates the performance constraint with 100 randomized drones.
   - `TestCascading`: Checks behavior with multiple overlapping conflicts.
