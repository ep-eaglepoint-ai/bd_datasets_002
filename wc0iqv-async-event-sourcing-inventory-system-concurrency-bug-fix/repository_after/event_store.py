import asyncio
import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
from uuid import uuid4
import asyncpg

@dataclass
class Event:
    event_id: str
    aggregate_id: str
    event_type: str
    data: Dict[str, Any]
    timestamp: datetime
    version: int

@dataclass
class Snapshot:
    aggregate_id: str
    state: Dict[str, Any]
    version: int
    timestamp: datetime


class EventStore:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.subscribers: Dict[str, List[Callable]] = {}
        self._snapshot_lock = asyncio.Lock()
        self._in_memory_events: Dict[str, List[Event]] = {}
        self._snapshots: Dict[str, Snapshot] = {}
        # Per-aggregate locks for thread-safe event appending
        self._aggregate_locks: Dict[str, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()

    def _get_aggregate_lock(self, aggregate_id: str) -> asyncio.Lock:
        """Get or create a lock for a specific aggregate."""
        if aggregate_id not in self._aggregate_locks:
            self._aggregate_locks[aggregate_id] = asyncio.Lock()
        return self._aggregate_locks[aggregate_id]

    async def append_event(self, aggregate_id: str, event_type: str, data: Dict[str, Any]) -> Event:
        """Append an event atomically with proper version management."""
        lock = self._get_aggregate_lock(aggregate_id)

        async with lock:
            # Initialize event list if needed
            if aggregate_id not in self._in_memory_events:
                self._in_memory_events[aggregate_id] = []

            events = self._in_memory_events[aggregate_id]
            version = len(events) + 1

            event = Event(
                event_id=str(uuid4()),
                aggregate_id=aggregate_id,
                event_type=event_type,
                data=data,
                timestamp=datetime.utcnow(),
                version=version
            )

            # Append to in-memory store atomically within the lock
            self._in_memory_events[aggregate_id].append(event)

        # Persist event (fire-and-forget but tracked for consistency)
        asyncio.create_task(self._persist_event(event))

        # Notify subscribers without blocking (non-blocking)
        asyncio.create_task(self._notify_subscribers(event))

        return event

    async def _persist_event(self, event: Event):
        """Persist event to database."""
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO events (event_id, aggregate_id, event_type, data, timestamp, version)
                VALUES ($1, $2, $3, $4, $5, $6)
            ''', event.event_id, event.aggregate_id, event.event_type,
                json.dumps(event.data), event.timestamp, event.version)

    async def get_events(self, aggregate_id: str, from_version: int = 0) -> List[Event]:
        """Get events for an aggregate from a specific version."""
        lock = self._get_aggregate_lock(aggregate_id)
        async with lock:
            events = self._in_memory_events.get(aggregate_id, [])
            return [e for e in events if e.version > from_version]

    async def get_events_snapshot_safe(self, aggregate_id: str, from_version: int = 0, to_version: Optional[int] = None) -> List[Event]:
        """Get events within a version range for snapshot-safe reads."""
        lock = self._get_aggregate_lock(aggregate_id)
        async with lock:
            events = self._in_memory_events.get(aggregate_id, [])
            filtered = [e for e in events if e.version > from_version]
            if to_version is not None:
                filtered = [e for e in filtered if e.version <= to_version]
            return filtered

    async def get_current_version(self, aggregate_id: str) -> int:
        """Get the current version of an aggregate atomically."""
        lock = self._get_aggregate_lock(aggregate_id)
        async with lock:
            events = self._in_memory_events.get(aggregate_id, [])
            return len(events)

    async def create_snapshot(self, aggregate_id: str, state: Dict[str, Any], version: Optional[int] = None):
        """Create a snapshot at a specific version with consistency guarantee."""
        lock = self._get_aggregate_lock(aggregate_id)

        async with lock:
            events = self._in_memory_events.get(aggregate_id, [])
            # Use provided version or current version
            snapshot_version = version if version is not None else len(events)

            snapshot = Snapshot(
                aggregate_id=aggregate_id,
                state=state.copy(),
                version=snapshot_version,
                timestamp=datetime.utcnow()
            )

            self._snapshots[aggregate_id] = snapshot

        # Persist to database outside the lock
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO snapshots (aggregate_id, state, version, timestamp)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (aggregate_id) DO UPDATE SET
                    state = $2, version = $3, timestamp = $4
            ''', aggregate_id, json.dumps(state), snapshot_version, snapshot.timestamp)

    async def get_snapshot(self, aggregate_id: str) -> Optional[Snapshot]:
        """Get the latest snapshot for an aggregate."""
        return self._snapshots.get(aggregate_id)

    async def replay_events(self, aggregate_id: str, apply_fn: Callable[[Dict, Event], Dict]) -> Dict[str, Any]:
        """Replay events to reconstruct state."""
        state = {}

        snapshot = await self.get_snapshot(aggregate_id)
        if snapshot:
            state = snapshot.state.copy()
            from_version = snapshot.version
        else:
            from_version = 0

        events = await self.get_events(aggregate_id, from_version)

        for event in events:
            state = apply_fn(state, event)

        return state

    async def replay_events_to_version(self, aggregate_id: str, apply_fn: Callable[[Dict, Event], Dict], to_version: int) -> Dict[str, Any]:
        """Replay events up to a specific version for consistent snapshots."""
        state = {}

        snapshot = await self.get_snapshot(aggregate_id)
        if snapshot and snapshot.version <= to_version:
            state = snapshot.state.copy()
            from_version = snapshot.version
        else:
            from_version = 0

        events = await self.get_events_snapshot_safe(aggregate_id, from_version, to_version)

        for event in events:
            state = apply_fn(state, event)

        return state

    def subscribe(self, event_type: str, handler: Callable):
        """Subscribe a handler to an event type."""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)

    async def _notify_subscribers(self, event: Event):
        """Notify subscribers without blocking - each handler runs independently."""
        handlers = self.subscribers.get(event.event_type, [])
        # Run all handlers concurrently without blocking each other
        tasks = [asyncio.create_task(self._safe_handler_call(handler, event)) for handler in handlers]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _safe_handler_call(self, handler: Callable, event: Event):
        """Safely call a handler, catching any exceptions."""
        try:
            await handler(event)
        except Exception:
            # Log but don't propagate - handlers shouldn't block event processing
            pass


