from __future__ import annotations
import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Type
from .events import Event
from .protocols import EventStore, Handler

@dataclass
class Snapshot:
    timestamp: datetime
    state: Dict[str, Any]
    last_event_id: str

class InMemoryEventStore:
    def __init__(self):
        self._events: List[Event] = []
        self._by_id: Dict[str, Event] = {}
        self._snapshots: List[Snapshot] = []

    async def save(self, event: Event) -> None:
        self._events.append(event)
        self._by_id[event.event_id] = event

    async def get(self, event_id: str) -> Optional[Event]:
        return self._by_id.get(event_id)

    async def get_by_type(
        self, 
        event_type: Type[Event], 
        since: Optional[datetime] = None, 
        until: Optional[datetime] = None, 
        limit: Optional[int] = None
    ) -> List[Event]:
        results = []
        for event in self._events:
            if isinstance(event, event_type):
                if since and event.timestamp < since:
                    continue
                if until and event.timestamp > until:
                    continue
                results.append(event)
                if limit and len(results) >= limit:
                    break
        return results

    async def replay(self, event_type: Type[Event], since: datetime, handler: Handler) -> None:
        events = await self.get_by_type(event_type, since=since)
        for event in events:
            if asyncio.iscoroutinefunction(handler):
                await handler(event)
            else:
                handler(event)

    async def save_snapshot(self, snapshot: Snapshot):
        self._snapshots.append(snapshot)

    async def get_latest_snapshot(self) -> Optional[Snapshot]:
        if not self._snapshots:
            return None
        return sorted(self._snapshots, key=lambda s: s.timestamp, reverse=True)[0]
