import asyncio
import pytest
import time
from datetime import datetime, timezone
from repository_after import (
    Event, UserCreatedEvent, UserEvent, EventBus, 
    LoggingMiddleware, TimingMiddleware, ValidationMiddleware,
    RetryPolicy, InMemoryEventStore, EventResult
)

@pytest.mark.asyncio
async def test_basic_publish():
    bus = EventBus()
    received = []
    
    async def handler(event: Event):
        received.append(event)
        return "ok"
    
    bus.subscribe(Event, handler)
    event = Event(source="test")
    result = await bus.publish_async(event)
    
    assert result.success
    assert len(received) == 1
    assert received[0].event_id == event.event_id
    assert result.handler_results[0].result == "ok"

@pytest.mark.asyncio
async def test_sync_handler():
    bus = EventBus()
    received = []
    
    def sync_handler(event: Event):
        received.append(event)
        return "sync_ok"
    
    bus.subscribe(Event, sync_handler)
    event = Event(source="test")
    result = await bus.publish_async(event)
    
    assert result.success
    assert len(received) == 1
    assert result.handler_results[0].result == "sync_ok"

@pytest.mark.asyncio
async def test_priority_ordering():
    bus = EventBus()
    order = []
    
    async def h1(event: Event):
        order.append(1)
    
    async def h2(event: Event):
        order.append(2)
    
    async def h3(event: Event):
        order.append(3)
    
    bus.subscribe(Event, h1, priority=10)
    bus.subscribe(Event, h2, priority=30)
    bus.subscribe(Event, h3, priority=20)
    
    await bus.publish_async(Event())
    assert order == [2, 3, 1]

@pytest.mark.asyncio
async def test_wildcard_subscription():
    bus = EventBus()
    user_events = []
    all_events = []
    
    bus.subscribe(UserEvent, lambda e: user_events.append(e))
    bus.subscribe(Event, lambda e: all_events.append(e))
    
    event = UserCreatedEvent(user_id="123", email="test@example.com")
    await bus.publish_async(event)
    
    assert len(user_events) == 1
    assert len(all_events) == 1
    
    await bus.publish_async(Event())
    assert len(user_events) == 1 # Still 1
    assert len(all_events) == 2

@pytest.mark.asyncio
async def test_middleware():
    bus = EventBus()
    bus.add_middleware(TimingMiddleware())
    
    async def handler(event: Event):
        await asyncio.sleep(0.01)
    
    bus.subscribe(Event, handler)
    event = Event()
    await bus.publish_async(event)
    
    assert "dispatch_duration_ms" in event.metadata
    assert event.metadata["dispatch_duration_ms"] >= 10

@pytest.mark.asyncio
async def test_retry_policy():
    bus = EventBus()
    attempts = 0
    
    async def failing_handler(event: Event):
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise ValueError("Fail")
        return "success"
    
    bus.subscribe(Event, failing_handler)
    bus.configure_retry(Event, RetryPolicy(max_retries=3, base_delay=0.01))
    
    result = await bus.publish_async(Event())
    assert result.success
    assert attempts == 3
    assert result.handler_results[0].retry_count == 2

@pytest.mark.asyncio
async def test_dead_letter_queue():
    bus = EventBus()
    
    async def always_fail(event: Event):
        raise ValueError("Always fail")
    
    bus.subscribe(Event, always_fail)
    bus.configure_retry(Event, RetryPolicy(max_retries=1, base_delay=0.01))
    
    result = await bus.publish_async(Event())
    assert not result.success
    assert bus._dead_letter_queue.get_all()[0].event.event_id == result.event.event_id

@pytest.mark.asyncio
async def test_circuit_breaker():
    bus = EventBus()
    # Mock some properties to trigger circuit breaker faster
    bus._error_threshold = 2
    
    async def fail_then_ok(event: Event):
        raise ValueError("Fail")
    
    bus.subscribe(Event, fail_then_ok)
    
    # First fail
    await bus.publish_async(Event())
    # Second fail -> Opens circuit
    await bus.publish_async(Event())
    
    assert bus._circuit_open.get("fail_then_ok") == True
    
    # Third call should fail immediately without calling handler
    result = await bus.publish_async(Event())
    assert str(result.handler_results[0].error) == "Circuit breaker open"

