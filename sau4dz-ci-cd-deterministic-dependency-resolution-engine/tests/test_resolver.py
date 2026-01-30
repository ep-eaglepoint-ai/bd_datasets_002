
import pytest
import time
import random
import string
from repository_after.resolver import resolve_execution_order, CircularDependencyError

class TestDependencyResolver:
    
    def test_simple_linear_chain(self):
        # A -> B -> C (A depends on B, B depends on C)
        # Execution order: C, B, A
        graph = {
            'A': ['B'],
            'B': ['C']
        }
        assert resolve_execution_order(graph) == ['C', 'B', 'A']

    def test_diamond_dependency(self):
        # A depends on B and C
        # B depends on D
        # C depends on D
        # Execution: D -> B, C (alphabetical) -> A
        graph = {
            'A': ['B', 'C'],
            'B': ['D'],
            'C': ['D']
        }
        # D is 0-degree. Pop D.
        # B and C become 0-degree. B comes before C alphabetically.
        # Pop B.
        # Pop C.
        # A becomes 0-degree.
        assert resolve_execution_order(graph) == ['D', 'B', 'C', 'A']

    def test_disconnected_subgraphs(self):
        # A -> B
        # C -> D
        # Deps: B->A (Wait, A depends on B means B runs first)
        # Input: {'A': ['B']} -> B is dep, A is target. Edge B->A.
        # Input: {'C': ['D']} -> D is dep, C is target. Edge D->C.
        # Nodes: A, B, C, D.
        # 0-degree: B, D.
        # B comes before D.
        # Pop B. Enables A? No wait.
        # B->A. In-degree of A is 1.
        # D->C. In-degree of C is 1.
        # Pop B. A still has dep? No, in-degree of A becomes 0.
        # Queue: D, A. (A is now 0-degree).
        # A comes before D.
        # Pop A.
        # Queue: D.
        # Pop D. Enables C.
        # Queue: C.
        # Order: B, A, D, C
        
        # Let's trace carefully:
        # B in-degree=0, D in-degree=0.
        # Heap: [B, D]
        # Pop B. Result: [B]. Neighbors of B: [A]. A in-degree becomes 0.
        # Push A to heap. Heap: [A, D] (sorted).
        # Pop A. Result: [B, A]. Neighbors of A: [].
        # Heap: [D].
        # Pop D. Result: [B, A, D]. Neighbors of D: [C]. C in-degree becomes 0.
        # Push C to heap. Heap: [C].
        # Pop C. Result: [B, A, D, C].
        
        graph = {
            'A': ['B'],
            'C': ['D']
        }
        assert resolve_execution_order(graph) == ['B', 'A', 'D', 'C']

    def test_complex_determinism(self):
        # Multiple nodes becoming available at the same time
        graph = {
            'Z': ['A', 'M'],
            'Y': ['A', 'N'],
        }
        # Edges: A->Z, M->Z, A->Y, N->Y
        # Nodes: A, M, N (in-degree 0). Z, Y wait.
        # Heap: [A, M, N]
        # Pop A. Neighbors: Z, Y. Z(1), Y(1).
        # Heap: [M, N]
        # Pop M. Neighbors: Z. Z(0). Push Z.
        # Heap: [N, Z]
        # Pop N. Neighbors: Y. Y(0). Push Y.
        # Heap: [Y, Z]
        # Pop Y.
        # Pop Z.
        # Order: A, M, N, Y, Z
        assert resolve_execution_order(graph) == ['A', 'M', 'N', 'Y', 'Z']

    def test_cycle_detection_simple(self):
        # A -> B -> A
        graph = {
            'A': ['B'],
            'B': ['A']
        }
        with pytest.raises(CircularDependencyError) as excinfo:
            resolve_execution_order(graph)
        
        msg = str(excinfo.value)
        assert "Circular dependency detected" in msg
        # Cycle path could be A->B->A or B->A->B depending on traversal
        assert "A -> B -> A" in msg or "B -> A -> B" in msg

    def test_cycle_detection_self_loop(self):
        graph = {
            'A': ['A']
        }
        with pytest.raises(CircularDependencyError) as excinfo:
            resolve_execution_order(graph)
        assert "A -> A" in str(excinfo.value)

    def test_cycle_path_reporting(self):
        # A -> B -> C -> A
        graph = {
            'A': ['B'],
            'B': ['C'],
            'C': ['A']
        }
        with pytest.raises(CircularDependencyError) as excinfo:
            resolve_execution_order(graph)
        msg = str(excinfo.value)
        # Normalize to check sequence
        assert "A -> B -> C -> A" in msg or \
               "B -> C -> A -> B" in msg or \
               "C -> A -> B -> C" in msg

    def test_implicit_nodes(self):
        # Deps specified for keys, but values might introduce new nodes
        graph = {
            'A': ['B', 'C']
        }
        # Nodes: A, B, C.
        # B, C are 0-degree.
        result = resolve_execution_order(graph)
        assert len(result) == 3
        # B and C must appear before A
        assert result.index('B') < result.index('A')
        assert result.index('C') < result.index('A')
        # Determinism: B before C
        assert result == ['B', 'C', 'A']

    def test_performance_large_chain(self):
        # 10,000 nodes linear chain: 0 -> 1 -> ... -> 9999
        # Input format: { "i+1": ["i"] }
        n = 10000
        graph = {str(i+1): [str(i)] for i in range(n-1)}
        
        start_time = time.time()
        result = resolve_execution_order(graph)
        duration = time.time() - start_time
        
        # We need N total nodes.
        # 0 is a dep, but never a key (target).
        # 0..9999 are nodes.
        # '1' depends on '0'. ... '9999' depends on '9998'.
        # Total nodes: n.
        
        assert len(result) == n
        assert result[0] == '0'
        assert result[-1] == str(n-1)
        # Should be fast
        assert duration < 2.0

    def test_determinism_input_shuffling(self):
        # The result purely depends on graph structure + alphabetical tie breaking
        # NOT on the input dict iteration order.
        items = [
            ('A', ['C']),
            ('B', ['C']),
            ('D', ['A', 'B'])
        ]
        # C -> A, C -> B, A -> D, B -> D.
        # Order: C, A, B, D.
        
        # Function to run with shuffled input
        def run_shuffled():
            shuffled = items[:]
            random.shuffle(shuffled)
            return resolve_execution_order(dict(shuffled))
            
        expected = ['C', 'A', 'B', 'D']
        for _ in range(10):
            assert run_shuffled() == expected

    # ===== Additional Coverage Tests =====

    def test_empty_graph(self):
        # Empty dictionary should return empty list
        graph = {}
        assert resolve_execution_order(graph) == []

    def test_single_node_no_deps(self):
        # Single node with no dependencies
        graph = {'A': []}
        assert resolve_execution_order(graph) == ['A']

    def test_multiple_independent_nodes(self):
        # Multiple nodes with no dependencies - alphabetical order
        graph = {
            'Z': [],
            'A': [],
            'M': [],
            'B': []
        }
        assert resolve_execution_order(graph) == ['A', 'B', 'M', 'Z']

    def test_cycle_in_disconnected_subgraph(self):
        # One subgraph has a cycle, other is valid
        # Valid: A -> B
        # Cycle: X -> Y -> Z -> X
        graph = {
            'A': ['B'],
            'X': ['Y'],
            'Y': ['Z'],
            'Z': ['X']
        }
        with pytest.raises(CircularDependencyError) as excinfo:
            resolve_execution_order(graph)
        
        msg = str(excinfo.value)
        assert "Circular dependency detected" in msg
        # Should detect the cycle in X->Y->Z->X
        assert ('X' in msg and 'Y' in msg and 'Z' in msg)

    def test_wide_deep_tree(self):
        # A wide and deep tree to stress test recursion/iteration
        # Create a tree: root depends on level1_0..9, each level1 depends on level2_0..9, etc.
        graph = {}
        
        # 5 levels, 10 children per node = 10^4 edges (manageable)
        # Root
        graph['root'] = [f'L1_{i}' for i in range(10)]
        
        # Level 1 -> Level 2
        for i in range(10):
            graph[f'L1_{i}'] = [f'L2_{i}_{j}' for j in range(10)]
        
        # Level 2 -> Level 3
        for i in range(10):
            for j in range(10):
                graph[f'L2_{i}_{j}'] = [f'L3_{i}_{j}_{k}' for k in range(10)]
        
        # Execute
        result = resolve_execution_order(graph)
        
        # Should have root + 10 L1 + 100 L2 + 1000 L3 = 1111 nodes
        assert len(result) == 1111
        
        # Root should be last
        assert result[-1] == 'root'
        
        # All L3 nodes should come before their parent L2 nodes
        # Check a few specific parent-child relationships
        for i in range(10):
            for j in range(10):
                l2_node = f'L2_{i}_{j}'
                l2_index = result.index(l2_node)
                # All children of this L2 node should come before it
                for k in range(10):
                    l3_node = f'L3_{i}_{j}_{k}'
                    l3_index = result.index(l3_node)
                    assert l3_index < l2_index, f"{l3_node} should come before {l2_node}"
        
        # Similarly, all L2 should come before their L1 parents
        for i in range(10):
            l1_node = f'L1_{i}'
            l1_index = result.index(l1_node)
            for j in range(10):
                l2_node = f'L2_{i}_{j}'
                l2_index = result.index(l2_node)
                assert l2_index < l1_index, f"{l2_node} should come before {l1_node}"

    def test_large_scale_alphabetical_determinism(self):
        # 500 nodes all at the same level (no dependencies)
        # Should be sorted alphabetically
        n = 500
        nodes = [f'node_{i:04d}' for i in range(n)]
        graph = {node: [] for node in nodes}
        
        result = resolve_execution_order(graph)
        
        # Should be sorted
        assert result == sorted(nodes)

    def test_multiple_independent_cycles(self):
        # Two separate cycles in the graph
        # Cycle 1: A -> B -> A
        # Cycle 2: X -> Y -> X
        graph = {
            'A': ['B'],
            'B': ['A'],
            'X': ['Y'],
            'Y': ['X']
        }
        
        with pytest.raises(CircularDependencyError) as excinfo:
            resolve_execution_order(graph)
        
        # Should detect at least one cycle
        msg = str(excinfo.value)
        assert "Circular dependency detected" in msg

    def test_duplicate_dependencies(self):
        # Node with duplicate dependencies - should handle gracefully
        graph = {
            'A': ['B', 'B', 'B']
        }
        result = resolve_execution_order(graph)
        # Should still work correctly
        assert result == ['B', 'A']

    def test_mixed_disconnected_and_connected(self):
        # Mix of connected and disconnected components with various patterns
        graph = {
            # Chain: A -> B -> C
            'A': ['B'],
            'B': ['C'],
            # Diamond: D depends on E and F, both depend on G
            'D': ['E', 'F'],
            'E': ['G'],
            'F': ['G'],
            # Independent nodes
            'X': [],
            'Y': [],
            # Another chain: Z -> W
            'Z': ['W']
        }
        
        result = resolve_execution_order(graph)
        
        # Check all nodes present (A-G, W-Z, X-Y = 11 total)
        # Keys: A, B, D, E, F, X, Y, Z (8 keys)
        # Additional values: C, G, W (3 more nodes)
        assert len(result) == 11
        assert set(result) == {'A', 'B', 'C', 'D', 'E', 'F', 'G', 'W', 'X', 'Y', 'Z'}
        
        # Check ordering constraints
        assert result.index('C') < result.index('B') < result.index('A')
        assert result.index('G') < result.index('E') < result.index('D')
        assert result.index('G') < result.index('F') < result.index('D')
        assert result.index('W') < result.index('Z')

    def test_long_cycle_path(self):
        # A cycle with many nodes in the path
        # A -> B -> C -> D -> E -> F -> G -> H -> I -> J -> A
        nodes = list(string.ascii_uppercase[:10])  # A-J
        graph = {}
        for i in range(len(nodes)):
            graph[nodes[i]] = [nodes[(i + 1) % len(nodes)]]
        
        with pytest.raises(CircularDependencyError) as excinfo:
            resolve_execution_order(graph)
        
        msg = str(excinfo.value)
        assert "Circular dependency detected" in msg
        # Should contain the cycle path
        assert "A" in msg

    def test_node_with_self_and_other_deps(self):
        # Node depends on itself AND other nodes
        graph = {
            'A': ['A', 'B']
        }
        
        with pytest.raises(CircularDependencyError) as excinfo:
            resolve_execution_order(graph)
        
        assert "A -> A" in str(excinfo.value)

    def test_very_wide_graph(self):
        # One node depends on 1000 others (all independent)
        deps = [f'dep_{i:04d}' for i in range(1000)]
        graph = {'root': deps}
        
        result = resolve_execution_order(graph)
        
        # All deps should come before root
        assert result[-1] == 'root'
        # Deps should be in alphabetical order
        assert result[:-1] == sorted(deps)

    def test_performance_wide_dependencies(self):
        # Performance test: node with many dependencies
        n = 5000
        deps = [f'dep_{i}' for i in range(n)]
        graph = {'root': deps}
        
        start_time = time.time()
        result = resolve_execution_order(graph)
        duration = time.time() - start_time
        
        assert len(result) == n + 1
        assert result[-1] == 'root'
        assert duration < 2.0


    def test_deep_recursion_cycle_detection(self):
        # Create a graph with a very deep cycle to test stack overflow issues
        # 0 -> 1 -> 2 ... -> N -> 0
        import sys
        
        # Increase recursion depth to ensure the test would fail if still recursive
        # but keep it reasonable for the test runtime
        n = 5000  # Default recursion limit is usually 1000
        
        # Build graph: { '0': ['1'], '1': ['2'], ..., 'N': ['0'] }
        graph = {}
        for i in range(n):
            graph[str(i)] = [str((i + 1) % n)]
            
        with pytest.raises(CircularDependencyError) as excinfo:
            resolve_execution_order(graph)
            
        assert "Circular dependency detected" in str(excinfo.value)
