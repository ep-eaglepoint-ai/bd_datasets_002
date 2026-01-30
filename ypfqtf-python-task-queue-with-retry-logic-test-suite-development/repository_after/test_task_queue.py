"""
Primary Tests for Task Queue with Retry Logic
Tests all 8 requirements for the task queue system.
"""
import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from freezegun import freeze_time

from models import Task, TaskStatus, Priority, DeadLetterEntry
from queue import TaskQueue


class TestRequirement1SuccessfulExecution:
    """Requirement 1: Successful task execution must complete and return results."""

    @pytest.fixture
    def queue(self):
        return TaskQueue(max_workers=1)

    @pytest.mark.asyncio
    async def test_successful_task_marks_completed(self, queue):
        """A registered handler that returns normally should mark the task as COMPLETED."""
        handler = AsyncMock(return_value={"result": "success"})
        queue.register_handler("test_task", handler)
        
        task = Task(id="task-1", name="test_task", payload={"key": "value"})
        await queue.enqueue(task)
        await queue.process_one()
        
        assert task.status == TaskStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_successful_task_stores_result(self, queue):
        """Handler result should be stored in task.result."""
        expected_result = {"data": [1, 2, 3], "status": "ok"}
        handler = AsyncMock(return_value=expected_result)
        queue.register_handler("test_task", handler)
        
        task = Task(id="task-2", name="test_task", payload={})
        await queue.enqueue(task)
        await queue.process_one()
        
        assert task.result == expected_result

    @pytest.mark.asyncio
    async def test_successful_task_sets_completed_at(self, queue):
        """completed_at timestamp should be set after successful execution."""
        handler = AsyncMock(return_value="done")
        queue.register_handler("test_task", handler)
        
        task = Task(id="task-3", name="test_task", payload={})
        assert task.completed_at is None
        
        await queue.enqueue(task)
        await queue.process_one()
        
        assert task.completed_at is not None
        assert isinstance(task.completed_at, datetime)

    @pytest.mark.asyncio
    async def test_handler_called_exactly_once(self, queue):
        """Handler must be called exactly once with the task's payload."""
        handler = AsyncMock(return_value="result")
        queue.register_handler("test_task", handler)
        
        payload = {"user_id": 123, "action": "process"}
        task = Task(id="task-4", name="test_task", payload=payload)
        await queue.enqueue(task)
        await queue.process_one()
        
        handler.assert_called_once_with(payload)

    @pytest.mark.asyncio
    async def test_started_at_timestamp_set(self, queue):
        """started_at timestamp should be set when task starts running."""
        handler = AsyncMock(return_value="done")
        queue.register_handler("test_task", handler)
        
        task = Task(id="task-5", name="test_task", payload={})
        assert task.started_at is None
        
        await queue.enqueue(task)
        await queue.process_one()
        
        assert task.started_at is not None


class TestRequirement2RetryWithBackoff:
    """Requirement 2: Failed tasks must trigger automatic retry with exponential backoff."""

    @pytest.fixture
    def queue(self):
        return TaskQueue(max_workers=1)

    @pytest.mark.asyncio
    async def test_failed_task_increments_retry_count(self, queue):
        """When handler raises exception, retry_count should increment."""
        handler = AsyncMock(side_effect=Exception("Test error"))
        queue.register_handler("failing_task", handler)
        
        task = Task(id="task-1", name="failing_task", payload={}, max_retries=5)
        await queue.enqueue(task)
        
        with patch.object(queue, '_calculate_backoff', return_value=0):
            await queue.process_one()
        
        assert task.retry_count == 1

    @pytest.mark.asyncio
    async def test_failed_task_records_error_in_history(self, queue):
        """Error should be recorded in retry_history."""
        error_msg = "Connection timeout"
        handler = AsyncMock(side_effect=Exception(error_msg))
        queue.register_handler("failing_task", handler)
        
        task = Task(id="task-2", name="failing_task", payload={}, max_retries=5)
        await queue.enqueue(task)
        
        with patch.object(queue, '_calculate_backoff', return_value=0):
            await queue.process_one()
        
        assert len(task.retry_history) == 1
        assert task.retry_history[0]["error"] == error_msg
        assert task.retry_history[0]["attempt"] == 1
        assert "timestamp" in task.retry_history[0]

    @pytest.mark.asyncio
    async def test_failed_task_returns_to_pending(self, queue):
        """After failure (before max retries), task should return to PENDING."""
        handler = AsyncMock(side_effect=Exception("Error"))
        queue.register_handler("failing_task", handler)
        
        task = Task(id="task-3", name="failing_task", payload={}, max_retries=5)
        await queue.enqueue(task)
        
        with patch.object(queue, '_calculate_backoff', return_value=0):
            await queue.process_one()
        
        assert task.status == TaskStatus.PENDING

    def test_backoff_calculation_exponential(self):
        """Backoff should be base_delay * 2^retry_count."""
        queue = TaskQueue()
        
        assert queue._calculate_backoff(0) == 1.0
        assert queue._calculate_backoff(1) == 2.0
        assert queue._calculate_backoff(2) == 4.0
        assert queue._calculate_backoff(3) == 8.0
        assert queue._calculate_backoff(4) == 16.0

    def test_backoff_capped_at_300_seconds(self):
        """Backoff should be capped at 300 seconds."""
        queue = TaskQueue()
        
        assert queue._calculate_backoff(10) == 300.0
        assert queue._calculate_backoff(20) == 300.0


