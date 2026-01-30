"""
Primary Tests for Task Queue with Retry Logic
Tests all 8 requirements for the task queue system.
"""
import pytest
import asyncio
from unittest.mock import AsyncMock
from models import Task
from queue import TaskQueue


class TestRequirementConcurrencyWithMultipleWorkers:
    """Requirement 10: Task processing must be concurrent."""
    @pytest.fixture
    async def queue(self):
        """Fixture to create and cleanup a TaskQueue instance."""
        q = TaskQueue(max_workers=2)
        yield q
        await q.stop()
    
    @pytest.mark.asyncio
    async def test_multiple_workers_process_concurrently(self, queue):
        """Test that multiple workers can process tasks concurrently."""
        # Setup: Create tasks that take time to complete
        completion_order = []
        execution_times = {}
        
        async def slow_handler(payload):
            """Handler that takes time based on task ID."""
            task_id = payload.get("task_id")
            start_time = asyncio.get_event_loop().time()
            
            # Different sleep times for different tasks
            sleep_time = 0.5 if task_id == "fast" else 1.0
            await asyncio.sleep(sleep_time)
            
            end_time = asyncio.get_event_loop().time()
            execution_times[task_id] = {
                "start": start_time,
                "end": end_time,
                "duration": end_time - start_time
            }
            completion_order.append(task_id)
            return f"completed_{task_id}"
        
        # Register handler
        queue.register_handler("test_task", slow_handler)
        
        # Create two tasks
        task1 = Task(
            id="task1",
            name="test_task",
            payload={"task_id": "fast"}
        )
        task2 = Task(
            id="task2", 
            name="test_task",
            payload={"task_id": "slow"}
        )
        
        # Enqueue both tasks
        await queue.enqueue(task1)
        await queue.enqueue(task2)
        
        # Start queue in background
        worker_task = asyncio.create_task(queue.start())
        
        # Wait for both tasks to complete
        max_wait = 2.0  # Should complete in ~1 second (concurrently)
        start_time = asyncio.get_event_loop().time()
        
        while len(completion_order) < 2:
            if asyncio.get_event_loop().time() - start_time > max_wait:
                break
            await asyncio.sleep(0.1)
        
        # Stop the queue
        await queue.stop()
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass
        
        # Verify both tasks completed
        assert len(completion_order) == 2
        
        # Verify concurrent execution by checking overlap
        task1_exec = execution_times["fast"]
        task2_exec = execution_times["slow"]
        
        # Tasks should overlap if running concurrently
        # Fast task starts first, slow task starts shortly after
        # Both should complete around the same time
        assert task1_exec["duration"] < 0.6  # ~0.5 seconds
        assert task2_exec["duration"] < 1.1  # ~1.0 seconds
        
        # Total execution time should be less than sequential (1.5s)
        # Allow some overhead
        total_time = max(task1_exec["end"], task2_exec["end"]) - min(task1_exec["start"], task2_exec["start"])
        assert total_time < 1.3

    @pytest.mark.asyncio
    async def test_queue_handles_concurrent_enqueue_operations(self):
        """Test that enqueue operations are thread-safe."""
        queue = TaskQueue(max_workers=2)
        
        # Simulate concurrent enqueues
        async def concurrent_enqueue(task_id):
            task = Task(id=task_id, name="test_task")
            return await queue.enqueue(task)
        
        # Create many concurrent enqueue operations
        num_tasks = 100
        enqueue_tasks = [
            concurrent_enqueue(f"task_{i}") 
            for i in range(num_tasks)
        ]
        
        # Run them concurrently
        results = await asyncio.gather(*enqueue_tasks)
        
        # All should succeed (no duplicates due to idempotency)
        assert all(results)
        
        # Verify all tasks are in the queue
        assert len(queue._tasks) == num_tasks
        
        await queue.stop()


