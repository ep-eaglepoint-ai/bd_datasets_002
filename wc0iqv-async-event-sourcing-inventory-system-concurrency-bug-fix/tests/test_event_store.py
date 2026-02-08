"""
Test suite for Event Sourcing Inventory System Concurrency Bug Fix

These tests FAIL on repository_before (concurrency bugs)
These tests PASS on repository_after (with fixes)
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime
from typing import Dict, Any

# Import from the controller module (mapped via conftest.py)
from event_store import (
    Event,
    Snapshot,
    EventStore,
    InventoryAggregate,
    SnapshotWorker,
    ReadModelProjection,
)


class MockPool:
    """Mock asyncpg pool for testing without real database."""

    def __init__(self):
        self.executed = []

    def acquire(self):
        return MockConnection(self)


class MockConnection:
    """Mock database connection."""

    def __init__(self, pool):
        self.pool = pool

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def execute(self, query, *args):
        self.pool.executed.append((query, args))


@pytest.fixture
def mock_pool():
    """Create a mock database pool."""
    return MockPool()


@pytest.fixture
def event_store(mock_pool):
    """Create an EventStore with mock pool."""
    return EventStore(mock_pool)


@pytest.fixture
def inventory_aggregate(event_store):
    """Create an InventoryAggregate."""
    return InventoryAggregate(event_store, "warehouse-1")


@pytest.fixture
def read_model():
    """Create a ReadModelProjection."""
    return ReadModelProjection()


# =============================================================================
# Requirement 1: Stock levels must be accurate after concurrent operations
# =============================================================================

class TestStockLevelAccuracy:
    """Tests for Requirement 1: Accurate stock levels under concurrency."""

    @pytest.mark.asyncio
    async def test_concurrent_add_stock_accuracy(self, event_store):
        """100 concurrent add_stock operations must produce accurate sum."""
        aggregate = InventoryAggregate(event_store, "warehouse-concurrent-add")
        num_tasks = 100
        quantity_per_task = 10

        async def add_task():
            await aggregate.add_stock("item-1", quantity_per_task)

        # Run all tasks concurrently
        await asyncio.gather(*[add_task() for _ in range(num_tasks)])

        # Verify final stock
        final_stock = await aggregate.get_stock("item-1")
        expected = num_tasks * quantity_per_task  # 1000

        assert final_stock == expected, f"Expected {expected}, got {final_stock}"

    @pytest.mark.asyncio
    async def test_concurrent_mixed_operations_accuracy(self, event_store):
        """Interleaved add and remove operations must produce accurate result."""
        aggregate = InventoryAggregate(event_store, "warehouse-mixed")

        # Pre-add enough stock
        for _ in range(50):
            await aggregate.add_stock("item-1", 100)

        adds = 50
        removes = 30
        add_qty = 10
        remove_qty = 5

        async def add_task():
            await aggregate.add_stock("item-1", add_qty)

        async def remove_task():
            try:
                await aggregate.remove_stock("item-1", remove_qty)
            except ValueError:
                pass  # Expected for some removals

        tasks = [add_task() for _ in range(adds)] + [remove_task() for _ in range(removes)]
        await asyncio.gather(*tasks)

        # Calculate expected: initial 5000 + 50*10 adds - up to 30*5 removes
        final_stock = await aggregate.get_stock("item-1")

        # Get actual events to verify
        events = await event_store.get_events("warehouse-mixed")
        actual_adds = sum(1 for e in events if e.event_type == "StockAdded")
        actual_removes = sum(1 for e in events if e.event_type == "StockRemoved")

        expected = (50 * 100) + (actual_adds - 50) * add_qty - actual_removes * remove_qty
        assert final_stock == expected, f"Stock mismatch: expected {expected}, got {final_stock}"

    @pytest.mark.asyncio
    async def test_version_numbers_are_sequential(self, event_store):
        """Event versions must be sequential with no duplicates."""
        aggregate = InventoryAggregate(event_store, "warehouse-versions")
        num_tasks = 50

        async def add_task(i):
            await aggregate.add_stock(f"item-{i % 5}", 1)

        await asyncio.gather(*[add_task(i) for i in range(num_tasks)])

        events = await event_store.get_events("warehouse-versions")
        versions = [e.version for e in events]

        # Versions must be 1, 2, 3, ... n with no gaps or duplicates
        expected_versions = list(range(1, len(versions) + 1))
        assert sorted(versions) == expected_versions, f"Version sequence broken: {versions}"


# =============================================================================
# Requirement 2: Event replay must match read model
# =============================================================================

class TestEventReplayConsistency:
    """Tests for Requirement 2: Replay matches read model."""

    @pytest.mark.asyncio
    async def test_replay_matches_read_model_single_item(self, event_store):
        """Replay state must exactly match read model for single item."""
        read_model = ReadModelProjection()
        aggregate_id = "warehouse-replay-single"

        # Subscribe read model to events
        event_store.subscribe("StockAdded", read_model.handle_event)
        event_store.subscribe("StockRemoved", read_model.handle_event)

        aggregate = InventoryAggregate(event_store, aggregate_id)

        # Perform operations
        await aggregate.add_stock("item-1", 100)
        await aggregate.add_stock("item-1", 50)
        await aggregate.remove_stock("item-1", 30)

        # Wait for handlers to process
        await asyncio.sleep(0.1)

        # Replay events
        def apply_event(state, event):
            item_id = event.data["item_id"]
            qty = event.data["quantity"]
            if event.event_type == "StockAdded":
                state[item_id] = state.get(item_id, 0) + qty
            elif event.event_type == "StockRemoved":
                state[item_id] = state.get(item_id, 0) - qty
            return state

        replayed_state = await event_store.replay_events(aggregate_id, apply_event)
        read_model_value = read_model.get_stock(aggregate_id, "item-1")

        assert replayed_state.get("item-1", 0) == read_model_value, \
            f"Replay {replayed_state.get('item-1', 0)} != ReadModel {read_model_value}"

    @pytest.mark.asyncio
    async def test_replay_matches_read_model_concurrent(self, event_store):
        """Replay must match read model after concurrent operations."""
        read_model = ReadModelProjection()
        aggregate_id = "warehouse-replay-concurrent"

        event_store.subscribe("StockAdded", read_model.handle_event)
        event_store.subscribe("StockRemoved", read_model.handle_event)

        aggregate = InventoryAggregate(event_store, aggregate_id)

        # Pre-add stock
        await aggregate.add_stock("item-1", 1000)
        await asyncio.sleep(0.05)

        async def add_task():
            await aggregate.add_stock("item-1", 5)

        async def remove_task():
            try:
                await aggregate.remove_stock("item-1", 2)
            except ValueError:
                pass

        tasks = [add_task() for _ in range(20)] + [remove_task() for _ in range(10)]
        await asyncio.gather(*tasks)

        # Wait for handlers
        await asyncio.sleep(0.2)

        def apply_event(state, event):
            item_id = event.data["item_id"]
            qty = event.data["quantity"]
            if event.event_type == "StockAdded":
                state[item_id] = state.get(item_id, 0) + qty
            elif event.event_type == "StockRemoved":
                state[item_id] = state.get(item_id, 0) - qty
            return state

        replayed_state = await event_store.replay_events(aggregate_id, apply_event)
        read_model_value = read_model.get_stock(aggregate_id, "item-1")

        assert replayed_state.get("item-1", 0) == read_model_value, \
            f"Replay {replayed_state.get('item-1', 0)} != ReadModel {read_model_value}"


# =============================================================================
# Requirement 3: Snapshots must capture consistent point-in-time state
# =============================================================================

class TestSnapshotConsistency:
    """Tests for Requirement 3: Consistent snapshots."""

    @pytest.mark.asyncio
    async def test_snapshot_captures_exact_version(self, event_store):
        """Snapshot at version N must reflect exactly events 1 through N."""
        aggregate_id = "warehouse-snapshot-version"
        aggregate = InventoryAggregate(event_store, aggregate_id)

        # Add events
        await aggregate.add_stock("item-1", 100)
        await aggregate.add_stock("item-1", 50)
        await aggregate.add_stock("item-1", 25)

        # Create snapshot at current version
        def apply_event(state, event):
            item_id = event.data["item_id"]
            qty = event.data["quantity"]
            if event.event_type == "StockAdded":
                state[item_id] = state.get(item_id, 0) + qty
            elif event.event_type == "StockRemoved":
                state[item_id] = state.get(item_id, 0) - qty
            return state

        state = await event_store.replay_events(aggregate_id, apply_event)
        version = await event_store.get_current_version(aggregate_id)
        await event_store.create_snapshot(aggregate_id, state, version)

        snapshot = await event_store.get_snapshot(aggregate_id)

        assert snapshot is not None, "Snapshot should exist"
        assert snapshot.version == 3, f"Snapshot version should be 3, got {snapshot.version}"
        assert snapshot.state.get("item-1") == 175, \
            f"Snapshot state should be 175, got {snapshot.state.get('item-1')}"

    @pytest.mark.asyncio
    async def test_replay_from_snapshot_equals_full_replay(self, event_store):
        """Replaying from snapshot must equal replaying all events from version 0."""
        aggregate_id = "warehouse-snapshot-replay"
        aggregate = InventoryAggregate(event_store, aggregate_id)

        # Add initial events
        await aggregate.add_stock("item-1", 100)
        await aggregate.add_stock("item-1", 50)

        def apply_event(state, event):
            item_id = event.data["item_id"]
            qty = event.data["quantity"]
            if event.event_type == "StockAdded":
                state[item_id] = state.get(item_id, 0) + qty
            elif event.event_type == "StockRemoved":
                state[item_id] = state.get(item_id, 0) - qty
            return state

        # Create snapshot
        state = await event_store.replay_events(aggregate_id, apply_event)
        version = await event_store.get_current_version(aggregate_id)
        await event_store.create_snapshot(aggregate_id, state, version)

        # Add more events after snapshot
        await aggregate.add_stock("item-1", 25)
        await aggregate.remove_stock("item-1", 10)

        # Replay with snapshot
        state_with_snapshot = await event_store.replay_events(aggregate_id, apply_event)

        # Replay without snapshot (clear snapshot to force full replay)
        event_store._snapshots.clear()
        state_full_replay = await event_store.replay_events(aggregate_id, apply_event)

        assert state_with_snapshot == state_full_replay, \
            f"Snapshot replay {state_with_snapshot} != Full replay {state_full_replay}"

    @pytest.mark.asyncio
    async def test_snapshot_during_concurrent_writes(self, event_store):
        """Snapshot creation during concurrent writes must be consistent."""
        aggregate_id = "warehouse-snapshot-concurrent"
        aggregate = InventoryAggregate(event_store, aggregate_id)
        worker = SnapshotWorker(event_store, interval_seconds=1)
        worker.register_aggregate(aggregate_id)

        # Pre-add stock
        await aggregate.add_stock("item-1", 1000)

        async def add_task():
            for _ in range(10):
                await aggregate.add_stock("item-1", 1)
                await asyncio.sleep(0.01)

        async def snapshot_task():
            await asyncio.sleep(0.05)
            await worker._snapshot_aggregate(aggregate_id)

        # Run adds and snapshot concurrently
        await asyncio.gather(add_task(), snapshot_task())

        # Verify snapshot is consistent
        snapshot = await event_store.get_snapshot(aggregate_id)
        assert snapshot is not None, "Snapshot should exist"

        # Replay from version 0 to snapshot version
        def apply_event(state, event):
            item_id = event.data["item_id"]
            qty = event.data["quantity"]
            if event.event_type == "StockAdded":
                state[item_id] = state.get(item_id, 0) + qty
            elif event.event_type == "StockRemoved":
                state[item_id] = state.get(item_id, 0) - qty
            return state

        # Get all events up to snapshot version
        all_events = await event_store.get_events(aggregate_id)
        events_up_to_snapshot = [e for e in all_events if e.version <= snapshot.version]

        expected_state = {}
        for event in events_up_to_snapshot:
            expected_state = apply_event(expected_state, event)

        assert snapshot.state == expected_state, \
            f"Snapshot state {snapshot.state} != Expected {expected_state}"


# =============================================================================
# Requirement 4: Atomic stock removal with availability check
# =============================================================================

class TestAtomicStockRemoval:
    """Tests for Requirement 4: Atomic check-and-remove."""

    @pytest.mark.asyncio
    async def test_concurrent_remove_only_one_succeeds(self, event_store):
        """Two concurrent removes of 3 from 5 units: exactly one succeeds."""
        aggregate_id = "warehouse-atomic-remove"
        aggregate = InventoryAggregate(event_store, aggregate_id)

        # Add exactly 5 units
        await aggregate.add_stock("item-1", 5)

        results = {"success": 0, "failure": 0}

        async def remove_task():
            try:
                await aggregate.remove_stock("item-1", 3)
                results["success"] += 1
            except ValueError:
                results["failure"] += 1

        # Run two concurrent removals
        await asyncio.gather(remove_task(), remove_task())

        assert results["success"] == 1, f"Expected 1 success, got {results['success']}"
        assert results["failure"] == 1, f"Expected 1 failure, got {results['failure']}"

        # Verify final stock is exactly 2
        final_stock = await aggregate.get_stock("item-1")
        assert final_stock == 2, f"Expected final stock 2, got {final_stock}"

    @pytest.mark.asyncio
    async def test_concurrent_remove_insufficient_stock(self, event_store):
        """Concurrent removes must properly handle insufficient stock."""
        aggregate_id = "warehouse-atomic-insufficient"
        aggregate = InventoryAggregate(event_store, aggregate_id)

        # Add 10 units
        await aggregate.add_stock("item-1", 10)

        results = {"success": 0, "failure": 0}

        async def remove_task():
            try:
                await aggregate.remove_stock("item-1", 4)
                results["success"] += 1
            except ValueError:
                results["failure"] += 1

        # Run 5 concurrent removals of 4 each (total 20 needed, only 10 available)
        await asyncio.gather(*[remove_task() for _ in range(5)])

        # At most 2 should succeed (removing 8 of 10)
        assert results["success"] <= 2, f"Too many successes: {results['success']}"
        assert results["success"] >= 1, f"At least one should succeed"

        # Verify stock is non-negative
        final_stock = await aggregate.get_stock("item-1")
        assert final_stock >= 0, f"Stock went negative: {final_stock}"

    @pytest.mark.asyncio
    async def test_remove_stock_validation(self, event_store):
        """Remove must reject non-positive quantities."""
        aggregate = InventoryAggregate(event_store, "warehouse-validation")

        with pytest.raises(ValueError, match="Quantity must be positive"):
            await aggregate.remove_stock("item-1", 0)

        with pytest.raises(ValueError, match="Quantity must be positive"):
            await aggregate.remove_stock("item-1", -5)


# =============================================================================
# Requirement 5: 500 concurrent tasks without corruption
# =============================================================================

class TestHighConcurrency:
    """Tests for Requirement 5: 500 concurrent tasks."""

    @pytest.mark.asyncio
    async def test_500_concurrent_operations(self, event_store):
        """500 concurrent tasks must complete without corruption."""
        num_aggregates = 10
        tasks_per_aggregate = 50  # 500 total

        aggregates = [
            InventoryAggregate(event_store, f"warehouse-{i}")
            for i in range(num_aggregates)
        ]

        # Pre-add stock to all aggregates
        for agg in aggregates:
            await agg.add_stock("item-1", 10000)

        async def mixed_task(agg, task_id):
            if task_id % 3 == 0:
                await agg.add_stock("item-1", 10)
            else:
                try:
                    await agg.remove_stock("item-1", 5)
                except ValueError:
                    pass

        tasks = []
        for i, agg in enumerate(aggregates):
            for j in range(tasks_per_aggregate):
                tasks.append(mixed_task(agg, j))

        # Run all 500 tasks with timeout
        try:
            await asyncio.wait_for(
                asyncio.gather(*tasks),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            pytest.fail("Tasks hung - possible deadlock")

        # Verify all aggregates have valid state
        for i, agg in enumerate(aggregates):
            stock = await agg.get_stock("item-1")
            assert stock >= 0, f"Aggregate {i} has negative stock: {stock}"

            # Verify events are valid
            events = await event_store.get_events(f"warehouse-{i}")
            versions = [e.version for e in events]
            assert sorted(versions) == list(range(1, len(versions) + 1)), \
                f"Aggregate {i} has invalid versions"

    @pytest.mark.asyncio
    async def test_no_deadlock_under_load(self, event_store):
        """System must not deadlock under sustained load."""
        aggregate = InventoryAggregate(event_store, "warehouse-deadlock-test")

        # Pre-add stock
        await aggregate.add_stock("item-1", 100000)

        completed = {"count": 0}

        async def task():
            for _ in range(10):
                await aggregate.add_stock("item-1", 1)
                try:
                    await aggregate.remove_stock("item-1", 1)
                except ValueError:
                    pass
            completed["count"] += 1

        # Run 100 tasks with timeout
        try:
            await asyncio.wait_for(
                asyncio.gather(*[task() for _ in range(100)]),
                timeout=60.0
            )
        except asyncio.TimeoutError:
            pytest.fail(f"Deadlock detected - only {completed['count']}/100 tasks completed")

        assert completed["count"] == 100, f"Only {completed['count']}/100 tasks completed"


# =============================================================================
# Requirement 6: Snapshot must not block other aggregates
# =============================================================================

class TestSnapshotNonBlocking:
    """Tests for Requirement 6: Non-blocking snapshots."""

    @pytest.mark.asyncio
    async def test_snapshot_does_not_block_other_aggregates(self, event_store):
        """Snapshotting aggregate A must not block events on aggregate B."""
        aggregate_a = InventoryAggregate(event_store, "warehouse-A")
        aggregate_b = InventoryAggregate(event_store, "warehouse-B")
        worker = SnapshotWorker(event_store, interval_seconds=1)
        worker.register_aggregate("warehouse-A")

        # Add many events to A
        for _ in range(100):
            await aggregate_a.add_stock("item-1", 1)

        async def snapshot_a():
            await worker._snapshot_aggregate("warehouse-A")

        async def add_to_b():
            start = asyncio.get_event_loop().time()
            await aggregate_b.add_stock("item-1", 10)
            elapsed = asyncio.get_event_loop().time() - start
            return elapsed

        # Run snapshot and add concurrently
        _, elapsed = await asyncio.gather(snapshot_a(), add_to_b())

        # Add to B should complete quickly (< 100ms)
        assert elapsed < 0.1, f"Add to B took {elapsed*1000:.1f}ms, should be < 100ms"


# =============================================================================
# Requirement 7: Event handlers must not block persistence
# =============================================================================

class TestNonBlockingHandlers:
    """Tests for Requirement 7: Non-blocking event handlers."""

    @pytest.mark.asyncio
    async def test_slow_handler_does_not_block_persistence(self, event_store):
        """Slow handler must not block other events."""
        slow_handler_called = {"count": 0}
        fast_handler_called = {"count": 0}

        async def slow_handler(event):
            await asyncio.sleep(0.5)  # Simulate slow handler
            slow_handler_called["count"] += 1

        async def fast_handler(event):
            fast_handler_called["count"] += 1

        event_store.subscribe("StockAdded", slow_handler)
        event_store.subscribe("StockAdded", fast_handler)

        aggregate = InventoryAggregate(event_store, "warehouse-handler-test")

        # Add multiple events quickly
        start = asyncio.get_event_loop().time()
        for _ in range(5):
            await aggregate.add_stock("item-1", 10)
        elapsed = asyncio.get_event_loop().time() - start

        # Events should be appended quickly even with slow handler
        assert elapsed < 0.5, f"Events took {elapsed:.2f}s - handler is blocking"

        # Wait for handlers to complete
        await asyncio.sleep(1.0)

    @pytest.mark.asyncio
    async def test_handler_exception_does_not_break_system(self, event_store):
        """Handler exceptions must not break event processing."""
        async def failing_handler(event):
            raise RuntimeError("Handler failed!")

        async def good_handler(event):
            pass

        event_store.subscribe("StockAdded", failing_handler)
        event_store.subscribe("StockAdded", good_handler)

        aggregate = InventoryAggregate(event_store, "warehouse-exception-test")

        # Should not raise despite failing handler
        await aggregate.add_stock("item-1", 10)
        stock = await aggregate.get_stock("item-1")
        assert stock == 10, f"Event should still be recorded, got stock {stock}"


# =============================================================================
# Requirement 8: Read model queries must return consistent data
# =============================================================================

class TestReadModelConsistency:
    """Tests for Requirement 8: Consistent read model."""

    @pytest.mark.asyncio
    async def test_read_model_no_partial_updates(self, event_store):
        """Read model must never show partial updates."""
        read_model = ReadModelProjection()
        aggregate_id = "warehouse-read-consistency"

        event_store.subscribe("StockAdded", read_model.handle_event)
        event_store.subscribe("StockRemoved", read_model.handle_event)

        aggregate = InventoryAggregate(event_store, aggregate_id)

        # Add initial stock
        await aggregate.add_stock("item-1", 100)
        await asyncio.sleep(0.1)

        inconsistencies = []

        async def writer():
            for i in range(20):
                await aggregate.add_stock("item-1", 10)
                await asyncio.sleep(0.01)

        async def reader():
            for _ in range(50):
                stock = read_model.get_stock(aggregate_id, "item-1")
                # Stock should always be >= 100 (initial) and a multiple of 10 offset
                if stock < 100:
                    inconsistencies.append(f"Stock dropped below initial: {stock}")
                await asyncio.sleep(0.005)

        await asyncio.gather(writer(), reader())
        await asyncio.sleep(0.2)

        assert len(inconsistencies) == 0, f"Found inconsistencies: {inconsistencies}"


# =============================================================================
# Requirement 10: Backward compatibility
# =============================================================================

class TestBackwardCompatibility:
    """Tests for Requirement 10: Backward compatibility."""

    @pytest.mark.asyncio
    async def test_event_dataclass_unchanged(self, event_store):
        """Event dataclass must remain unchanged."""
        event = Event(
            event_id="test-id",
            aggregate_id="test-agg",
            event_type="StockAdded",
            data={"item_id": "item-1", "quantity": 10},
            timestamp=datetime.utcnow(),
            version=1
        )

        # All original fields must exist
        assert hasattr(event, "event_id")
        assert hasattr(event, "aggregate_id")
        assert hasattr(event, "event_type")
        assert hasattr(event, "data")
        assert hasattr(event, "timestamp")
        assert hasattr(event, "version")

    @pytest.mark.asyncio
    async def test_snapshot_dataclass_unchanged(self, event_store):
        """Snapshot dataclass must remain unchanged."""
        snapshot = Snapshot(
            aggregate_id="test-agg",
            state={"item-1": 100},
            version=5,
            timestamp=datetime.utcnow()
        )

        # All original fields must exist
        assert hasattr(snapshot, "aggregate_id")
        assert hasattr(snapshot, "state")
        assert hasattr(snapshot, "version")
        assert hasattr(snapshot, "timestamp")

    @pytest.mark.asyncio
    async def test_existing_api_compatibility(self, event_store):
        """Existing API calls must continue to work."""
        aggregate = InventoryAggregate(event_store, "warehouse-compat")

        # These calls must work without additional parameters
        await aggregate.add_stock("item-1", 100)
        await aggregate.remove_stock("item-1", 50)
        stock = await aggregate.get_stock("item-1")
        assert stock == 50

        # Event store methods must work
        events = await event_store.get_events("warehouse-compat")
        assert len(events) == 2

        def apply_event(state, event):
            item_id = event.data["item_id"]
            qty = event.data["quantity"]
            if event.event_type == "StockAdded":
                state[item_id] = state.get(item_id, 0) + qty
            elif event.event_type == "StockRemoved":
                state[item_id] = state.get(item_id, 0) - qty
            return state

        state = await event_store.replay_events("warehouse-compat", apply_event)
        assert state.get("item-1") == 50


# =============================================================================
# Integration Tests
# =============================================================================

class TestIntegration:
    """Full integration tests."""

    @pytest.mark.asyncio
    async def test_full_workflow_with_snapshots_and_replay(self, event_store):
        """Complete workflow: operations, snapshots, and replay verification."""
        read_model = ReadModelProjection()
        aggregate_id = "warehouse-integration"

        event_store.subscribe("StockAdded", read_model.handle_event)
        event_store.subscribe("StockRemoved", read_model.handle_event)

        aggregate = InventoryAggregate(event_store, aggregate_id)
        worker = SnapshotWorker(event_store, interval_seconds=1)
        worker.register_aggregate(aggregate_id)

        # Phase 1: Initial operations
        await aggregate.add_stock("item-1", 500)
        await aggregate.add_stock("item-2", 300)
        await asyncio.sleep(0.1)

        # Phase 2: Create snapshot
        await worker._snapshot_aggregate(aggregate_id)

        # Phase 3: More operations after snapshot
        await aggregate.remove_stock("item-1", 100)
        await aggregate.add_stock("item-2", 50)
        await asyncio.sleep(0.1)

        # Phase 4: Verify consistency
        def apply_event(state, event):
            item_id = event.data["item_id"]
            qty = event.data["quantity"]
            if event.event_type == "StockAdded":
                state[item_id] = state.get(item_id, 0) + qty
            elif event.event_type == "StockRemoved":
                state[item_id] = state.get(item_id, 0) - qty
            return state

        replayed_state = await event_store.replay_events(aggregate_id, apply_event)

        # Verify replay matches read model
        assert replayed_state.get("item-1") == read_model.get_stock(aggregate_id, "item-1")
        assert replayed_state.get("item-2") == read_model.get_stock(aggregate_id, "item-2")

        # Verify absolute values
        assert replayed_state.get("item-1") == 400
        assert replayed_state.get("item-2") == 350
