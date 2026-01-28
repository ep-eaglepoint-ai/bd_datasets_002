from __future__ import annotations
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from .protocols import MetricsCollector

@dataclass
class HealthStatus:
    healthy: bool
    details: Dict[str, Any]
    last_event_time: float

from collections import deque, defaultdict

class InMemoryMetricsCollector:
    def __init__(self):
        self._events_published: Dict[str, int] = defaultdict(int)
        self._events_failed: Dict[str, int] = defaultdict(int)
        self._handler_durations: Dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=1000))
        self._queue_depth: int = 0
        self._active_subscriptions: Dict[str, int] = defaultdict(int)

    def record_event_published(self, event_type: str) -> None:
        self._events_published[event_type] += 1

    def record_event_failed(self, event_type: str, error_type: str) -> None:
        key = f"{event_type}:{error_type}"
        self._events_failed[key] += 1

    def record_handler_duration(self, handler_name: str, duration_ms: float) -> None:
        self._handler_durations[handler_name].append(duration_ms)

    def update_queue_depth(self, depth: int) -> None:
        self._queue_depth = depth

    def update_active_subscriptions(self, event_type: str, count: int) -> None:
        self._active_subscriptions[event_type] = count

    def get_metrics(self) -> Dict[str, Any]:
        avg_durations = {
            name: sum(durations) / len(durations) 
            for name, durations in self._handler_durations.items() if durations
        }
        return {
            "events_published": self._events_published,
            "events_failed": self._events_failed,
            "handler_durations_avg_ms": avg_durations,
            "queue_depth": self._queue_depth,
            "active_subscriptions": self._active_subscriptions
        }
