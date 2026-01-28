"""
Data models for the async task queue.
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import Any, Callable, Optional, Awaitable, List
import time
import uuid


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
    sequence: int = 0
    
    # FIX R3: Custom comparison for priority queue ordering (max-heap behavior)
    # Higher priority comes first. For same priority, lower sequence (older) comes first
    def __lt__(self, other):
        if self.priority != other.priority:
            return self.priority > other.priority  # Higher priority > Lower priority
        return self.sequence < other.sequence      # Lower sequence < Higher sequence (FIFO)


@dataclass
class TaskResult:
    task_id: str
    success: bool
    result: Any = None
    error: Optional[str] = None
    duration_ms: float = 0.0
    retry_count: int = 0
