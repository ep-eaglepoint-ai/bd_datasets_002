from __future__ import annotations
import asyncio
import random
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple, Type
from .events import Event

@dataclass
class RetryPolicy:
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True

    def get_delay(self, retry_count: int) -> float:
        delay = min(self.base_delay * (self.exponential_base ** retry_count), self.max_delay)
        if self.jitter:
            delay += random.uniform(0, 0.1 * delay)
        return delay

@dataclass
class DeadLetterEntry:
    event: Event
    handler_name: str
    exception: Exception
    retry_count: int
    timestamp: float = field(default_factory=lambda: asyncio.get_event_loop().time())

class DeadLetterQueue:
    def __init__(self, capacity: int = 1000):
        self.capacity = capacity
        self.queue: List[DeadLetterEntry] = []

    def add(self, event: Event, handler_name: str, exception: Exception, retry_count: int):
        if len(self.queue) >= self.capacity:
            self.queue.pop(0)  # Evict oldest
        self.queue.append(DeadLetterEntry(event, handler_name, exception, retry_count))

    def get_all(self) -> List[DeadLetterEntry]:
        return list(self.queue)

    async def replay(self, replay_func: Callable[[Event], Awaitable[Any]]):
        entries = self.get_all()
        self.clear()
        for entry in entries:
            await replay_func(entry.event)

    def clear(self):
        self.queue.clear()
