from __future__ import annotations
from typing import Protocol, runtime_checkable, Any, Callable, Awaitable, TypeVar, Union, Type, List, Optional, Dict
from dataclasses import dataclass, field
from datetime import datetime
from .events import Event

E = TypeVar("E", bound=Event)
R = TypeVar("R")

Handler = Union[Callable[[E], R], Callable[[E], Awaitable[R]]]

@dataclass
class HandlerResult:
    handler_name: str
    success: bool
    result: Any = None
    error: Optional[Exception] = None
    duration_ms: float = 0.0
    retry_count: int = 0

@dataclass
class EventResult:
    success: bool
    event: Event
    handler_results: List[HandlerResult]
    errors: List[Exception]
    duration_ms: float = 0.0
    dead_letter_count: int = 0
    retry_counts: List[int] = field(default_factory=list)

@runtime_checkable
class Middleware(Protocol):
    async def __call__(
        self, event: Event, next_handler: Callable[[Event], Awaitable[EventResult]]
    ) -> EventResult:
        ...

@runtime_checkable
class EventStore(Protocol):
    async def save(self, event: Event) -> None: ...
    async def get(self, event_id: str) -> Optional[Event]: ...
    async def get_by_type(
        self, event_type: Type[Event], since: Optional[datetime] = None, until: Optional[datetime] = None, limit: Optional[int] = None
    ) -> List[Event]: ...
    async def replay(self, event_type: Type[Event], since: datetime, handler: Handler) -> None: ...

@runtime_checkable
class MetricsCollector(Protocol):
    def record_event_published(self, event_type: str) -> None: ...
    def record_event_failed(self, event_type: str, error_type: str) -> None: ...
    def record_handler_duration(self, handler_name: str, duration_ms: float) -> None: ...
    def update_queue_depth(self, depth: int) -> None: ...
    def update_active_subscriptions(self, event_type: str, count: int) -> None: ...
    def get_metrics(self) -> Dict[str, Any]: ...