@pytest.mark.asyncio
async def test_event_store_replay():
    store = InMemoryEventStore()
    bus = EventBus(event_store=store)
    
    received = []
    bus.subscribe(UserCreatedEvent, lambda e: received.append(e))
    
    event = UserCreatedEvent(user_id="1", email="1@test.com")
    await bus.publish_async(event)
    
    # Wait for fire-and-forget store save
    await asyncio.sleep(0.1)
    
    # Replay
    received.clear()
    await bus.replay_events(UserCreatedEvent, since=datetime(2000, 1, 1, tzinfo=timezone.utc))
    assert len(received) == 1
    assert received[0].user_id == "1"

def test_sync_publish():
    bus = EventBus()
    received = []
    
    def handler(event: Event):
        received.append(event)
    
    bus.subscribe(Event, handler)
    bus.publish(Event())
    assert len(received) == 1

def test_to_from_dict():
    event = UserCreatedEvent(user_id="123", email="test@test.com", source="src")
    d = event.to_dict()
    assert d["user_id"] == "123"
    assert d["__type__"] == "UserCreatedEvent"
    
    event2 = UserCreatedEvent.from_dict(d)
    assert event2.user_id == "123"
    assert event2.email == "test@test.com"
    assert event2.source == "src"
    assert isinstance(event2.timestamp, datetime)

@pytest.mark.asyncio
async def test_development_mode_validation():
    bus = EventBus(development_mode=True)
    
    # Invalid event type for subscription
    with pytest.raises(TypeError):
        bus.subscribe(str, lambda x: None) # type: ignore
        
    # Invalid handler signature
    with pytest.raises(TypeError):
        bus.subscribe(Event, lambda: None) # type: ignore
        
    # Invalid event instance for publishing
    with pytest.raises(TypeError):
        await bus.publish_async("not an event") # type: ignore

@pytest.mark.asyncio
async def test_middleware_short_circuit():
    bus = EventBus()
    
    class BlockMiddleware:
        async def __call__(self, event: Event, next_handler):
            return EventResult(success=False, event=event, handler_results=[], errors=[Exception("Blocked")])
            
    bus.add_middleware(BlockMiddleware())
    
    received = False
    bus.subscribe(Event, lambda e: exec("nonlocal received; received = True"))
    
    result = await bus.publish_async(Event())
    assert not result.success
    assert not received

@pytest.mark.asyncio
async def test_middleware_transformation():
    bus = EventBus()
    
    class TransformMiddleware:
        async def __call__(self, event: Event, next_handler):
            event.metadata["transformed"] = True
            return await next_handler(event)
            
    bus.add_middleware(TransformMiddleware())
    
    received_metadata = {}
    bus.subscribe(Event, lambda e: received_metadata.update(e.metadata))
    
    await bus.publish_async(Event())
    assert received_metadata.get("transformed") is True

@pytest.mark.asyncio
async def test_circuit_breaker_recovery():
    bus = EventBus()
    bus._error_threshold = 1
    bus._recovery_timeout = 0.1
    
    async def fail_once(event: Event):
        if event.metadata.get("should_fail"):
            raise ValueError("Fail")
        return "ok"
        
    bus.subscribe(Event, fail_once)
    
    # Trip it
    await bus.publish_async(Event(metadata={"should_fail": True}))
    assert bus._circuit_open.get("fail_once") is True
    
    # Call while open
    res = await bus.publish_async(Event())
    assert not res.success
    
    # Wait for recovery
    await asyncio.sleep(0.15)
    
    # Should work now
    res = await bus.publish_async(Event())
    assert res.success
    assert bus._circuit_open.get("fail_once") is False

@pytest.mark.asyncio
async def test_dead_letter_replay():
    bus = EventBus()
    received = []
    
    async def handler(event):
        received.append(event)
    
    bus.subscribe(Event, handler)
    event = Event()
    bus._dead_letter_queue.add(event, "test_handler", Exception("error"), 1)
    
    await bus._dead_letter_queue.replay(bus.publish_async)
    assert len(received) == 1
    assert received[0].event_id == event.event_id
    assert len(bus._dead_letter_queue.get_all()) == 0

@pytest.mark.asyncio
async def test_restore_from_snapshot():
    store = InMemoryEventStore()
    bus = EventBus(event_store=store)
    
    # Save an event
    event = Event()
    await bus.publish_async(event)
    await asyncio.sleep(0.1) # Wait for store
    
    # Restore (generic implementation just replays events since timestamp)
    received = []
    bus.subscribe(Event, lambda e: received.append(e))
    
    # Snapshot (mock)
    from repository_after.storage import Snapshot
    snapshot = Snapshot(timestamp=datetime.now(timezone.utc), state={}, last_event_id=event.event_id)
    
    await bus.restore_from_snapshot(snapshot, replay_since=datetime(2000, 1, 1, tzinfo=timezone.utc))
    assert len(received) == 1
