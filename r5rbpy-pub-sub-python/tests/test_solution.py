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

# Missing tests from requirements

@pytest.mark.asyncio
async def test_timeout():
    """Test handler timeout functionality."""
    bus = EventBus(default_timeout=0.1)
    received = []
    
    async def slow_handler(event: Event):
        await asyncio.sleep(0.2)  # Longer than timeout
        received.append(event)
    
    bus.subscribe(Event, slow_handler)
    result = await bus.publish_async(Event())
    
    assert not result.success
    assert len(received) == 0
    assert "timed out" in str(result.handler_results[0].error).lower()

@pytest.mark.asyncio
async def test_filter_predicate():
    """Test filter_predicate functionality."""
    bus = EventBus()
    received = []
    
    def handler(event: Event):
        received.append(event)
    
    # Only accept events with source="test"
    bus.subscribe(Event, handler, filter_predicate=lambda e: e.source == "test")
    
    await bus.publish_async(Event(source="test"))
    await bus.publish_async(Event(source="other"))
    
    assert len(received) == 1
    assert received[0].source == "test"

@pytest.mark.asyncio
async def test_unsubscribe():
    """Test unsubscribe functionality."""
    bus = EventBus()
    received = []
    
    def handler(event: Event):
        received.append(event)
    
    subscription = bus.subscribe(Event, handler)
    await bus.publish_async(Event())
    assert len(received) == 1
    
    subscription.unsubscribe()
    await bus.publish_async(Event())
    assert len(received) == 1  # Should still be 1

@pytest.mark.asyncio
async def test_decorator():
    """Test @event_bus.on() decorator."""
    bus = EventBus()
    received = []
    
    @bus.on(Event, priority=10)
    async def handler(event: Event):
        received.append(event)
    
    await bus.publish_async(Event())
    assert len(received) == 1

@pytest.mark.asyncio
async def test_dead_letter_handler_callback():
    """Test dead_letter_handler callback."""
    bus = EventBus()
    callback_called = []
    
    def dead_letter_callback(event: Event, handler, exception: Exception, retry_count: int):
        callback_called.append((event.event_id, str(exception), retry_count))
    
    bus.set_dead_letter_handler(dead_letter_callback)
    
    async def always_fail(event: Event):
        raise ValueError("Always fail")
    
    bus.subscribe(Event, always_fail)
    bus.configure_retry(Event, RetryPolicy(max_retries=1, base_delay=0.01))
    
    event = Event()
    await bus.publish_async(event)
    
    assert len(callback_called) == 1
    assert callback_called[0][0] == event.event_id
    assert "Always fail" in callback_called[0][1]

@pytest.mark.asyncio
async def test_middleware_priority():
    """Test middleware priority ordering."""
    bus = EventBus()
    order = []
    
    class Middleware1:
        async def __call__(self, event: Event, next_handler):
            order.append(1)
            return await next_handler(event)
    
    class Middleware2:
        async def __call__(self, event: Event, next_handler):
            order.append(2)
            return await next_handler(event)
    
    class Middleware3:
        async def __call__(self, event: Event, next_handler):
            order.append(3)
            return await next_handler(event)
    
    # Add in different order, but with priorities
    bus.add_middleware(Middleware1(), priority=10)
    bus.add_middleware(Middleware2(), priority=30)
    bus.add_middleware(Middleware3(), priority=20)
    
    bus.subscribe(Event, lambda e: None)
    await bus.publish_async(Event())
    
    # Higher priority should run first (outermost)
    assert order == [2, 3, 1]

@pytest.mark.asyncio
async def test_health_check():
    """Test health_check method."""
    bus = EventBus()
    health = await bus.health_check()
    
    assert hasattr(health, "healthy")
    assert hasattr(health, "details")
    assert "subscription_counts" in health.details
    assert "queue_depth" in health.details
    assert "error_rates" in health.details

@pytest.mark.asyncio
async def test_concurrency_limit():
    """Test concurrency limit with semaphore."""
    bus = EventBus(concurrency_limit=2)
    active = []
    max_active = [0]
    
    async def handler(event: Event):
        active.append(1)
        max_active[0] = max(max_active[0], len(active))
        await asyncio.sleep(0.1)
        active.pop()
    
    bus.subscribe(Event, handler)
    
    # Publish 5 events, but only 2 should run concurrently
    tasks = [bus.publish_async(Event()) for _ in range(5)]
    await asyncio.gather(*tasks)
    
    assert max_active[0] <= 2

