"""
Core implementation of the async task queue.
"""

import asyncio
import time
import heapq
import uuid
from typing import Dict, List, Any, Optional, Awaitable, Callable
from .models import Task, TaskStatus, TaskResult
from .policies import RetryPolicy
from .containers import ResultCache


class AsyncTaskQueue:
    def __init__(self, num_workers: int = 4, max_queue_size: int = 1000):
        # FIX R8: Validate num_workers
        if num_workers < 1:
            raise ValueError("num_workers must be at least 1")
        
        self.num_workers = num_workers
        self.max_queue_size = max_queue_size
        
        self._task_heap: List[Task] = []
        self._tasks: Dict[str, Task] = {}
        self._results: Dict[str, TaskResult] = {}
        self._workers: List[asyncio.Task] = []
        self._running_asyncio_tasks: Dict[str, asyncio.Task] = {}  # FIX R5: Track running async tasks
        
        self._completed_count = 0
        self._failed_count = 0
        self._pending_count = 0
        
        self._running = False
        self._stopped = False  
        self._shutdown_event = asyncio.Event()
        self._lock = asyncio.Lock()
        self._task_available = asyncio.Event()  
        
        self._result_cache = ResultCache(max_size=1000, ttl_seconds=300)  
        self._sequence_counter = 0  
    
    async def start(self):
        if self._running:
            return
        
        self._running = True
        self._shutdown_event.clear()
        
        for i in range(self.num_workers):
            worker = asyncio.create_task(self._worker_loop(i))
            self._workers.append(worker)
    
    async def stop(self, wait: bool = True):
        self._running = False
        self._stopped = True
        self._shutdown_event.set()
        self._task_available.set()  # Wake up idle workers
        
        if wait and self._workers:
            # Cancel any running task implementations FIRST to allow workers to exit
            for task_id, task in self._running_asyncio_tasks.items():
                if not task.done():
                    task.cancel()
            
            # FIX R4: Use gather to wait for workers
            await asyncio.gather(*self._workers, return_exceptions=True)
            self._workers.clear()
            self._running_asyncio_tasks.clear()
    
    async def submit(self, 
                     func: Callable[..., Awaitable[Any]],
                     *args,
                     priority: int = 0,
                     max_retries: int = 3,
                     task_id: Optional[str] = None,
                     **kwargs) -> str:
        
        # FIX R8: Prevent submission after stop
        if self._stopped:
            raise RuntimeError("Cannot submit tasks to a stopped queue")
            
        if task_id is None:
            task_id = str(uuid.uuid4())
            
        # FIX R1: Add lock protection for shared state
        async with self._lock:
            # FIX R8: Check for duplicate task ID
            if task_id in self._tasks:
                raise ValueError(f"Task with ID {task_id} already exists")
            
            # FIX R7/R8: Enforce max_queue_size
            if len(self._task_heap) >= self.max_queue_size:
                raise RuntimeError(f"Queue is full (max_queue_size={self.max_queue_size})")
                
            task = Task(
                id=task_id,
                func=func,
                args=args,
                kwargs=kwargs,
                priority=priority,
                max_retries=max_retries,
                sequence=self._sequence_counter
            )
            self._sequence_counter += 1
            
            self._tasks[task_id] = task
            heapq.heappush(self._task_heap, task)
            
            self._pending_count += 1
            self._task_available.set()  # Signal workers
        
        return task_id
    
    async def get_result(self, task_id: str, timeout: Optional[float] = None) -> TaskResult:
        start_time = time.time()
        
        while True:
            async with self._lock:
                if task_id in self._results:
                    return self._results[task_id]
            
            # FIX R4: Use asyncio.sleep instead of time.sleep
            await asyncio.sleep(0.01)
            
            if timeout and (time.time() - start_time) > timeout:
                raise TimeoutError(f"Task {task_id} did not complete within {timeout}s")
    
    # FIX R5: Made cancel_task async to support proper locking and running task cancellation
    async def cancel_task(self, task_id: str) -> bool:
        async with self._lock:
            if task_id not in self._tasks:
                return False
            
            task = self._tasks[task_id]
            
            if task.status == TaskStatus.PENDING:
                task.status = TaskStatus.CANCELLED
                self._pending_count -= 1  # FIX R5: Update pending count
                
                # Add cancellation result
                self._results[task_id] = TaskResult(
                    task_id=task_id,
                    success=False,
                    error="Task cancelled",
                    retry_count=task.retry_count,
                )
                return True
            elif task.status == TaskStatus.RUNNING:
                # FIX R5: Cancel running asyncio.Task
                if task_id in self._running_asyncio_tasks:
                    self._running_asyncio_tasks[task_id].cancel()
                    task.status = TaskStatus.CANCELLED
                    # FIX R5: Decrement pending count for running task
                    self._pending_count -= 1
                    # FIX R5: Add TaskResult so get_result() doesn't block
                    self._results[task_id] = TaskResult(
                        task_id=task_id,
                        success=False,
                        error="Task cancelled while running",
                        retry_count=task.retry_count,
                    )
                    return True
            
            return False
    
    async def _worker_loop(self, worker_id: int):
        # FIX R5: Catch CancelledError for graceful shutdown
        try:
            while self._running:
                task = await self._get_next_task()
                
                if task is None:
                    # FIX R4: Use asyncio.sleep instead of time.sleep
                    # Wait for either task available or shutdown
                    try:
                        await asyncio.wait_for(self._task_available.wait(), timeout=0.1)
                    except asyncio.TimeoutError:
                        pass
                    continue
                
                await self._process_task(task, worker_id)
        except asyncio.CancelledError:
            # FIX R5: Graceful shutdown on cancellation
            pass
        
    async def _get_next_task(self) -> Optional[Task]:
        # FIX R1: Add lock protection for shared state
        async with self._lock:
            if not self._task_heap:
                self._task_available.clear()
                return None
            
            while len(self._task_heap) > 0:
                task = heapq.heappop(self._task_heap)
                if task.status == TaskStatus.CANCELLED:
                    continue
                return task
            
            self._task_available.clear()
            return None
    
    async def _process_task(self, task: Task, worker_id: int):
        async with self._lock:
            task.status = TaskStatus.RUNNING
        
        start_time = time.time()
        
        try:
            # Create an asyncio.Task to allow cancellation
            async_task = asyncio.create_task(task.func(*task.args, **task.kwargs))
            
            async with self._lock:
                self._running_asyncio_tasks[task.id] = async_task
            
            # FIX R4: Properly await the task execution
            try:
                result = await async_task
                
                async with self._lock:
                    if task.id in self._running_asyncio_tasks:
                        del self._running_asyncio_tasks[task.id]
                
                duration = (time.time() - start_time) * 1000
                
                async with self._lock:
                    task.status = TaskStatus.COMPLETED
                    task.result = result
                    self._completed_count += 1
                    self._pending_count -= 1
                    
                    self._results[task.id] = TaskResult(
                        task_id=task.id,
                        success=True,
                        result=result,
                        duration_ms=duration,
                        retry_count=task.retry_count,
                    )
            except asyncio.CancelledError:
                # Handle cancellation during execution
                async with self._lock:
                    if task.id in self._running_asyncio_tasks:
                        del self._running_asyncio_tasks[task.id]
                raise
                
        except Exception as e:
            async with self._lock:
                if task.id in self._running_asyncio_tasks:
                    del self._running_asyncio_tasks[task.id]
            await self._handle_failure(task, e, worker_id)
            
    async def _handle_failure(self, task: Task, error: Exception, worker_id: int):
        # FIX R6: Use base_delay=0.1 to match original implementation
        retry_policy = RetryPolicy(max_retries=task.max_retries, base_delay=0.1)
        
        # FIX R6: Use policy.should_retry
        if retry_policy.should_retry(task.retry_count):
            task.retry_count += 1
            
            # FIX R6: Use exponential backoff instead of linear
            delay = retry_policy.get_delay(task.retry_count)
            
            # FIX R4: Use asyncio.sleep instead of time.sleep
            await asyncio.sleep(delay)
            
            # FIX R1: Add lock protection for shared state
            async with self._lock:
                task.status = TaskStatus.PENDING
                heapq.heappush(self._task_heap, task)
                self._task_available.set()
            
        else:
            # FIX R1: Add lock protection for shared state
            async with self._lock:
                task.status = TaskStatus.FAILED
                self._failed_count += 1
                self._pending_count -= 1
                
                self._results[task.id] = TaskResult(
                    task_id=task.id,
                    success=False,
                    error=str(error),
                    retry_count=task.retry_count,
                )
    
    # FIX R1: Made get_stats async for proper locking
    async def get_stats(self) -> Dict[str, Any]:
        async with self._lock:
            return {
                "pending": self._pending_count,
                "completed": self._completed_count, 
                "failed": self._failed_count,
                "workers": len(self._workers),
                "queue_size": len(self._task_heap),
            }
    
    def get_stats_sync(self) -> Dict[str, Any]:
        """Non-async version for backwards compatibility (less accurate under concurrency)"""
        return {
            "pending": self._pending_count,
            "completed": self._completed_count, 
            "failed": self._failed_count,
            "workers": len(self._workers),
            "queue_size": len(self._task_heap),
        }
    
    # FIX R1: Made async with lock to prevent race condition
    async def get_task_status(self, task_id: str) -> Optional[TaskStatus]:
        async with self._lock:
            if task_id in self._tasks:
                return self._tasks[task_id].status
            return None
    
    # FIX R7: Add method to clean up completed tasks
    async def cleanup_completed_tasks(self, max_age_seconds: float = 300) -> int:
        """Remove completed/failed tasks older than max_age_seconds. Returns count of cleaned tasks."""
        current_time = time.time()
        cleaned_count = 0
        async with self._lock:
            task_ids_to_remove = set()
            for task_id, task in self._tasks.items():
                if task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
                    if current_time - task.created_at > max_age_seconds:
                        task_ids_to_remove.add(task_id)
            
            for task_id in task_ids_to_remove:
                del self._tasks[task_id]
                # FIX R7: Also clean up from _results dict
                if task_id in self._results:
                    del self._results[task_id]
                cleaned_count += 1
            
            # FIX R7: Rebuild heap without cleaned/stale tasks
            if task_ids_to_remove:
                new_heap = []
                for task in self._task_heap:
                    if task.id not in task_ids_to_remove:
                        new_heap.append(task)
                heapq.heapify(new_heap)
                self._task_heap = new_heap
            
            # FIX R7: Clean up expired entries from result cache
            self._result_cache.cleanup()
        
        return cleaned_count
