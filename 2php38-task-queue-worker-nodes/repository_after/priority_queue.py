"""Multi-level priority queue system with fair scheduling."""
from __future__ import annotations

import asyncio
import heapq
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

from .models import Job, JobStatus, Priority


@dataclass(order=True)
class PriorityItem:
    """Item in the priority queue with comparison support."""
    priority: int
    timestamp: float
    weight_score: float = field(compare=False)
    job: Job = field(compare=False)


class PriorityWeights:
    """Configurable weights for priority levels."""
    
    def __init__(self, weights: Optional[Dict[Priority, float]] = None):
        self._weights = weights or {
            Priority.CRITICAL: 1.0,
            Priority.HIGH: 0.8,
            Priority.NORMAL: 0.5,
            Priority.LOW: 0.3,
            Priority.BATCH: 0.1,
        }
        self._starvation_boost = 0.1
        self._boost_interval_ms = 1000
    
    def get_weight(self, priority: Priority) -> float:
        return self._weights.get(priority, 0.5)
    
    def set_weight(self, priority: Priority, weight: float):
        self._weights[priority] = max(0.0, min(1.0, weight))
    
    def calculate_score(self, priority: Priority, wait_time_ms: float) -> float:
        """Calculate scheduling score with starvation prevention."""
        base_weight = self.get_weight(priority)
        boost_count = wait_time_ms / self._boost_interval_ms
        starvation_boost = boost_count * self._starvation_boost
        return base_weight + starvation_boost


