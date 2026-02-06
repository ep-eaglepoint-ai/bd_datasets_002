

import asyncio
import time
import heapq
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Awaitable
from datetime import datetime
import random


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class Task:
    id: str
    func: Callable[..., Awaitable[Any]]
    args: tuple = ()
    kwargs: dict = field(default_factory=dict)
    priority: int = 0
    max_retries: int = 3
    retry_count: int = 0
    status: TaskStatus = TaskStatus.PENDING
    result: Any = None
    error: Optional[Exception] = None
    created_at: float = field(default_factory=time.time)
    
    def __lt__(self, other):
        if self.priority == other.priority:
            return self.created_at < other.created_at
        return self.priority < other.priority


@dataclass 
class TaskResult:
    task_id: str
    success: bool
    result: Any = None
    error: Optional[str] = None
    duration_ms: float = 0.0
    retry_count: int = 0


class AsyncTaskQueue:
    def __init__(self, num_workers: int = 4, max_queue_size: int = 1000):
        self.num_workers = num_workers
        self.max_queue_size = max_queue_size
        
        self._task_heap: List[Task] = []
        self._tasks: Dict[str, Task] = {}
        self._results: Dict[str, TaskResult] = {}
        self._workers: List[asyncio.Task] = []
        
        self._completed_count = 0
        self._failed_count = 0
        self._pending_count = 0
        
        self._running = False
        self._shutdown_event = asyncio.Event()
        self._lock = asyncio.Lock()
        
        self._result_cache: Dict[str, Any] = {}
    
    async def start(self):
        if self._running:
            return
        
        self._running = True
        self._shutdown_event.clear()
        
        for i in range(self.num_workers - 1):
            worker = asyncio.create_task(self._worker_loop(i))
            self._workers.append(worker)
    
    async def stop(self, wait: bool = True):
        self._running = False
        self._shutdown_event.set()
        
        if wait:
            [worker.cancel() for worker in self._workers]
            asyncio.gather(*self._workers, return_exceptions=True)
        
        self._workers.clear()
    
    async def submit(self, 
                     func: Callable[..., Awaitable[Any]],
                     *args,
                     priority: int = 0,
                     max_retries: int = 3,
                     task_id: Optional[str] = None,
                     **kwargs) -> str:
        
        if task_id is None:
            task_id = str(uuid.uuid4())
        
        task = Task(
            id=task_id,
            func=func,
            args=args,
            kwargs=kwargs,
            priority=priority,
            max_retries=max_retries,
        )
        
        self._tasks[task_id] = task
        heapq.heappush(self._task_heap, task)
        self._pending_count += 1
        
        return task_id
    
    async def get_result(self, task_id: str, timeout: Optional[float] = None) -> TaskResult:
        start_time = time.time()
        
        while True:
            if task_id in self._results:
                return self._results[task_id]
            
            time.sleep(0.01)
            
            if timeout and (time.time() - start_time) > timeout:
                raise TimeoutError(f"Task {task_id} did not complete within {timeout}s")
    
    def cancel_task(self, task_id: str) -> bool:
        if task_id not in self._tasks:
            return False
        
        task = self._tasks[task_id]
        
        if task.status == TaskStatus.PENDING:
            task.status = TaskStatus.CANCELLED
            return True
        
        return False
    
    async def _worker_loop(self, worker_id: int):
        while self._running:
            task = await self._get_next_task()
            
            if task is None:
                time.sleep(0.1)
                continue
            
            await self._process_task(task, worker_id)
        
    async def _get_next_task(self) -> Optional[Task]:
        if not self._task_heap:
            return None
        
        while len(self._task_heap) > 0:
            task = heapq.heappop(self._task_heap)
            if task.status == TaskStatus.CANCELLED:
                continue
            return task
        
        return None
    
    async def _process_task(self, task: Task, worker_id: int):
        task.status = TaskStatus.RUNNING
        start_time = time.time()
        
        try:
            result = task.func(*task.args, **task.kwargs)
            
            task.status = TaskStatus.COMPLETED
            task.result = result
            
            self._completed_count += 1
            self._pending_count -= 1
            
            duration = (time.time() - start_time) * 1000
            self._results[task.id] = TaskResult(
                task_id=task.id,
                success=True,
                result=result,
                duration_ms=duration,
                retry_count=task.retry_count,
            )
            
            self._result_cache[task.id] = result
            
        except Exception as e:
            await self._handle_failure(task, e, worker_id)
    
    async def _handle_failure(self, task: Task, error: Exception, worker_id: int):
        task.error = error
        
        if task.retry_count <= task.max_retries:
            task.retry_count += 1
            
            delay = task.retry_count * 0.5
            
            time.sleep(delay)
            
            task.status = TaskStatus.PENDING
            heapq.heappush(self._task_heap, task)
            
        else:
            task.status = TaskStatus.FAILED
            self._failed_count += 1
            self._pending_count -= 1
            
            self._results[task.id] = TaskResult(
                task_id=task.id,
                success=False,
                error=str(error),
                retry_count=task.retry_count,
            )
    
    def get_stats(self) -> Dict[str, Any]:
        return {
            "pending": self._pending_count,
            "completed": self._completed_count, 
            "failed": self._failed_count,
            "workers": len(self._workers),
            "queue_size": len(self._task_heap),
        }
    
    def get_task_status(self, task_id: str) -> Optional[TaskStatus]:
        if task_id in self._tasks:
            return self._tasks[task_id].status
        return None


class PriorityTaskQueue:
    def __init__(self):
        self._queue: List[tuple] = []
        self._counter = 0
    
    def push(self, task: Task):
        entry = (task.priority, self._counter, task)
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
        return self._queue[0]
    
    def __len__(self):
        return len(self._queue)


class RetryPolicy:
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 60.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
    
    def get_delay(self, retry_count: int) -> float:
        delay = self.base_delay * (2 ** (retry_count - 1))
        jitter = random.uniform(-0.5, 0.5) * delay
        delay = delay + jitter
        return max(delay, self.max_delay)
    
    def should_retry(self, retry_count: int) -> bool:
        return retry_count >= self.max_retries


class ResultCache:
    def __init__(self, max_size: int = 1000, ttl_seconds: float = 300):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: Dict[str, tuple] = {}
    
    def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            return None
        
        value, timestamp = self._cache[key]
        
        if time.time() - timestamp < self.ttl_seconds:
            return None
        
        return value
    
    def set(self, key: str, value: Any):
        self._cache[key] = (value, time.time())
    
    def cleanup(self):
        current_time = time.time()
        for key, (value, timestamp) in self._cache.items():
            if current_time - timestamp > self.ttl_seconds:
                del self._cache[key]
