# I5FJUO - hamiltonian-path-problem

**Category:** sft

## Overview
- Task ID: I5FJUO
- Title: hamiltonian-path-problem
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: i5fjuo-hamiltonian-path-problem

## Requirements
- The solution must implement a graph data structure supporting both directed and undirected edges with optional floating-point weights. It must provide O(1) edge existence checking via an adjacency matrix and efficient neighbor traversal via an adjacency list. The graph must allow dynamic edge addition and handle both symmetric connections (two-way roads) and asymmetric connections (one-way streets) where travel cost from A to B may differ from B to A. All inputs must be validated with meaningful errors for invalid vertex references or non-positive edge weights.
- The algorithm must find and return a valid Hamiltonian path — an ordered sequence visiting all V vertices exactly once via connected edges — using backtracking. It must support an optional starting vertex parameter to constrain where the path begins. When no starting vertex is specified, the algorithm must try all possible starting points; when specified, it must only return paths beginning from that vertex or report failure if none exist. The algorithm must correctly handle graphs from 1 vertex up to performance limits, including edge cases such as disconnected graphs where no path is possible.
- The solution must provide functionality to enumerate all valid Hamiltonian paths in a graph, returning a complete, duplicate-free collection. For weighted graphs, the algorithm must identify the minimum total cost Hamiltonian path by comparing all valid paths and return both the optimal path and its calculated total cost. Cost calculation must accurately sum floating-point edge weights along the path without significant rounding errors.
- The backtracking algorithm must implement degree-based pruning that immediately abandons branches where any unvisited vertex has zero remaining connections to other unvisited vertices, unless it is the final vertex. A neighbor ordering heuristic must prioritize exploring vertices with fewer available connections first (Warnsdorff-style), dynamically recalculated as the path grows, to reduce the branching factor and find dead ends earlier. These optimizations must demonstrably improve average-case performance compared to naive sequential vertex ordering.
- For graphs with 10 or fewer vertices, the algorithm must return a result within 100 milliseconds; for 11–15 vertices, within 5 seconds, measured on standard consumer hardware. Every path-finding operation must measure and report its execution time in milliseconds using high-resolution system clocks, capturing only algorithmic computation time. Auxiliary memory usage, excluding input graph and output paths, must remain O(V) linear with vertex count, avoiding graph copies at each recursion level.
- The real-world application layer must implement a Location model storing a unique identifier, human-readable name, and address string, cleanly separating the business domain (delivery stops) from the algorithmic domain (graph vertices). Travel costs between location pairs must be configurable with support for asymmetric values, where missing connections indicate no direct route exists rather than zero cost. The system must translate algorithm results into structured delivery itineraries, including stop numbers, location details, and incremental travel costs.
- When no valid Hamiltonian path exists, the system must return a distinguishable failure result with a human-readable explanation rather than throwing exceptions, returning null, or returning an empty path. Successful results must include a success indicator, total cost, stop count, ordered location IDs, and a detailed per-stop itinerary with names, addresses, and travel costs from previous stops. The implementation must support independent verification that any returned path is valid, ensuring correct length, all vertices present exactly once, and consecutive vertices share edges.
- The solution must include a runnable demonstration exercising all major features: basic path finding on simple graphs, delivery optimization with named locations and travel times, minimum-cost route finding, and disconnected graph handling. The demonstration must produce clear console output showing inputs, algorithm execution with timing, and formatted results, serving as both validation and usage documentation. All demonstration scenarios must execute successfully without errors and display correct, verifiable results.

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