class TestRequirement3DeadLetterQueue:
    """Requirement 3: Max retries reached must move task to dead letter queue."""

    @pytest.fixture
    def queue(self):
        return TaskQueue(max_workers=1)

    @pytest.mark.asyncio
    async def test_max_retries_moves_to_dead_letter(self, queue):
        """After exhausting max_retries, task should be in dead letter queue."""
        handler = AsyncMock(side_effect=Exception("Persistent error"))
        queue.register_handler("failing_task", handler)
        
        task = Task(id="task-1", name="failing_task", payload={}, max_retries=2)
        await queue.enqueue(task)
        
        with patch.object(queue, '_calculate_backoff', return_value=0):
            await queue.process_one()
            await queue.process_one()
        
        dlq = queue.get_dead_letter_queue()
        assert len(dlq) == 1
        assert dlq[0].task.id == "task-1"

    @pytest.mark.asyncio
    async def test_dead_task_status(self, queue):
        """Task status should become DEAD after max retries."""
        handler = AsyncMock(side_effect=Exception("Error"))
        queue.register_handler("failing_task", handler)
        
        task = Task(id="task-2", name="failing_task", payload={}, max_retries=1)
        await queue.enqueue(task)
        
        with patch.object(queue, '_calculate_backoff', return_value=0):
            await queue.process_one()
        
        assert task.status == TaskStatus.DEAD

    @pytest.mark.asyncio
    async def test_dead_letter_contains_full_retry_history(self, queue):
        """DeadLetterEntry should contain task with complete retry_history."""
        handler = AsyncMock(side_effect=Exception("Error"))
        queue.register_handler("failing_task", handler)
        
        task = Task(id="task-3", name="failing_task", payload={}, max_retries=3)
        await queue.enqueue(task)
        
        with patch.object(queue, '_calculate_backoff', return_value=0):
            await queue.process_one()
            await queue.process_one()
            await queue.process_one()
        
        dlq = queue.get_dead_letter_queue()
        assert len(dlq) == 1
        assert len(dlq[0].task.retry_history) == 3
        
        for i, entry in enumerate(dlq[0].task.retry_history):
            assert entry["attempt"] == i + 1
            assert "error" in entry
            assert "timestamp" in entry

    @pytest.mark.asyncio
    async def test_dead_letter_entry_has_reason(self, queue):
        """DeadLetterEntry should have a reason string."""
        handler = AsyncMock(side_effect=Exception("Specific error"))
        queue.register_handler("failing_task", handler)
        
        task = Task(id="task-4", name="failing_task", payload={}, max_retries=1)
        await queue.enqueue(task)
        
        with patch.object(queue, '_calculate_backoff', return_value=0):
            await queue.process_one()
        
        dlq = queue.get_dead_letter_queue()
        assert "Max retries exceeded" in dlq[0].reason


class TestRequirement4TaskTimeout:
    """Requirement 4: Task timeout must kill long-running handlers and trigger retry."""

    @pytest.fixture
    def queue(self):
        return TaskQueue(max_workers=1)

    @pytest.mark.asyncio
    async def test_timeout_triggers_retry(self, queue):
        """Handlers exceeding timeout should trigger retry."""
        async def slow_handler(payload):
            await asyncio.sleep(10)
            return "done"
        
        queue.register_handler("slow_task", slow_handler)
        
        task = Task(id="task-1", name="slow_task", payload={}, 
                   timeout_seconds=0.01, max_retries=5)
        await queue.enqueue(task)
        
        with patch.object(queue, '_calculate_backoff', return_value=0):
            await queue.process_one()
        
        assert task.retry_count == 1
        assert task.status == TaskStatus.PENDING

    @pytest.mark.asyncio
    async def test_timeout_error_message(self, queue):
        """Timeout should record 'Task timeout exceeded' error."""
        async def slow_handler(payload):
            await asyncio.sleep(10)
            return "done"
        
        queue.register_handler("slow_task", slow_handler)
        
        task = Task(id="task-2", name="slow_task", payload={}, 
                   timeout_seconds=0.01, max_retries=5)
        await queue.enqueue(task)
        
        with patch.object(queue, '_calculate_backoff', return_value=0):
            await queue.process_one()
        
        assert task.retry_history[0]["error"] == "Task timeout exceeded"

    @pytest.mark.asyncio
    async def test_timeout_follows_retry_logic(self, queue):
        """Timeout should follow same retry logic as other failures."""
        async def slow_handler(payload):
            await asyncio.sleep(10)
            return "done"
        
        queue.register_handler("slow_task", slow_handler)
        
        task = Task(id="task-3", name="slow_task", payload={}, 
                   timeout_seconds=0.01, max_retries=2)
        await queue.enqueue(task)
        
        with patch.object(queue, '_calculate_backoff', return_value=0):
            await queue.process_one()
            await queue.process_one()
        
        assert task.status == TaskStatus.DEAD
        dlq = queue.get_dead_letter_queue()
        assert len(dlq) == 1


