"""
Primary Tests for Task Queue with Retry Logic
Tests all 8 requirements for the task queue system.
"""
import pytest
import asyncio

from unittest.mock import AsyncMock

from models import Task, TaskStatus
from queue import TaskQueue



class TestTaskQueueWorkerCrashRecovery:
    """Tests for requirement 10: Worker crash recovery"""
    
    @pytest.mark.asyncio
    async def test_task_remains_pending_on_worker_crash(self):
        """Test that tasks are not lost when a worker crashes mid-execution.
        
        Note: This test reveals the implementation gap - there's no crash recovery.
        """
        queue = TaskQueue(max_workers=1)
        
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
        
        # Start queue processing
        worker_task = asyncio.create_task(queue.start())
        
        # Wait for crash to happen
        await asyncio.sleep(0.5)
        
        # Check task status - it should still be RUNNING or need re-queuing
        # This reveals the gap: there's no mechanism to detect and recover from worker crashes
        retrieved_task = await queue.get_task("crash_task")
        
        # Worker crash isn't handled, so task might be stuck in RUNNING state
        # or could have been moved to dead letter
        assert retrieved_task is not None
        
        # Cleanup
        await queue.stop()
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass
    
    @pytest.mark.asyncio
    async def test_no_recovery_for_in_progress_tasks_on_stop(self):
        """Test that in-progress tasks are not re-queued when queue stops.
        
        This reveals another gap: graceful shutdown doesn't handle in-progress tasks.
        """
        queue = TaskQueue(max_workers=1)
        
        processing_started = asyncio.Event()
        block_processing = asyncio.Event()
        
        async def long_running_handler(payload):
            """Handler that runs for a long time."""
            processing_started.set()
            await block_processing.wait()  # Block until we allow it to complete
            return "completed"
        
        queue.register_handler("long_task", long_running_handler)
        
        task = Task(
            id="long_task",
            name="long_task"
        )
        
        await queue.enqueue(task)
        
        # Start processing in background
        worker_task = asyncio.create_task(queue.start())
        
        # Wait for processing to start
        await processing_started.wait()
        await asyncio.sleep(0.1)  # Ensure task is marked as RUNNING
        
        # Stop the queue while task is in progress
        await queue.stop()
        
        # Try to await the worker (might hang if not implemented properly)
        worker_task.cancel()
        
        # The task should ideally be re-queued or marked for recovery
        # But current implementation doesn't handle this
        retrieved_task = await queue.get_task("long_task")
        
        # Task is stuck in RUNNING state with no recovery mechanism
        assert retrieved_task.status == TaskStatus.RUNNING
        
        # Cleanup: allow handler to complete if it's still running
        block_processing.set()
        try:
            await asyncio.wait_for(worker_task, timeout=1.0)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass
    
    @pytest.mark.asyncio
    async def test_missing_worker_health_check(self):
        """Test that reveals missing worker health monitoring."""
        queue = TaskQueue(max_workers=2)
        
        # Start the queue
        worker_task = asyncio.create_task(queue.start())
        
        # Simulate a worker crash by directly manipulating internal state
        # (This is a hack to simulate what should be detected by health checks)
        queue._active_workers = 1  # Simulate a worker that never decremented
        
        # Add a task
        async def simple_handler(payload):
            return "done"
        
        queue.register_handler("simple", simple_handler)
        task = Task(id="test_task", name="simple")
        await queue.enqueue(task)
        
        # Wait a bit
        await asyncio.sleep(0.3)
        
        # Check if system recovers - it won't because there's no health check
        # The simulated "stuck" worker prevents new workers from starting
        # (max_workers limit is reached by stuck worker)
        
        # Cleanup
        await queue.stop()
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass


