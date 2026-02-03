# Trajectory (Thinking Process for Refactoring)

1. I audited the problem. The task required a Hamiltonian path/cycle solver with a graph (directed/undirected, weights), backtracking, pruning, timing instrumentation, and a delivery-optimization layer. The baseline was empty. The solution had to return structured success/failure, not null or exceptions, and support path verification.

2. I defined a performance and correctness contract. The graph would use an adjacency matrix for O(1) edge checks and an adjacency list for efficient neighbor traversal [1]. Filtering and ordering would stay in the algorithm: degree-based pruning and Warnsdorff-style neighbor ordering [4][5]. Results would be dataclasses with `success` and `message`; no path meant an explicit failure object.

3. I decomposed the work into modules. A `graph` module holds the data structure and validation. A `solver` module implements path-finding, cycle-finding, all-paths enumeration, and min-cost search. A `delivery` module maps locations and costs to itineraries. A `demo` module exercises the main features. Each module has a single responsibility.

4. I implemented the graph. Vertices are 0..V−1 internally; the application layer uses `Location` with string ids. The graph supports directed and undirected edges, optional weights, and per-edge directed override. Invalid vertices and non-positive weights raise `GraphValidationError` with clear messages.

5. I built the backtracking core. We extend the path vertex-by-vertex and backtrack when stuck [1][2]. Degree-based pruning: if any unvisited vertex (except the last) has zero connections to other unvisited vertices, we prune [1][3]. The last vertex is special—when only one remains, it has no “other” unvisited neighbors, so we exclude it from that check (`final_ok`) to avoid over-pruning.

6. I added Warnsdorff-style neighbor ordering. When choosing the next vertex, we explore neighbors with *fewer* remaining connections to unvisited first [4][5]. This reduces branching and surfaces dead ends earlier than fixed order.

7. I restricted degree pruning to undirected graphs. For directed graphs, the last vertex in a cycle often has no out-edges to unvisited vertices. We were pruning it and failing. The fix: run degree pruning only when `not g.directed`.

8. I fixed min-cost to try all starts. We must loop over all starting vertices, track the best cost and path, and return the global minimum. I had initially stopped after the first valid path.

9. I wired the delivery layer. `Location` stores id, name, and address. Travel costs are configurable and asymmetric; missing links mean no route. `plan_delivery` builds the graph from locations and costs, calls min-cost pathfinding, and maps results to itineraries with per-stop details and incremental travel costs.

10. The solution uses backtracking plus degree pruning and Warnsdorff ordering, passes all tests, meets timing on sparse graphs, and produces verifiable paths via `verify_path`. It is built around deterministic, O(V) auxiliary memory, and clear success/failure signals.

---

**References**

[1] https://www.geeksforgeeks.org/hamiltonian-path/  
[2] https://www.geeksforgeeks.org/backtracking-algorithms/  
[3] https://diestel-graph-theory.com/  
[4] https://www.geeksforgeeks.org/the-knights-tour-problem-backtracking-1/  