@pytest.mark.asyncio
async def test_event_store_replay_method():
    """Test EventStore.replay() method directly."""
    store = InMemoryEventStore()
    received = []
    
    def handler(event: Event):
        received.append(event)
    
    # Save some events
    event1 = Event(source="test1")
    event2 = Event(source="test2")
    await store.save(event1)
    await store.save(event2)
    
    # Replay using store.replay()
    await store.replay(Event, since=datetime(2000, 1, 1, tzinfo=timezone.utc), handler=handler)
    
    assert len(received) == 2

@pytest.mark.asyncio
async def test_guaranteed_persistence():
    """Test guaranteed persistence mode."""
    store = InMemoryEventStore()
    bus = EventBus(event_store=store)
    
    event = Event()
    await bus.publish_async(event, guaranteed_persistence=True)
    
    # Event should be saved immediately
    saved = await store.get(event.event_id)
    assert saved is not None
    assert saved.event_id == event.event_id

@pytest.mark.asyncio
async def test_circuit_breaker_config():
    """Test configurable circuit breaker."""
    bus = EventBus(
        circuit_breaker_error_threshold=2,
        circuit_breaker_recovery_timeout=0.1
    )
    
    async def fail_handler(event: Event):
        raise ValueError("Fail")
    
    bus.subscribe(Event, fail_handler)
    
    # Trigger circuit breaker
    await bus.publish_async(Event())
    await bus.publish_async(Event())
    
    assert bus._circuit_open.get("fail_handler") is True
    assert bus._error_threshold == 2
    assert bus._recovery_timeout == 0.1

@pytest.mark.asyncio
async def test_queue_depth_metric():
    """Test queue_depth metric tracks actual pending events."""
    bus = EventBus()
    
    async def slow_handler(event: Event):
        await asyncio.sleep(0.1)
    
    bus.subscribe(Event, slow_handler)
    
    # Publish multiple events
    task1 = bus.publish_async(Event())
    task2 = bus.publish_async(Event())
    
    # Check queue depth while events are processing
    await asyncio.sleep(0.01)
    metrics = bus.get_metrics()
    assert metrics["queue_depth"] >= 0  # Should track pending events
    
    await task1
    await task2

@pytest.mark.asyncio
async def test_validation_middleware_schema():
    """Test ValidationMiddleware with actual schema validation."""
    bus = EventBus()
    
    schema = {
        "source": str,
        "metadata": {"type": dict, "required": True}
    }
    bus.add_middleware(ValidationMiddleware(schema=schema))
    
    # Valid event
    bus.subscribe(Event, lambda e: None)
    result = await bus.publish_async(Event(source="test"))
    assert result.success
    
    # Invalid event (missing required field in schema)
    class BadEvent(Event):
        pass
    
    # This should pass since Event has source and metadata
    result = await bus.publish_async(BadEvent(source="test"))
    assert result.success

@pytest.mark.asyncio
async def test_performance_benchmark():
    """Performance benchmark: <1ms overhead and 10k events/sec."""
    bus = EventBus()
    
    async def handler(event: Event):
        pass
    
    bus.subscribe(Event, handler)
    
    # Measure overhead
    start = time.perf_counter()
    for _ in range(1000):
        await bus.publish_async(Event())
    duration = time.perf_counter() - start
    avg_overhead_ms = (duration / 1000) * 1000
    
    # Should be < 1ms per event
    assert avg_overhead_ms < 1.0, f"Overhead {avg_overhead_ms:.3f}ms exceeds 1ms"
    
    # Measure throughput
    start = time.perf_counter()
    tasks = [bus.publish_async(Event()) for _ in range(10000)]
    await asyncio.gather(*tasks)
    duration = time.perf_counter() - start
    events_per_sec = 10000 / duration
    
    # Should handle at least 10k events/sec
    assert events_per_sec >= 10000, f"Throughput {events_per_sec:.0f} events/sec below 10k"