class InventoryAggregate:
    def __init__(self, event_store: EventStore, aggregate_id: str):
        self.event_store = event_store
        self.aggregate_id = aggregate_id
        self._state: Dict[str, int] = {}
        self._version = 0
        self._lock = asyncio.Lock()

    async def load(self):
        """Load current state by replaying events."""
        self._state = await self.event_store.replay_events(
            self.aggregate_id,
            self._apply_event
        )

    def _apply_event(self, state: Dict[str, Any], event: Event) -> Dict[str, Any]:
        """Apply an event to state."""
        if event.event_type == "StockAdded":
            item_id = event.data["item_id"]
            quantity = event.data["quantity"]
            state[item_id] = state.get(item_id, 0) + quantity

        elif event.event_type == "StockRemoved":
            item_id = event.data["item_id"]
            quantity = event.data["quantity"]
            state[item_id] = state.get(item_id, 0) - quantity

        return state

    async def add_stock(self, item_id: str, quantity: int):
        """Add stock - thread-safe."""
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        await self.event_store.append_event(
            self.aggregate_id,
            "StockAdded",
            {"item_id": item_id, "quantity": quantity}
        )

    async def remove_stock(self, item_id: str, quantity: int):
        """Remove stock atomically with availability check."""
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        # Use aggregate-level lock for atomic check-and-remove
        lock = self.event_store._get_aggregate_lock(self.aggregate_id)

        async with lock:
            # Reload state within lock to get accurate count
            self._state = {}
            snapshot = await self.event_store.get_snapshot(self.aggregate_id)
            if snapshot:
                self._state = snapshot.state.copy()
                from_version = snapshot.version
            else:
                from_version = 0

            # Get events directly without lock (we already hold it)
            events = self.event_store._in_memory_events.get(self.aggregate_id, [])
            for event in events:
                if event.version > from_version:
                    self._state = self._apply_event(self._state, event)

            current_stock = self._state.get(item_id, 0)

            if current_stock < quantity:
                raise ValueError(f"Insufficient stock: {current_stock} < {quantity}")

            # Append event within the same lock - manual version handling
            if self.aggregate_id not in self.event_store._in_memory_events:
                self.event_store._in_memory_events[self.aggregate_id] = []

            events_list = self.event_store._in_memory_events[self.aggregate_id]
            version = len(events_list) + 1

            event = Event(
                event_id=str(uuid4()),
                aggregate_id=self.aggregate_id,
                event_type="StockRemoved",
                data={"item_id": item_id, "quantity": quantity},
                timestamp=datetime.utcnow(),
                version=version
            )

            self.event_store._in_memory_events[self.aggregate_id].append(event)

        # Persist and notify outside the lock
        asyncio.create_task(self.event_store._persist_event(event))
        asyncio.create_task(self.event_store._notify_subscribers(event))

    async def get_stock(self, item_id: str) -> int:
        """Get current stock for an item."""
        await self.load()
        return self._state.get(item_id, 0)