class TestRequirement5PriorityOrdering:
    """Requirement 5: Priority ordering must be respected during processing."""

    @pytest.fixture
    def queue(self):
        return TaskQueue(max_workers=1)

    @pytest.mark.asyncio
    async def test_high_priority_before_normal(self, queue):
        """HIGH priority tasks must be processed before NORMAL."""
        processed_order = []
        
        async def tracking_handler(payload):
            processed_order.append(payload["name"])
            return "done"
        
        queue.register_handler("task", tracking_handler)
        
        normal_task = Task(id="normal-1", name="task", 
                          payload={"name": "normal"}, priority=Priority.NORMAL)
        high_task = Task(id="high-1", name="task", 
                        payload={"name": "high"}, priority=Priority.HIGH)
        
        await queue.enqueue(normal_task)
        await queue.enqueue(high_task)
        
        await queue.process_one()
        await queue.process_one()
        
        assert processed_order == ["high", "normal"]

    @pytest.mark.asyncio
    async def test_normal_priority_before_low(self, queue):
        """NORMAL priority tasks must be processed before LOW."""
        processed_order = []
        
        async def tracking_handler(payload):
            processed_order.append(payload["name"])
            return "done"
        
        queue.register_handler("task", tracking_handler)
        
        low_task = Task(id="low-1", name="task", 
                       payload={"name": "low"}, priority=Priority.LOW)
        normal_task = Task(id="normal-1", name="task", 
                          payload={"name": "normal"}, priority=Priority.NORMAL)
        
        await queue.enqueue(low_task)
        await queue.enqueue(normal_task)
        
        await queue.process_one()
        await queue.process_one()
        
        assert processed_order == ["normal", "low"]

    @pytest.mark.asyncio
    async def test_full_priority_ordering(self, queue):
        """Tasks should be processed HIGH -> NORMAL -> LOW."""
        processed_order = []
        
        async def tracking_handler(payload):
            processed_order.append(payload["priority"])
            return "done"
        
        queue.register_handler("task", tracking_handler)
        
        await queue.enqueue(Task(id="low-1", name="task", 
                                payload={"priority": "low"}, priority=Priority.LOW))
        await queue.enqueue(Task(id="high-1", name="task", 
                                payload={"priority": "high"}, priority=Priority.HIGH))
        await queue.enqueue(Task(id="normal-1", name="task", 
                                payload={"priority": "normal"}, priority=Priority.NORMAL))
        
        await queue.process_one()
        await queue.process_one()
        await queue.process_one()
        
        assert processed_order == ["high", "normal", "low"]

    @pytest.mark.asyncio
    async def test_fifo_within_same_priority(self, queue):
        """Tasks with equal priority should be processed in creation order (FIFO)."""
        processed_order = []
        
        async def tracking_handler(payload):
            processed_order.append(payload["order"])
            return "done"
        
        queue.register_handler("task", tracking_handler)
        
        base_time = datetime.utcnow()
        
        task1 = Task(id="first", name="task", payload={"order": 1}, 
                    priority=Priority.NORMAL, created_at=base_time)
        task2 = Task(id="second", name="task", payload={"order": 2}, 
                    priority=Priority.NORMAL, created_at=base_time + timedelta(seconds=1))
        task3 = Task(id="third", name="task", payload={"order": 3}, 
                    priority=Priority.NORMAL, created_at=base_time + timedelta(seconds=2))
        
        await queue.enqueue(task3)
        await queue.enqueue(task1)
        await queue.enqueue(task2)
        
        await queue.process_one()
        await queue.process_one()
        await queue.process_one()
        
        assert processed_order == [1, 2, 3]


