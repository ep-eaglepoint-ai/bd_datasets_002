
import heapq
from collections import defaultdict, deque

class CircularDependencyError(Exception):
    def __init__(self, cycle_path):
        self.cycle_path = cycle_path
        super().__init__(f"Circular dependency detected: {' -> '.join(cycle_path)}")

def resolve_execution_order(dependency_graph: dict) -> list:
    """
    Resolves the execution order of a dependency graph with strict determinism.
    
    Args:
        dependency_graph: Dict mapping target -> list of dependencies.
        
    Returns:
        List of targets in execution order.
        
    Raises:
        CircularDependencyError: If a cycle is detected.
    """
    # 1. Build the graph (dependency -> dependents) and calculate in-degrees
    adj_list = defaultdict(list)
    in_degree = defaultdict(int)
    all_nodes = set(dependency_graph.keys())
    
    # Initialize in-degree for all known nodes from keys
    for node in all_nodes:
        in_degree[node] = 0
        
    # Process dependencies
    # input: target -> [deps] which means deps -> target
    for target, deps in dependency_graph.items():
        for dep in deps:
            all_nodes.add(dep)
            adj_list[dep].append(target)
            in_degree[target] += 1
            if dep not in in_degree:
                in_degree[dep] = 0

    # 2. Initialize Min-Heap with nodes having 0 in-degree
    # Using a heap ensures we always pick the lexicographically smallest node
    # among those that are ready to execute.
    ready_queue = [node for node in all_nodes if in_degree[node] == 0]
    heapq.heapify(ready_queue)
    
    execution_order = []
    
    # 3. Process the queue
    while ready_queue:
        node = heapq.heappop(ready_queue)
        execution_order.append(node)
        
        for neighbor in adj_list[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                heapq.heappush(ready_queue, neighbor)
                
    # 4. Cycle Detection
    if len(execution_order) < len(all_nodes):
        # A cycle exists. Find it to report the error.
        # We only care about nodes that still have in_degree > 0
        remaining_nodes = {n for n, d in in_degree.items() if d > 0}
        
        # Build a subgraph of remaining nodes to search for the cycle
        remaining_adj = defaultdict(list)
        for u, neighbors in adj_list.items():
            if u in remaining_nodes:
                for v in neighbors:
                    if v in remaining_nodes:
                        remaining_adj[u].append(v)
        
        # Find a cycle using DFS
        # We need to sort nodes to ensure deterministic error reporting if needed,
        # though identifying *any* cycle is usually sufficient. 
        # But for stability, let's just iterate sorted.
        visited = set()
        recursion_stack = []
        path_set = set() # For O(1) lookup in recursion stack
        
        def find_cycle(u):
            visited.add(u)
            recursion_stack.append(u)
            path_set.add(u)
            
            # Sort neighbors for deterministic cycle finding
            for v in sorted(remaining_adj[u]):
                if v not in visited:
                    if find_cycle(v):
                        return True
                elif v in path_set:
                    # Cycle detected!
                    # The cycle is from v to ... to u and back to v
                    # slice the stack
                    try:
                        idx = recursion_stack.index(v)
                        cycle = recursion_stack[idx:] + [v]
                        # The cycle found is in the "enables" graph (prereq -> dependent).
                        # The user expectation is likely the "depends on" chain (dependent -> prereq).
                        # So we reverse the cycle path.
                        raise CircularDependencyError(cycle[::-1])
                    except ValueError:
                        # Should not happen if logic is correct
                        pass
            
            path_set.remove(u)
            recursion_stack.pop()
            return False

        for node in sorted(remaining_nodes):
            if node not in visited:
                try:
                    find_cycle(node)
                except CircularDependencyError:
                    raise

        # Fallback if logic misses (should not happen given in_degree checks)
        raise CircularDependencyError(["Unknown cycle"])

    return execution_order
