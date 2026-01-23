from typing import List, Dict, Any, Optional, Set
import threading
import sys
from collections import defaultdict


class CircularDependencyError(Exception):
    """
    Raised when a cycle is detected in the hierarchy.
    Includes the node ID that closed the loop.
    """
    def __init__(self, node_id: str):
        self.node_id = node_id
        super().__init__(f"Circular dependency detected at node: {node_id}")


class Node:
    """
    Data structure representing an organizational unit.
    'id': Unique string identifier.
    'value': Integer weight of the current node.
    'children': List of node IDs representing direct reports or sub-units.
    """
    def __init__(self, node_id: str, value: int, children: List[str]):
        self.node_id = node_id
        self.value = value
        self.children = children


class GenerationalCache:
    """
    Thread-safe generational cache with memory limit enforcement.
    Supports atomic invalidation of nodes and their ancestors.
    """
    MAX_MEMORY_BYTES = 128 * 1024 * 1024  # 128MB
    
    def __init__(self):
        self._cache: Dict[str, int] = {}
        self._generation: Dict[str, int] = {}  # node_id -> generation timestamp
        self._current_generation = 0
        self._lock = threading.RLock()
        self._estimated_memory = 0
        
    def get(self, node_id: str) -> Optional[int]:
        """Retrieve cached weight for a node."""
        with self._lock:
            return self._cache.get(node_id)
    
    def set(self, node_id: str, weight: int):
        """Store weight in cache with current generation."""
        with self._lock:
            # Estimate memory: node_id (50 bytes avg) + int (28 bytes) + overhead (50 bytes)
            entry_size = len(node_id) * 2 + 128  # Conservative estimate
            
            # Evict oldest generation if needed
            while self._estimated_memory + entry_size > self.MAX_MEMORY_BYTES and self._cache:
                self._evict_oldest_generation()
            
            if node_id not in self._cache:
                self._estimated_memory += entry_size
            
            self._cache[node_id] = weight
            self._generation[node_id] = self._current_generation
            self._current_generation += 1
    
    def invalidate(self, node_id: str, parent_map: Dict[str, Set[str]]):
        """
        Atomically invalidate a node and all its ancestors.
        parent_map: Maps node_id -> set of parent node IDs
        """
        with self._lock:
            to_invalidate = set()
            queue = [node_id]
            
            # Find all ancestors using BFS
            while queue:
                current = queue.pop(0)
                if current in to_invalidate:
                    continue
                to_invalidate.add(current)
                
                # Add all parents to queue
                if current in parent_map:
                    queue.extend(parent_map[current])
            
            # Remove from cache
            for nid in to_invalidate:
                if nid in self._cache:
                    entry_size = len(nid) * 2 + 128
                    self._estimated_memory -= entry_size
                    del self._cache[nid]
                    del self._generation[nid]
    
    def _evict_oldest_generation(self):
        """Evict the oldest generation of cached entries."""
        if not self._generation:
            return
        
        oldest_gen = min(self._generation.values())
        to_remove = [nid for nid, gen in self._generation.items() if gen == oldest_gen]
        
        for nid in to_remove:
            if nid in self._cache:
                entry_size = len(nid) * 2 + 128
                self._estimated_memory -= entry_size
                del self._cache[nid]
                del self._generation[nid]
    
    def clear(self):
        """Clear all cached entries."""
        with self._lock:
            self._cache.clear()
            self._generation.clear()
            self._estimated_memory = 0
    
    def get_memory_usage(self) -> int:
        """Get estimated memory usage in bytes."""
        with self._lock:
            return self._estimated_memory