class TestRequirement6CancelledTasks:
    """Requirement 6: Cancelled tasks must not be executed."""

    @pytest.fixture
    def queue(self):
        return TaskQueue(max_workers=1)

    @pytest.mark.asyncio
    async def test_cancel_sets_cancelled_status(self, queue):
        """Calling cancel() on a PENDING task should set status to CANCELLED."""
        task = Task(id="task-1", name="test_task", payload={})
        await queue.enqueue(task)
        
        result = await queue.cancel("task-1")
        
        assert result is True
        assert task.status == TaskStatus.CANCELLED

    @pytest.mark.asyncio
    async def test_cancelled_task_handler_not_called(self, queue):
        """Handler should never be invoked for cancelled tasks."""
        handler = AsyncMock(return_value="done")
        queue.register_handler("test_task", handler)
        
        task = Task(id="task-1", name="test_task", payload={})
        await queue.enqueue(task)
        await queue.cancel("task-1")
        
        result = await queue.process_one()
        
        handler.assert_not_called()

    @pytest.mark.asyncio
    async def test_cancel_nonexistent_task_returns_false(self, queue):
        """Cancelling a non-existent task should return False."""
        result = await queue.cancel("nonexistent")
        assert result is False

    @pytest.mark.asyncio
    async def test_cancel_running_task_returns_false(self, queue):
        """Cancelling a task that is already running should return False."""
        task = Task(id="task-1", name="test_task", payload={})
        task.status = TaskStatus.RUNNING
        queue._tasks["task-1"] = task
        
        result = await queue.cancel("task-1")
        assert result is False


class TestRequirement7IdempotentEnqueue:
    """Requirement 7: Duplicate task IDs must be handled idempotently."""

    @pytest.fixture
    def queue(self):
        return TaskQueue(max_workers=1)

    @pytest.mark.asyncio
    async def test_first_enqueue_succeeds(self, queue):
        """First enqueue with a task ID should succeed."""
        task = Task(id="unique-id", name="test_task", payload={"data": "original"})
        result = await queue.enqueue(task)
        
        assert result is True

    @pytest.mark.asyncio
    async def test_duplicate_enqueue_returns_false(self, queue):
        """Enqueue with existing task ID should return False."""
        task1 = Task(id="same-id", name="test_task", payload={"data": "first"})
        task2 = Task(id="same-id", name="test_task", payload={"data": "second"})
        
        result1 = await queue.enqueue(task1)
        result2 = await queue.enqueue(task2)
        
        assert result1 is True
        assert result2 is False

    @pytest.mark.asyncio
    async def test_duplicate_does_not_modify_existing(self, queue):
        """Duplicate enqueue should not modify the existing task."""
        task1 = Task(id="same-id", name="test_task", payload={"data": "original"})
        task2 = Task(id="same-id", name="test_task", payload={"data": "modified"})
        
        await queue.enqueue(task1)
        await queue.enqueue(task2)
        
        stored_task = await queue.get_task("same-id")
        assert stored_task.payload["data"] == "original"

    @pytest.mark.asyncio
    async def test_duplicate_not_added_to_queue(self, queue):
        """Duplicate should not be added to the processing queue."""
        handler = AsyncMock(return_value="done")
        queue.register_handler("test_task", handler)
        
        task1 = Task(id="same-id", name="test_task", payload={})
        task2 = Task(id="same-id", name="test_task", payload={})
        
        await queue.enqueue(task1)
        await queue.enqueue(task2)
        
        await queue.process_one()
        result = await queue.process_one()
        
        assert handler.call_count == 1
        assert result is None


class TestRequirement8BackoffOverflow:
    """Requirement 8: Backoff calculation must not overflow for high retry counts."""

    def test_backoff_high_retry_count_no_exception(self):
        """Computing backoff for retry_count=100 must not raise exceptions."""
        queue = TaskQueue()
        
        try:
            result = queue._calculate_backoff(100)
        except Exception as e:
            pytest.fail(f"Backoff calculation raised exception: {e}")

    def test_backoff_very_high_retry_count(self):
        """Computing backoff for retry_count=1000 must not raise exceptions."""
        queue = TaskQueue()
        
        try:
            result = queue._calculate_backoff(1000)
        except Exception as e:
            pytest.fail(f"Backoff calculation raised exception: {e}")

    def test_backoff_high_retry_capped_at_max(self):
        """High retry count backoff should be capped at 300 seconds."""
        queue = TaskQueue()
        
        result = queue._calculate_backoff(100)
        
        assert result == 300.0

    def test_backoff_not_infinity(self):
        """Backoff should not produce infinity."""
        queue = TaskQueue()
        import math
        
        result = queue._calculate_backoff(100)
        
        assert not math.isinf(result)

    def test_backoff_not_nan(self):
        """Backoff should not produce NaN."""
        queue = TaskQueue()
        import math
        
        result = queue._calculate_backoff(100)
        
        assert not math.isnan(result)

    def test_backoff_is_numeric(self):
        """Backoff should return a valid numeric value."""
        queue = TaskQueue()
        
        result = queue._calculate_backoff(100)
        
        assert isinstance(result, (int, float))
        assert result > 0
