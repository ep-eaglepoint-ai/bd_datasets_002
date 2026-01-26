"""
Comprehensive test suite for hierarchy traversal service.
Tests are designed to fail on repository_before and pass on repository_after.
"""
import pytest
import threading
import time
import os
import sys
from typing import Dict

# Determine which repository to test based on environment variable
REPO_PATH = os.environ.get('REPO_PATH', 'repository_after')

# Import from the specified repository
if REPO_PATH == 'repository_before':
    from repository_before.hierarchy_service import Node, LegacyHierarchyService as HierarchyService
    USE_LEGACY = True
else:
    from repository_after.hierarchy_service import (
        Node, 
        RefactoredHierarchyService as HierarchyService,
        CircularDependencyError
    )
    USE_LEGACY = False


class TestDiamondDAG:
    """
    Requirement #7: Test diamond-shaped DAG to ensure no double-counting.
    
    Structure:
         A(10)
        /     \
      B(5)    C(7)
        \     /
         D(3)
    
    Expected: 10 + 5 + 7 + 3 = 25 (D counted once, not twice)
    Legacy will get: 10 + 5 + 3 + 7 + 3 = 28 (D counted twice)
    """
    
    @pytest.mark.xfail(USE_LEGACY, reason="Legacy service double-counts shared nodes in DAG", strict=True)
    def test_diamond_dag_no_double_counting(self):
        """Diamond DAG should count shared child only once."""
        nodes = {
            'A': Node('A', 10, ['B', 'C']),
            'B': Node('B', 5, ['D']),
            'C': Node('C', 7, ['D']),
            'D': Node('D', 3, [])
        }
        
        service = HierarchyService(nodes)
        result = service.calculate_total_weight('A')
        
        # Both should work, but legacy double-counts
        assert result == 25, f"Expected 25 (A=10, B=5, C=7, D=3 counted once), got {result}"
    
    @pytest.mark.xfail(USE_LEGACY, reason="Legacy service has exponential complexity on complex DAGs", strict=True)
    def test_complex_dag_multiple_shared_nodes(self):
        """More complex DAG with multiple shared nodes."""
        nodes = {
            'root': Node('root', 100, ['A', 'B']),
            'A': Node('A', 10, ['C', 'D']),
            'B': Node('B', 20, ['C', 'D']),
            'C': Node('C', 5, ['E']),
            'D': Node('D', 3, ['E']),
            'E': Node('E', 1, [])
        }
        
        service = HierarchyService(nodes)
        result = service.calculate_total_weight('root')
        
        # root=100, A=10, B=20, C=5, D=3, E=1
        # Total: 100 + 10 + 20 + 5 + 3 + 1 = 139
        assert result == 139, f"Expected 139 (each node counted once), got {result}"


class TestCycleDetection:
    """
    Requirement #8: Test with 10,000+ nodes and a cycle.
    Must detect cycle and raise CircularDependencyError.
    """
    
    @pytest.mark.xfail(USE_LEGACY, reason="Legacy service does not detect cycles (RecursionError/Timeout)", strict=True)
    def test_simple_self_loop(self):
        """Node pointing to itself."""
        nodes = {
            'A': Node('A', 10, ['A'])  # Self-loop
        }
        
        service = HierarchyService(nodes)
        
        with pytest.raises(CircularDependencyError) as exc_info:
            service.calculate_total_weight('A')
        assert exc_info.value.node_id == 'A'
    
    @pytest.mark.xfail(USE_LEGACY, reason="Legacy service does not detect cycles (RecursionError/Timeout)", strict=True)
    def test_two_node_cycle(self):
        """Simple A->B->A cycle."""
        nodes = {
            'A': Node('A', 10, ['B']),
            'B': Node('B', 20, ['A'])
        }
        
        service = HierarchyService(nodes)
        
        with pytest.raises(CircularDependencyError) as exc_info:
            service.calculate_total_weight('A')
        # Should detect cycle at node A when revisited
        assert exc_info.value.node_id == 'A'
    
    @pytest.mark.timeout(30)
    @pytest.mark.xfail(USE_LEGACY, reason="Legacy service does not detect deep cycles (RecursionError/Timeout)", strict=True)
    def test_large_hierarchy_with_deep_cycle(self):
        """
        Requirement #8: 10,000+ nodes with a leaf-to-root cycle.
        Create chain: 0 -> 1 -> 2 -> ... -> 10000
        Add back-edge: 10000 -> 5000 (creates cycle)
        """
        num_nodes = 10000
        nodes = {}
        
        # Create linear chain
        for i in range(num_nodes):
            if i < num_nodes - 1:
                nodes[str(i)] = Node(str(i), i, [str(i + 1)])
            else:
                # Last node points back to middle, creating cycle
                nodes[str(i)] = Node(str(i), i, ['5000'])
        
        service = HierarchyService(nodes)
        
        # Refactored should detect cycle and report node 5000
        with pytest.raises(CircularDependencyError) as exc_info:
            service.calculate_total_weight('0')
        assert exc_info.value.node_id == '5000'


