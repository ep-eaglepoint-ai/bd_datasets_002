"""
Data structures/containers for the async task queue.
"""

from typing import List, Optional, Any, Tuple
import heapq
import time  # FIX: Moved import to top per PEP 8
from collections import OrderedDict
from .models import Task


class PriorityTaskQueue:
    def __init__(self):
        self._queue: List[tuple] = []
        self._counter = 0
    
    def push(self, task: Task):
        # FIX R3: Use negative priority for max-heap behavior (higher priority first)
        entry = (-task.priority, self._counter, task)
        heapq.heappush(self._queue, entry)
        self._counter += 1
    
    def pop(self) -> Optional[Task]:
        if not self._queue:
            return None
        priority, counter, task = heapq.heappop(self._queue)
        return task
    
    def peek(self) -> Optional[Task]:
        if not self._queue:
            return None
        return self._queue[0][2]  # Return task, not tuple
    
    def __len__(self):
        return len(self._queue)


class ResultCache:
    def __init__(self, max_size: int = 1000, ttl_seconds: float = 300):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        # FIX R7: Use OrderedDict for LRU eviction
        self._cache = OrderedDict()
    
    def set(self, key: str, value: Any):
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = (value, time.time())
        
        # Evict if too large
        while len(self._cache) > self.max_size:
            self._cache.popitem(last=False)  # Remove first (oldest) item
    
    def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            return None
            
        value, timestamp = self._cache[key]
        
        # Check TTL
        if time.time() - timestamp > self.ttl_seconds:
            # FIX R7: Clean up expired
            del self._cache[key]
            return None
            
        self._cache.move_to_end(key)
        return value
    
    def cleanup(self):
        # FIX R7: Safe cleanup by creating list of keys
        current_time = time.time()
        keys_to_remove = []
        
        for key, (_, timestamp) in self._cache.items():
            if current_time - timestamp > self.ttl_seconds:
                keys_to_remove.append(key)
                
        for key in keys_to_remove:
            del self._cache[key]
            
    def __len__(self):
        return len(self._cache)
    
    def __contains__(self, key):
        return key in self._cache
    
    # Add items support for dict-like interface if needed
    def items(self):
        return self._cache.items()
    
    # Add delete support
    def __delitem__(self, key):
        del self._cache[key]
