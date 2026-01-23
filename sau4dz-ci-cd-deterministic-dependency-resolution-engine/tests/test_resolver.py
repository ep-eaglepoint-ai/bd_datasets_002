
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

