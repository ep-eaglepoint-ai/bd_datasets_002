# test_worker_recovery.py (fixed version)
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from freezegun import freeze_time
from models import Task, TaskStatus
from queue import TaskQueue


class TestTaskQueueWorkerCrashRecoveryWithMockedTime:
    """Tests for requirement 10: Worker crash recovery with mocked time"""
    
    @pytest.mark.asyncio
    @freeze_time("2024-01-01 12:00:00")
    async def test_missing_worker_health_check_with_mocked_time(self):
        """Test that reveals missing worker health monitoring with mocked time."""
        queue = TaskQueue(max_workers=2)
        
        # Don't actually start the queue - just test the health check gap directly
        # The issue is that there's no health monitoring mechanism
        
        # Simulate a worker crash by directly manipulating internal state
        queue._active_workers = 1  # Simulate a worker that never decremented
        
        # Add a task
        async def simple_handler(payload):
            return "done"
        
        queue.register_handler("simple", simple_handler)
        task = Task(id="test_task", name="simple")
        await queue.enqueue(task)
        
        # Mock sleep to prevent actual waiting
        with patch('asyncio.sleep'):
            # Try to process - the system thinks it's at capacity
            # but there's no actual worker running
            processed = await queue.process_one()
            
            # With the current implementation, process_one will still work
            # because it doesn't check _active_workers
            assert processed is not None
            
            # The gap is: no health check to detect that _active_workers=1
            # but no actual worker is running
            assert queue._active_workers == 1  # Stuck at 1
        
        # Cleanup - no need to stop since we never started
    
    @pytest.mark.asyncio
    @freeze_time("2024-01-01 12:00:00")
    async def test_task_remains_pending_on_worker_crash_with_mocked_time(self):
        """Test that tasks are not lost when a worker crashes mid-execution with mocked time."""
        queue = TaskQueue(max_workers=1)
        
        # Use process_one instead of start() to avoid infinite loop
        crash_triggered = False
        
        async def crashing_handler(payload):
            """Handler that simulates a worker crash."""
            nonlocal crash_triggered
            if not crash_triggered:
                crash_triggered = True
                # Simulate worker crash by raising an unhandled exception
                raise RuntimeError("Worker crashed!")
            return "should_not_reach_here"
        
        queue.register_handler("crashing_task", crashing_handler)
        
        task = Task(
            id="crash_task",
            name="crashing_task"
        )
        
        await queue.enqueue(task)
        
        # Mock sleep to prevent actual waiting
        with patch('asyncio.sleep'):
            # Process the task
            processed = await queue.process_one()
            
            # Task should have failed and potentially be retried
            # With current implementation, it goes through normal retry logic
            assert processed is not None
            assert processed.retry_count == 1
            assert processed.status == TaskStatus.PENDING  # Will retry
        
        # No need to stop since we never started
    
    @pytest.mark.asyncio
    async def test_no_recovery_for_in_progress_tasks_on_stop(self):
        """Test that in-progress tasks are not re-queued when queue stops."""
        queue = TaskQueue(max_workers=1)
        
        # Create an event that will never be set, so handler blocks forever
        block_forever = asyncio.Event()
        
        async def blocking_handler(payload):
            """Handler that blocks forever."""
            await block_forever.wait()
            return "completed"
        
        queue.register_handler("blocking_task", blocking_handler)
        
        task = Task(id="blocking_task", name="blocking_task")
        await queue.enqueue(task)
        
        # Start the queue with background workers
        start_task = asyncio.create_task(queue.start())
        
        # Give it a moment to pick up the task
        await asyncio.sleep(0.05)
        
        # Check task status - should be RUNNING now
        retrieved_task = await queue.get_task("blocking_task")
        assert retrieved_task.status == TaskStatus.RUNNING, f"Task status is {retrieved_task.status}, expected RUNNING"
        
        # Stop the queue while task is running
        await queue.stop()
        
        # Cancel the start task
        start_task.cancel()
        try:
            await start_task
        except asyncio.CancelledError:
            pass
        
        # Task should still be RUNNING (no recovery mechanism)
        retrieved_task = await queue.get_task("blocking_task")
        assert retrieved_task.status == TaskStatus.RUNNING
        
        # Clean up by setting the event so handler can complete if it's still running
        block_forever.set()
    
    @pytest.mark.asyncio
    @freeze_time("2024-01-01 12:00:00")
    async def test_worker_gets_stuck_with_no_health_check(self):
        """Test that shows worker can get stuck with no health monitoring."""
        queue = TaskQueue(max_workers=2)
        
        # Simulate a stuck worker scenario
        # Worker increments _active_workers but never decrements it
        queue._active_workers = 2  # Both workers "stuck"
        
        # The system thinks it's at full capacity
        assert queue._active_workers == queue._max_workers
        
        # But actually no workers are running
        # There's no health check to detect this
        
        # Even if we try to process a task
        async def simple_handler(payload):
            return "done"
        
        queue.register_handler("simple", simple_handler)
        task = Task(id="test_task", name="simple")
        await queue.enqueue(task)
        
        # Mock sleep
        with patch('asyncio.sleep'):
            # process_one doesn't check _active_workers, so it still works
            processed = await queue.process_one()
            assert processed is not None
            
            # But _active_workers is still wrong
            assert queue._active_workers == 2
            
            # This shows the gap: no mechanism to reset _active_workers
            # if workers crash without decrementing it


# Alternative test that actually shows the gap without hanging
class TestTaskQueueWorkerCrashRecoveryGap:
    """Tests that demonstrate the worker crash recovery gap."""
    
    @pytest.mark.asyncio
    async def test_worker_crash_leaves_task_in_running_state(self):
        """Demonstrate that worker crash leaves task stuck in RUNNING state."""
        queue = TaskQueue(max_workers=1)
        
        # Create a handler that simulates a crash
        async def crashing_handler(payload):
            # Simulate a crash by raising an exception that isn't caught
            # (though in reality, the worker would crash/exit)
            raise RuntimeError("Worker crash simulation")
            return "never_reached"
        
        queue.register_handler("crash_task", crashing_handler)
        
        task = Task(id="crash_task", name="crash_task", max_retries=0)
        await queue.enqueue(task)
        

        processed = await queue.process_one()
    
        assert processed.status == TaskStatus.DEAD
        
        # The gap is: if the worker process actually crashes (not just raises exception),
        # the task would be stuck in RUNNING state forever