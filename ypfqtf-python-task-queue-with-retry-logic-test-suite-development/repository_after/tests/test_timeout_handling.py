"""
Primary Tests for Task Queue with Retry Logic
Tests all 8 requirements for the task queue system.
"""
import pytest
import asyncio
from unittest.mock import patch
from models import Task, TaskStatus
from queue import TaskQueue



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


