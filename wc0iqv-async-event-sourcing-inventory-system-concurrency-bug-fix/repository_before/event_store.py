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
    
    async def append_event(self, aggregate_id: str, event_type: str, data: Dict[str, Any]) -> Event:
        events = self._in_memory_events.get(aggregate_id, [])
        version = len(events) + 1
        
        event = Event(
            event_id=str(uuid4()),
            aggregate_id=aggregate_id,
            event_type=event_type,
            data=data,
            timestamp=datetime.utcnow(),
            version=version
        )
        
        if aggregate_id not in self._in_memory_events:
            self._in_memory_events[aggregate_id] = []
        self._in_memory_events[aggregate_id].append(event)
        
        asyncio.create_task(self._persist_event(event))
        
        await self._notify_subscribers(event)
        
        return event
    
    async def _persist_event(self, event: Event):
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO events (event_id, aggregate_id, event_type, data, timestamp, version)
                VALUES ($1, $2, $3, $4, $5, $6)
            ''', event.event_id, event.aggregate_id, event.event_type, 
                json.dumps(event.data), event.timestamp, event.version)
    
    async def get_events(self, aggregate_id: str, from_version: int = 0) -> List[Event]:
        events = self._in_memory_events.get(aggregate_id, [])
        return [e for e in events if e.version > from_version]
    
    async def create_snapshot(self, aggregate_id: str, state: Dict[str, Any]):
        events = self._in_memory_events.get(aggregate_id, [])
        version = len(events)
        
        snapshot = Snapshot(
            aggregate_id=aggregate_id,
            state=state.copy(),
            version=version,
            timestamp=datetime.utcnow()
        )
        
        self._snapshots[aggregate_id] = snapshot
        
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO snapshots (aggregate_id, state, version, timestamp)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (aggregate_id) DO UPDATE SET
                    state = $2, version = $3, timestamp = $4
            ''', aggregate_id, json.dumps(state), version, snapshot.timestamp)
    
    async def get_snapshot(self, aggregate_id: str) -> Optional[Snapshot]:
        return self._snapshots.get(aggregate_id)
    
    async def replay_events(self, aggregate_id: str, apply_fn: Callable[[Dict, Event], Dict]) -> Dict[str, Any]:
        state = {}
        
        snapshot = await self.get_snapshot(aggregate_id)
        if snapshot:
            state = snapshot.state
            from_version = snapshot.version
        else:
            from_version = 0
        
        events = await self.get_events(aggregate_id, from_version)
        
        for event in events:
            state = apply_fn(state, event)
        
        return state
    
    def subscribe(self, event_type: str, handler: Callable):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)
    
    async def _notify_subscribers(self, event: Event):
        handlers = self.subscribers.get(event.event_type, [])
        for handler in handlers:
            await handler(event)


class InventoryAggregate:
    def __init__(self, event_store: EventStore, aggregate_id: str):
        self.event_store = event_store
        self.aggregate_id = aggregate_id
        self._state: Dict[str, int] = {}
        self._version = 0
    
    async def load(self):
        self._state = await self.event_store.replay_events(
            self.aggregate_id, 
            self._apply_event
        )
    
    def _apply_event(self, state: Dict[str, Any], event: Event) -> Dict[str, Any]:
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
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        
        await self.event_store.append_event(
            self.aggregate_id,
            "StockAdded",
            {"item_id": item_id, "quantity": quantity}
        )
    
    async def remove_stock(self, item_id: str, quantity: int):
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        
        await self.load()
        current_stock = self._state.get(item_id, 0)
        
        if current_stock < quantity:
            raise ValueError(f"Insufficient stock: {current_stock} < {quantity}")
        
        await self.event_store.append_event(
            self.aggregate_id,
            "StockRemoved",
            {"item_id": item_id, "quantity": quantity}
        )
    
    async def get_stock(self, item_id: str) -> int:
        await self.load()
        return self._state.get(item_id, 0)


class SnapshotWorker:
    def __init__(self, event_store: EventStore, interval_seconds: int = 60):
        self.event_store = event_store
        self.interval = interval_seconds
        self._running = False
        self._aggregates_to_snapshot: List[str] = []
    
    def register_aggregate(self, aggregate_id: str):
        self._aggregates_to_snapshot.append(aggregate_id)
    
    async def start(self):
        self._running = True
        while self._running:
            await asyncio.sleep(self.interval)
            await self._create_snapshots()
    
    async def stop(self):
        self._running = False
    
    async def _create_snapshots(self):
        tasks = []
        for aggregate_id in self._aggregates_to_snapshot:
            tasks.append(self._snapshot_aggregate(aggregate_id))
        
        await asyncio.gather(*tasks)
    
    async def _snapshot_aggregate(self, aggregate_id: str):
        state = await self.event_store.replay_events(
            aggregate_id,
            lambda s, e: self._apply_event(s, e)
        )
        
        await self.event_store.create_snapshot(aggregate_id, state)
    
    def _apply_event(self, state: Dict[str, Any], event: Event) -> Dict[str, Any]:
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
        aggregate_id = event.aggregate_id
        
        if aggregate_id not in self._stock_levels:
            self._stock_levels[aggregate_id] = {}
        
        async with self._lock:
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
        return self._stock_levels.get(aggregate_id, {}).get(item_id, 0)