class MultiLevelPriorityQueue:
    """Multi-level priority queue with fair scheduling and starvation prevention."""
    
    def __init__(self, weights: Optional[PriorityWeights] = None):
        self._weights = weights or PriorityWeights()
        self._queues: Dict[Priority, List[PriorityItem]] = {p: [] for p in Priority}
        self._job_map: Dict[str, Tuple[Priority, Job]] = {}
        self._lock = threading.RLock()
        self._not_empty = threading.Condition(self._lock)
        self._enqueue_times: Dict[str, float] = {}
    
    def enqueue(self, job: Job) -> bool:
        """Add a job to the queue."""
        with self._lock:
            if job.id in self._job_map:
                return False
            
            priority = Priority(job.priority) if isinstance(job.priority, int) else job.priority
            timestamp = time.time()
            weight_score = self._weights.calculate_score(priority, 0)
            
            item = PriorityItem(
                priority=priority.value,
                timestamp=timestamp,
                weight_score=weight_score,
                job=job,
            )
            
            heapq.heappush(self._queues[priority], item)
            self._job_map[job.id] = (priority, job)
            self._enqueue_times[job.id] = timestamp * 1000
            self._not_empty.notify()
            return True
    
    def dequeue(self, timeout: Optional[float] = None) -> Optional[Job]:
        """Remove and return the highest priority job using fair scheduling."""
        with self._not_empty:
            if timeout is not None:
                end_time = time.time() + timeout
                while self._is_empty_unlocked():
                    remaining = end_time - time.time()
                    if remaining <= 0:
                        return None
                    if not self._not_empty.wait(remaining):
                        return None
            else:
                while self._is_empty_unlocked():
                    self._not_empty.wait()
            
            return self._dequeue_fair()
    
    def _dequeue_fair(self) -> Optional[Job]:
        """Select job using weighted fair scheduling."""
        current_time = time.time() * 1000
        best_item: Optional[PriorityItem] = None
        best_priority: Optional[Priority] = None
        best_score = float("-inf")
        
        for priority in Priority:
            queue = self._queues[priority]
            if not queue:
                continue
            
            item = queue[0]
            wait_time = current_time - self._enqueue_times.get(item.job.id, current_time)
            score = self._weights.calculate_score(priority, wait_time)
            
            effective_score = score - (item.priority * 0.01)
            
            if effective_score > best_score:
                best_score = effective_score
                best_item = item
                best_priority = priority
        
        if best_item and best_priority is not None:
            heapq.heappop(self._queues[best_priority])
            del self._job_map[best_item.job.id]
            del self._enqueue_times[best_item.job.id]
            return best_item.job
        
        return None
    
    def _is_empty_unlocked(self) -> bool:
        return all(len(q) == 0 for q in self._queues.values())
    
    def is_empty(self) -> bool:
        with self._lock:
            return self._is_empty_unlocked()
    
    def size(self) -> int:
        with self._lock:
            return sum(len(q) for q in self._queues.values())
    
    def size_by_priority(self) -> Dict[Priority, int]:
        with self._lock:
            return {p: len(q) for p, q in self._queues.items()}
    
    def get_job(self, job_id: str) -> Optional[Job]:
        with self._lock:
            if job_id in self._job_map:
                return self._job_map[job_id][1]
            return None
    
    def remove_job(self, job_id: str) -> Optional[Job]:
        """Remove a specific job from the queue."""
        with self._lock:
            if job_id not in self._job_map:
                return None
            
            priority, job = self._job_map[job_id]
            queue = self._queues[priority]
            
            for i, item in enumerate(queue):
                if item.job.id == job_id:
                    queue.pop(i)
                    heapq.heapify(queue)
                    del self._job_map[job_id]
                    if job_id in self._enqueue_times:
                        del self._enqueue_times[job_id]
                    return job
            
            return None
    
    def update_priority(self, job_id: str, new_priority: Priority) -> bool:
        """Dynamically adjust job priority."""
        with self._lock:
            if job_id not in self._job_map:
                return False
            
            old_priority, job = self._job_map[job_id]
            if old_priority == new_priority:
                return True
            
            queue = self._queues[old_priority]
            for i, item in enumerate(queue):
                if item.job.id == job_id:
                    queue.pop(i)
                    heapq.heapify(queue)
                    break
            else:
                return False
            
            job.priority = new_priority.value
            timestamp = self._enqueue_times.get(job_id, time.time() * 1000) / 1000
            weight_score = self._weights.calculate_score(new_priority, 0)
            
            new_item = PriorityItem(
                priority=new_priority.value,
                timestamp=timestamp,
                weight_score=weight_score,
                job=job,
            )
            
            heapq.heappush(self._queues[new_priority], new_item)
            self._job_map[job_id] = (new_priority, job)
            return True
    
    def peek(self) -> Optional[Job]:
        """View the next job without removing it."""
        with self._lock:
            for priority in Priority:
                if self._queues[priority]:
                    return self._queues[priority][0].job
            return None
    
    def clear(self):
        """Clear all jobs from the queue."""
        with self._lock:
            for priority in Priority:
                self._queues[priority].clear()
            self._job_map.clear()
            self._enqueue_times.clear()


class AsyncPriorityQueue:
    """Async wrapper for MultiLevelPriorityQueue."""
    
    def __init__(self, weights: Optional[PriorityWeights] = None):
        self._queue = MultiLevelPriorityQueue(weights)
        self._event = asyncio.Event()
    
    async def enqueue(self, job: Job) -> bool:
        result = self._queue.enqueue(job)
        if result:
            self._event.set()
        return result
    
    async def dequeue(self, timeout: Optional[float] = None) -> Optional[Job]:
        if timeout:
            try:
                await asyncio.wait_for(self._event.wait(), timeout)
            except asyncio.TimeoutError:
                pass
        
        job = self._queue.dequeue(timeout=0)
        
        if self._queue.is_empty():
            self._event.clear()
        
        return job
    
    def size(self) -> int:
        return self._queue.size()
    
    def size_by_priority(self) -> Dict[Priority, int]:
        return self._queue.size_by_priority()
    
    def is_empty(self) -> bool:
        return self._queue.is_empty()
    
    async def update_priority(self, job_id: str, new_priority: Priority) -> bool:
        return self._queue.update_priority(job_id, new_priority)
    
    def get_job(self, job_id: str) -> Optional[Job]:
        return self._queue.get_job(job_id)
    
    def clear(self):
        self._queue.clear()
        self._event.clear()