class RefactoredHierarchyService:
    """
    Production-ready iterative hierarchy traversal service.
    
    Features:
    - Iterative traversal (no recursion)
    - DAG support with memoization (no double-counting)
    - Cycle detection with CircularDependencyError
    - Generational caching with 128MB limit
    - Atomic cache invalidation
    - Thread-safe operations
    """
    
    def __init__(self, datastore: Dict[str, Node]):
        self.datastore = datastore
        self._cache = GenerationalCache()
        self._lock = threading.RLock()
        self._parent_map = self._build_parent_map()
    
    def _build_parent_map(self) -> Dict[str, Set[str]]:
        """Build reverse mapping: child_id -> set of parent_ids."""
        parent_map = defaultdict(set)
        for node_id, node in self.datastore.items():
            for child_id in node.children:
                parent_map[child_id].add(node_id)
        return dict(parent_map)
    
    def calculate_total_weight(self, node_id: str) -> int:
        """
        Calculate total weight of a node and all its descendants.
        Uses iterative DFS with DAG memoization and cycle detection.
        Thread-safe.
        """
        with self._lock:
            # Check cache first
            cached = self._cache.get(node_id)
            if cached is not None:
                return cached
            
            # Perform iterative traversal
            result = self._iterative_traversal(node_id)
            
            # Cache the result
            self._cache.set(node_id, result)
            
            return result
    
    def _iterative_traversal(self, start_node_id: str) -> int:
        """
        Iterative DFS traversal with cycle detection and DAG handling.
        Does NOT use recursion - immune to stack overflow.
        
        For DAG semantics: we find all unique reachable nodes and sum their weights.
        Each node's weight is counted exactly once, regardless of how many paths lead to it.
        """
        node = self.datastore.get(start_node_id)
        if not node:
            return 0
        
        # Find all unique reachable nodes using DFS with post-order processing
        reachable_nodes = set()
        stack = [(start_node_id, False)]  # (node_id, children_pushed)
        visited = set()  # Nodes completely processed
        in_progress = set()  # Nodes currently being processed (for cycle detection)
        
        while stack:
            node_id, children_pushed = stack.pop()
            
            if children_pushed:
                # Post-order: all children have been processed
                in_progress.discard(node_id)
                visited.add(node_id)
                continue
            
            # Check if already fully explored
            if node_id in visited:
                continue
            
            # Check for cycles - if node is in_progress, we've found a cycle
            if node_id in in_progress:
                raise CircularDependencyError(node_id)
            
            # Check global cache
            cached = self._cache.get(node_id)
            if cached is not None and node_id != start_node_id:
                # This node and all its descendants are already computed
                visited.add(node_id)
                reachable_nodes.add(node_id)
                continue
            
            current_node = self.datastore.get(node_id)
            if not current_node:
                visited.add(node_id)
                continue
            
            # Mark as reachable
            reachable_nodes.add(node_id)
            
            # Mark as in progress (on current path)
            in_progress.add(node_id)
            
            # Push self back for post-order processing
            stack.append((node_id, True))
            
            # Push children in reverse order
            for child_id in reversed(current_node.children):
                if child_id not in visited:
                    stack.append((child_id, False))
        
        # Sum weights of all unique reachable nodes
        total_weight = 0
        for node_id in reachable_nodes:
            current_node = self.datastore.get(node_id)
            if current_node:
                total_weight += current_node.value
        
        return total_weight

    
    def update_node_value(self, node_id: str, new_value: int):
        """
        Update a node's value and atomically invalidate cache.
        Only invalidates the updated node and its ancestors.
        Thread-safe.
        """
        with self._lock:
            node = self.datastore.get(node_id)
            if node:
                node.value = new_value
                # Atomic invalidation - only this node and ancestors
                self._cache.invalidate(node_id, self._parent_map)
    
    def get_cache_memory_usage(self) -> int:
        """Get current cache memory usage in bytes."""
        return self._cache.get_memory_usage()
    
    def clear_cache(self):
        """Clear all cached entries."""
        with self._lock:
            self._cache.clear()


# Legacy class maintained for backward compatibility
class LegacyHierarchyService:
    """
    Current failing implementation. 
    Relies on a flat registry (datastore) to resolve child IDs to Node objects.
    """
    def __init__(self, datastore: Dict[str, Node]):
        self.datastore = datastore

    def calculate_total_weight(self, node_id: str) -> int:
        # WARNING: This implementation is hitting recursion limits
        # and lacks protection against cycles or redundant DAG nodes.
        node = self.datastore.get(node_id)
        if not node:
            return 0
        
        total = node.value
        for child_id in node.children:
            total += self.calculate_total_weight(child_id)
        return total