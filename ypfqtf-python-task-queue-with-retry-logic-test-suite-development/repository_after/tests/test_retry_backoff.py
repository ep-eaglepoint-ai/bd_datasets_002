"""
Primary Tests for Task Queue with Retry Logic
Tests all 8 requirements for the task queue system.
"""
import pytest
from unittest.mock import AsyncMock
from queue import TaskQueue
from models import Task, TaskStatus
from unittest.mock import patch



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