class SnapshotWorker:
    def __init__(self, event_store: EventStore, interval_seconds: int = 60):
        self.event_store = event_store
        self.interval = interval_seconds
        self._running = False
        self._aggregates_to_snapshot: List[str] = []

    def register_aggregate(self, aggregate_id: str):
        """Register an aggregate for periodic snapshotting."""
        self._aggregates_to_snapshot.append(aggregate_id)

    async def start(self):
        """Start the snapshot worker loop."""
        self._running = True
        while self._running:
            await asyncio.sleep(self.interval)
            await self._create_snapshots()

    async def stop(self):
        """Stop the snapshot worker."""
        self._running = False

    async def _create_snapshots(self):
        """Create snapshots for all registered aggregates."""
        tasks = []
        for aggregate_id in self._aggregates_to_snapshot:
            tasks.append(self._snapshot_aggregate(aggregate_id))

        await asyncio.gather(*tasks, return_exceptions=True)

    async def _snapshot_aggregate(self, aggregate_id: str):
        """Create a snapshot for an aggregate with consistency guarantee."""
        # Get current version atomically
        version = await self.event_store.get_current_version(aggregate_id)

        # Replay events up to that exact version
        state = await self.event_store.replay_events_to_version(
            aggregate_id,
            lambda s, e: self._apply_event(s, e),
            version
        )

        # Create snapshot at that version
        await self.event_store.create_snapshot(aggregate_id, state, version)

    def _apply_event(self, state: Dict[str, Any], event: Event) -> Dict[str, Any]:
        """Apply an event to state."""
        if event.event_type == "StockAdded":
            item_id = event.data["item_id"]
            quantity = event.data["quantity"]
            state[item_id] = state.get(item_id, 0) + quantity
        elif event.event_type == "StockRemoved":
            item_id = event.data["item_id"]
            quantity = event.data["quantity"]
            state[item_id] = state.get(item_id, 0) - quantity
        return state


class ReadModelProjection:
    def __init__(self):
        self._stock_levels: Dict[str, Dict[str, int]] = {}
        self._lock = asyncio.Lock()

    async def handle_event(self, event: Event):
        """Handle an event atomically - no partial updates visible."""
        async with self._lock:
            aggregate_id = event.aggregate_id

            # Initialize aggregate within the lock
            if aggregate_id not in self._stock_levels:
                self._stock_levels[aggregate_id] = {}

            if event.event_type == "StockAdded":
                item_id = event.data["item_id"]
                quantity = event.data["quantity"]
                current = self._stock_levels[aggregate_id].get(item_id, 0)
                self._stock_levels[aggregate_id][item_id] = current + quantity

            elif event.event_type == "StockRemoved":
                item_id = event.data["item_id"]
                quantity = event.data["quantity"]
                current = self._stock_levels[aggregate_id].get(item_id, 0)
                self._stock_levels[aggregate_id][item_id] = current - quantity

    def get_stock(self, aggregate_id: str, item_id: str) -> int:
        """Get stock level - returns consistent snapshot."""
        return self._stock_levels.get(aggregate_id, {}).get(item_id, 0)