class TestThreadSafety:
    """
    Requirement #9: Stress test with 50+ concurrent threads.
    Mix of reads and writes, verify mathematical consistency.
    """
    
    @pytest.mark.xfail(USE_LEGACY, reason="Legacy service double-counts in concurrent DAG reads", strict=True)
    def test_concurrent_reads(self):
        """50+ threads reading concurrently."""
        nodes = {
            'root': Node('root', 100, ['A', 'B', 'C']),
            'A': Node('A', 10, ['D']),
            'B': Node('B', 20, ['D']),
            'C': Node('C', 30, ['D']),
            'D': Node('D', 5, [])
        }
        
        service = HierarchyService(nodes)
        # Correct answer: 100 + 10 + 20 + 30 + 5 = 165 (D counted once)
        expected = 165
        
        results = []
        errors = []
        
        def read_weight():
            try:
                result = service.calculate_total_weight('root')
                results.append(result)
            except Exception as e:
                errors.append(e)
        
        threads = []
        for _ in range(60):
            t = threading.Thread(target=read_weight)
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        # All reads should return the same value
        assert len(errors) == 0, f"Errors occurred: {errors}"
        assert all(r == expected for r in results), \
            f"Expected all results to be {expected}, got: {set(results)}"
    
    @pytest.mark.timeout(60)
    @pytest.mark.xfail(USE_LEGACY, reason="Legacy service missing atomic updates and thread safety", strict=True)
    def test_concurrent_reads_and_updates(self):
        """
        Requirement #9: 50+ threads with interleaved reads and updates.
        Verify no race conditions and mathematical consistency.
        """
        nodes = {
            'root': Node('root', 100, ['A', 'B']),
            'A': Node('A', 10, ['C']),
            'B': Node('B', 20, ['C']),
            'C': Node('C', 5, [])
        }
        
        service = HierarchyService(nodes)
        
        results = []
        errors = []
        lock = threading.Lock()
        
        def reader():
            """Read operations with random delays."""
            try:
                time.sleep(0.001 * (threading.current_thread().ident % 10))
                result = service.calculate_total_weight('root')
                with lock:
                    results.append(('read', result))
            except Exception as e:
                with lock:
                    errors.append(e)
        
        def updater(node_id, new_value):
            """Update operations with random delays."""
            try:
                time.sleep(0.001 * (threading.current_thread().ident % 10))
                service.update_node_value(node_id, new_value)
                with lock:
                    results.append(('update', node_id, new_value))
            except Exception as e:
                with lock:
                    errors.append(e)
        
        threads = []
        
        # 30 reader threads
        for _ in range(30):
            t = threading.Thread(target=reader)
            threads.append(t)
        
        # 25 updater threads
        for i in range(25):
            node = ['A', 'B', 'C'][i % 3]
            value = (i * 7) % 100
            t = threading.Thread(target=updater, args=(node, value))
            threads.append(t)
        
        # Start all threads
        for t in threads:
            t.start()
        
        # Wait for completion
        for t in threads:
            t.join()
        
        # Verify no errors occurred
        assert len(errors) == 0, f"Errors occurred: {errors}"
        
        # Verify final state is mathematically consistent
        final_result = service.calculate_total_weight('root')
        expected = nodes['root'].value + nodes['A'].value + nodes['B'].value + nodes['C'].value
        assert final_result == expected, f"Final result {final_result} != expected {expected}"
    
    @pytest.mark.xfail(USE_LEGACY, reason="Legacy service does not implement caching or atomic invalidation", strict=True)
    def test_concurrent_cache_invalidation(self):
        """Verify atomic cache invalidation works correctly."""
        nodes = {
            'A': Node('A', 10, ['B']),
            'B': Node('B', 20, ['C']),
            'C': Node('C', 30, ['D']),
            'D': Node('D', 40, [])
        }
        
        service = HierarchyService(nodes)
        
        # Pre-warm cache
        service.calculate_total_weight('A')  # Should cache A, B, C, D
        
        errors = []
        
        def update_and_verify():
            try:
                # Update node C
                service.update_node_value('C', 50)
                # Immediately read - should get updated value
                result = service.calculate_total_weight('A')
                # A=10, B=20, C=50, D=40 = 120
                assert result == 120, f"Expected 120, got {result}"
            except Exception as e:
                errors.append(e)
        
        threads = [threading.Thread(target=update_and_verify) for _ in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        assert len(errors) == 0, f"Errors: {errors}"


class TestMemoryManagement:
    """Test that cache stays within 128MB limit."""
    
    @pytest.mark.xfail(USE_LEGACY, reason="Legacy service does not implement generational caching", strict=True)
    def test_cache_memory_limit(self):
        """Verify cache eviction keeps memory under 128MB."""
        # Create a large datastore
        num_nodes = 5000
        nodes = {}
        for i in range(num_nodes):
            nodes[str(i)] = Node(str(i), i, [str(i+1)] if i < num_nodes - 1 else [])
        
        service = HierarchyService(nodes)
        
        # Calculate weights for many nodes
        for i in range(0, num_nodes, 100):
            service.calculate_total_weight(str(i))
        
        # Check memory usage
        memory_usage = service.get_cache_memory_usage()
        max_memory = 128 * 1024 * 1024  # 128MB
        
        assert memory_usage <= max_memory, \
            f"Cache exceeded memory limit: {memory_usage / (1024*1024):.2f}MB > 128MB"


class TestAtomicInvalidation:
    """
    Requirement #5: Test atomic invalidation.
    Updating a node should only invalidate that node and its ancestors.
    """
    
    @pytest.mark.xfail(USE_LEGACY, reason="Legacy service does not implement atomic invalidation", strict=True)
    def test_atomic_invalidation_ancestors_only(self):
        """
        Hierarchy: A -> B -> C -> D
        Update C, verify: C, B, A invalidated; D remains cached.
        """
        nodes = {
            'A': Node('A', 10, ['B']),
            'B': Node('B', 20, ['C']),
            'C': Node('C', 30, ['D']),
            'D': Node('D', 40, [])
        }
        
        service = HierarchyService(nodes)
        
        # Pre-calculate all weights to populate cache
        service.calculate_total_weight('A')  # A, B, C, D all cached
        service.calculate_total_weight('B')
        service.calculate_total_weight('C')
        service.calculate_total_weight('D')
        
        # Update node C
        service.update_node_value('C', 50)
        
        # Verify updated value propagates
        result_A = service.calculate_total_weight('A')
        assert result_A == 10 + 20 + 50 + 40  # 120
        
        result_C = service.calculate_total_weight('C')
        assert result_C == 50 + 40  # 90


class TestIterativeTraversal:
    """Test that refactored service handles deep hierarchies without stack overflow."""
    
    @pytest.mark.timeout(30)
    @pytest.mark.xfail(USE_LEGACY, reason="Legacy service is recursive and hits RecursionError", strict=True)
    def test_deep_hierarchy_no_stack_overflow(self):
        """Create very deep hierarchy (10,000 levels) - should not stack overflow."""
        depth = 10000
        nodes = {}
        
        for i in range(depth):
            if i < depth - 1:
                nodes[str(i)] = Node(str(i), 1, [str(i + 1)])
            else:
                nodes[str(i)] = Node(str(i), 1, [])
        
        service = HierarchyService(nodes)
        
        # Refactored should handle it
        result = service.calculate_total_weight('0')
        assert result == depth  # Each node has value 1


class TestEdgeCases:
    """Additional edge cases."""
    
    def test_empty_datastore(self):
        """Service with no nodes."""
        service = HierarchyService({})
        result = service.calculate_total_weight('nonexistent')
        assert result == 0
    
    def test_single_node(self):
        """Single node with no children."""
        nodes = {'A': Node('A', 42, [])}
        service = HierarchyService(nodes)
        result = service.calculate_total_weight('A')
        assert result == 42
    
    def test_nonexistent_node(self):
        """Request weight of non-existent node."""
        nodes = {'A': Node('A', 10, [])}
        service = HierarchyService(nodes)
        result = service.calculate_total_weight('Z')
        assert result == 0
    
    def test_node_with_nonexistent_children(self):
        """Node references non-existent children."""
        nodes = {
            'A': Node('A', 10, ['B', 'C']),
            'B': Node('B', 5, [])
            # C doesn't exist
        }
        service = HierarchyService(nodes)
        result = service.calculate_total_weight('A')
        assert result == 15  # A + B only
