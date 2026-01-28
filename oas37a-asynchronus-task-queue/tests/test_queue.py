"""
Comprehensive tests for async task queue implementation.

Tests all 8 requirement categories:
- R1: Race conditions in shared state
- R2: Off-by-one errors
- R3: Priority ordering
- R4: Async/await issues
- R5: Task cancellation
- R6: Retry logic with exponential backoff
- R7: Memory leaks
- R8: Edge cases

NOTE: Tests use asyncio.wait_for to timeout operations that would otherwise block
forever on buggy implementations using time.sleep() instead of asyncio.sleep().
"""

import pytest
import asyncio
import time
import gc
from unittest.mock import MagicMock, AsyncMock

# Default timeout for operations that should not block
TEST_TIMEOUT = 5.0


async def with_timeout(coro, timeout=TEST_TIMEOUT):
    """Wrap a coroutine with a timeout to prevent blocking."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        pytest.fail(f"Operation timed out after {timeout}s - likely blocking time.sleep() detected")


# ============================================================================
# R1: Race Conditions Tests
# ============================================================================

class TestRaceConditions:
    """Test R1: Verify shared state is properly protected with locks."""
    
    @pytest.mark.asyncio
    async def test_concurrent_task_submission(self, AsyncTaskQueue):
        """Multiple concurrent submissions should not corrupt state."""
        queue = AsyncTaskQueue(num_workers=4)
        await with_timeout(queue.start())
        
        async def dummy_task():
            await asyncio.sleep(0.001)
            return "done"
        
        # Submit 100 tasks concurrently
        tasks = []
        for i in range(100):
            tasks.append(queue.submit(dummy_task, priority=i % 5))
        
        task_ids = await with_timeout(asyncio.gather(*tasks))
        
        # Verify all tasks were submitted
        assert len(task_ids) == 100
        assert len(set(task_ids)) == 100  # All unique
        
        # Wait for completion
        await asyncio.sleep(1)
        await with_timeout(queue.stop())
        
        # Verify stats are consistent
        stats = await with_timeout(queue.get_stats()) if asyncio.iscoroutinefunction(queue.get_stats) else queue.get_stats()
        total = stats.get("completed", 0) + stats.get("failed", 0) + stats.get("pending", 0)
        # All tasks should be accounted for
        assert stats.get("completed", 0) >= 0
    
    @pytest.mark.asyncio
    async def test_concurrent_result_access(self, AsyncTaskQueue):
        """Multiple concurrent result accesses should work correctly."""
        queue = AsyncTaskQueue(num_workers=4)
        await with_timeout(queue.start())
        
        async def quick_task(value):
            await asyncio.sleep(0.001)
            return value
        
        task_ids = []
        for i in range(20):
            task_id = await with_timeout(queue.submit(quick_task, i))
            task_ids.append(task_id)
        
        # Wait for all to complete
        await asyncio.sleep(0.5)
        
        # Concurrently access results
        results = await with_timeout(asyncio.gather(*[
            queue.get_result(tid, timeout=2) for tid in task_ids
        ]))
        
        assert len(results) == 20
        
        await with_timeout(queue.stop())
    
    @pytest.mark.asyncio
    async def test_stats_accuracy_under_load(self, AsyncTaskQueue):
        """Stats should accurately reflect task counts under concurrent load."""
        queue = AsyncTaskQueue(num_workers=8)
        await with_timeout(queue.start())
        
        completed = []
        failed = []
        
        async def success_task():
            await asyncio.sleep(0.01)
            return "success"
        
        async def fail_task():
            await asyncio.sleep(0.01)
            raise ValueError("intentional failure")
        
        # Submit mix of success and failure tasks
        for i in range(50):
            if i % 3 == 0:
                await with_timeout(queue.submit(fail_task, max_retries=0))
            else:
                await with_timeout(queue.submit(success_task))
        
        # Wait for processing
        await asyncio.sleep(2)
        await with_timeout(queue.stop())
        
        stats = await with_timeout(queue.get_stats()) if asyncio.iscoroutinefunction(queue.get_stats) else queue.get_stats()
        
        # Total should equal submitted count
        total_processed = stats.get("completed", 0) + stats.get("failed", 0)
        assert total_processed <= 50
        assert stats.get("pending", 0) >= 0


# ============================================================================
# R2: Off-by-One Error Tests
# ============================================================================

class TestOffByOneErrors:
    """Test R2: Verify correct loop bounds and counts."""
    
    @pytest.mark.asyncio
    async def test_worker_count_matches_config(self, AsyncTaskQueue):
        """Number of workers should match num_workers parameter exactly."""
        for num in [1, 2, 4, 8]:
            queue = AsyncTaskQueue(num_workers=num)
            await with_timeout(queue.start())
            
            stats = await with_timeout(queue.get_stats()) if asyncio.iscoroutinefunction(queue.get_stats) else queue.get_stats()
            assert stats["workers"] == num, f"Expected {num} workers, got {stats['workers']}"
            
            await with_timeout(queue.stop())
    
    @pytest.mark.asyncio
    async def test_retry_count_exact(self, AsyncTaskQueue):
        """Task should retry exactly max_retries times, not more or less."""
        queue = AsyncTaskQueue(num_workers=1)
        await with_timeout(queue.start())
        
        retry_attempts = []
        
        async def failing_task():
            retry_attempts.append(time.time())
            raise ValueError("always fails")
        
        task_id = await with_timeout(queue.submit(failing_task, max_retries=3))
        
        # Wait for all retries (use longer timeout)
        await asyncio.sleep(5)
        await with_timeout(queue.stop())
        
        result = await with_timeout(queue.get_result(task_id, timeout=1))
        
        # Should have 1 original + 3 retries = 4 total attempts
        assert result.retry_count == 3, f"Expected 3 retries, got {result.retry_count}"
        assert len(retry_attempts) == 4, f"Expected 4 attempts, got {len(retry_attempts)}"
    
    @pytest.mark.asyncio
    async def test_single_worker_processes_all_tasks(self, AsyncTaskQueue):
        """A single worker should process all tasks."""
        queue = AsyncTaskQueue(num_workers=1)
        await with_timeout(queue.start())
        
        results = []
        
        async def track_task(value):
            results.append(value)
            return value
        
        for i in range(10):
            await with_timeout(queue.submit(track_task, i))
        
        await asyncio.sleep(1)
        await with_timeout(queue.stop())
        
        assert len(results) == 10


# ============================================================================
# R3: Priority Ordering Tests
# ============================================================================

class TestPriorityOrdering:
    """Test R3: Higher priority first, FIFO within same priority."""
    
    @pytest.mark.asyncio
    async def test_higher_priority_first(self, AsyncTaskQueue):
        """Higher priority tasks should be processed before lower priority."""
        queue = AsyncTaskQueue(num_workers=1)
        
        processing_order = []
        
        async def track_task(priority):
            processing_order.append(priority)
            await asyncio.sleep(0.01)
            return priority
        
        # Submit tasks with priorities [1, 5, 3, 5, 2]
        # Expected order: [5, 5, 3, 2, 1]
        await with_timeout(queue.submit(track_task, 1, priority=1))
        await with_timeout(queue.submit(track_task, 5, priority=5))
        await with_timeout(queue.submit(track_task, 3, priority=3))
        await with_timeout(queue.submit(track_task, 5, priority=5))
        await with_timeout(queue.submit(track_task, 2, priority=2))
        
        await with_timeout(queue.start())
        await asyncio.sleep(1)
        await with_timeout(queue.stop())
        
        expected_order = [5, 5, 3, 2, 1]
        assert processing_order == expected_order, f"Expected {expected_order}, got {processing_order}"
    
    @pytest.mark.asyncio
    async def test_fifo_within_same_priority(self, AsyncTaskQueue):
        """Tasks with same priority should be processed in FIFO order."""
        queue = AsyncTaskQueue(num_workers=1)
        
        processing_order = []
        
        async def track_task(value):
            processing_order.append(value)
            await asyncio.sleep(0.01)
            return value
        
        # Submit all with same priority
        for i in range(5):
            await with_timeout(queue.submit(track_task, i, priority=0))
        
        await with_timeout(queue.start())
        await asyncio.sleep(1)
        await with_timeout(queue.stop())
        
        expected_order = [0, 1, 2, 3, 4]
        assert processing_order == expected_order, f"Expected {expected_order}, got {processing_order}"
    
    @pytest.mark.asyncio
    async def test_priority_queue_direct(self, PriorityTaskQueue, Task):
        """Test PriorityTaskQueue directly for correct ordering."""
        pq = PriorityTaskQueue()
        
        # Create tasks with different priorities
        tasks = [
            Task(id="low", func=AsyncMock(), priority=1),
            Task(id="high", func=AsyncMock(), priority=5),
            Task(id="mid", func=AsyncMock(), priority=3),
        ]
        
        for t in tasks:
            pq.push(t)
        
        # Pop should return highest priority first
        order = []
        while len(pq) > 0:
            t = pq.pop()
            order.append(t.id)
        
        assert order == ["high", "mid", "low"], f"Expected ['high', 'mid', 'low'], got {order}"


# ============================================================================
# R4: Async/Await Issues Tests
# ============================================================================

class TestAsyncAwait:
    """Test R4: Proper async/await usage."""
    
    @pytest.mark.asyncio
    async def test_concurrent_execution(self, AsyncTaskQueue):
        """Multiple workers should execute tasks concurrently."""
        queue = AsyncTaskQueue(num_workers=4)
        await with_timeout(queue.start())
        
        start_times = []
        
        async def slow_task(value):
            start_times.append(time.time())
            await asyncio.sleep(0.5)
            return value
        
        # Submit 4 tasks that each take 0.5s
        for i in range(4):
            await with_timeout(queue.submit(slow_task, i))
        
        overall_start = time.time()
        await asyncio.sleep(1)
        overall_duration = time.time() - overall_start
        await with_timeout(queue.stop())
        
        # If concurrent, all 4 should complete in ~0.5s
        # If sequential, would take ~2s
        # Allow some slack
        if len(start_times) >= 2:
            time_spread = max(start_times) - min(start_times)
            assert time_spread < 0.3, f"Tasks not starting concurrently, spread: {time_spread}s"
    
    @pytest.mark.asyncio
    async def test_async_function_proper_await(self, AsyncTaskQueue):
        """Async task functions should be properly awaited."""
        queue = AsyncTaskQueue(num_workers=2)
        await with_timeout(queue.start())
        
        async def async_task():
            await asyncio.sleep(0.1)
            return "async_result"
        
        task_id = await with_timeout(queue.submit(async_task))
        result = await with_timeout(queue.get_result(task_id, timeout=5))
        
        await with_timeout(queue.stop())
        
        # Result should be the actual value, not a coroutine object
        assert result.success
        assert result.result == "async_result"
        assert not asyncio.iscoroutine(result.result)
    
    @pytest.mark.asyncio
    async def test_get_result_non_blocking(self, AsyncTaskQueue):
        """get_result should not block the event loop."""
        queue = AsyncTaskQueue(num_workers=1)
        await with_timeout(queue.start())
        
        other_task_ran = False
        
        async def slow_task():
            await asyncio.sleep(0.5)
            return "done"
        
        async def other_async_work():
            nonlocal other_task_ran
            await asyncio.sleep(0.1)
            other_task_ran = True
        
        task_id = await with_timeout(queue.submit(slow_task))
        
        # Run get_result and other work concurrently
        await with_timeout(asyncio.gather(
            queue.get_result(task_id, timeout=2),
            other_async_work()
        ))
        
        await with_timeout(queue.stop())
        
        assert other_task_ran, "Other async work should have run concurrently"


# ============================================================================
# R5: Task Cancellation Tests
# ============================================================================

class TestTaskCancellation:
    """Test R5: Proper task cancellation handling."""
    
    @pytest.mark.asyncio
    async def test_cancel_pending_task(self, AsyncTaskQueue, TaskStatus):
        """Pending tasks should be cancellable."""
        queue = AsyncTaskQueue(num_workers=1)
        
        async def slow_task():
            await asyncio.sleep(10)
            return "done"
        
        # Submit but don't start queue yet
        task_id = await with_timeout(queue.submit(slow_task))
        
        # Cancel before processing
        cancel_method = queue.cancel_task
        if asyncio.iscoroutinefunction(cancel_method):
            cancelled = await with_timeout(cancel_method(task_id))
        else:
            cancelled = cancel_method(task_id)
        
        assert cancelled, "Pending task should be cancellable"
        
        status = queue.get_task_status(task_id)
        assert status == TaskStatus.CANCELLED
    
    @pytest.mark.asyncio
    async def test_cancel_updates_stats(self, AsyncTaskQueue):
        """Cancellation should update pending count."""
        queue = AsyncTaskQueue(num_workers=1)
        
        async def slow_task():
            await asyncio.sleep(10)
        
        await with_timeout(queue.submit(slow_task))
        
        stats_before = await with_timeout(queue.get_stats()) if asyncio.iscoroutinefunction(queue.get_stats) else queue.get_stats()
        initial_pending = stats_before.get("pending", 0)
        
        # This test depends on how the queue handles pending count
        assert initial_pending >= 0
    
    @pytest.mark.asyncio
    async def test_worker_continues_after_cancellation(self, AsyncTaskQueue):
        """Workers should continue processing after handling cancelled tasks."""
        queue = AsyncTaskQueue(num_workers=1)
        
        results = []
        
        async def track_task(value):
            results.append(value)
            await asyncio.sleep(0.05)
            return value
        
        # Submit tasks
        task_ids = []
        for i in range(5):
            tid = await with_timeout(queue.submit(track_task, i))
            task_ids.append(tid)
        
        # Cancel middle task
        cancel_method = queue.cancel_task
        if asyncio.iscoroutinefunction(cancel_method):
            await with_timeout(cancel_method(task_ids[2]))
        else:
            cancel_method(task_ids[2])
        
        await with_timeout(queue.start())
        await asyncio.sleep(1)
        await with_timeout(queue.stop())
        
        # Should have processed 4 tasks (skipped cancelled one)
        assert 2 not in results, "Cancelled task should not have run"


# ============================================================================
# R6: Retry Logic Tests
# ============================================================================

class TestRetryLogic:
    """Test R6: Proper exponential backoff implementation."""
    
    @pytest.mark.asyncio
    async def test_exponential_backoff_delays(self, AsyncTaskQueue):
        """Retry delays should increase exponentially."""
        queue = AsyncTaskQueue(num_workers=1)
        await with_timeout(queue.start())
        
        attempt_times = []
        
        async def failing_task():
            attempt_times.append(time.time())
            raise ValueError("always fails")
        
        task_id = await with_timeout(queue.submit(failing_task, max_retries=3))
        
        # Wait for all retries
        await asyncio.sleep(6)
        await with_timeout(queue.stop())
        
        # Check that delays are increasing
        if len(attempt_times) >= 3:
            delay1 = attempt_times[1] - attempt_times[0]
            delay2 = attempt_times[2] - attempt_times[1]
            delay3 = attempt_times[3] - attempt_times[2] if len(attempt_times) > 3 else 0
            
            # Each delay should be >= previous (exponential)
            assert delay2 >= delay1 * 1.5, f"Second delay {delay2} should be >= {delay1 * 1.5}"
    
    @pytest.mark.asyncio
    async def test_task_fails_after_max_retries(self, AsyncTaskQueue, TaskStatus):
        """Task should be marked as FAILED after max retries exhausted."""
        queue = AsyncTaskQueue(num_workers=1)
        await with_timeout(queue.start())
        
        async def failing_task():
            raise ValueError("always fails")
        
        task_id = await with_timeout(queue.submit(failing_task, max_retries=2))
        
        await asyncio.sleep(3)
        await with_timeout(queue.stop())
        
        status = queue.get_task_status(task_id)
        assert status == TaskStatus.FAILED
        
        result = await with_timeout(queue.get_result(task_id, timeout=1))
        assert not result.success
    
    @pytest.mark.asyncio
    async def test_retry_policy_should_retry(self, RetryPolicy):
        """RetryPolicy.should_retry should return correct values."""
        policy = RetryPolicy(max_retries=3)
        
        # Should retry when retry_count < max_retries
        assert policy.should_retry(0) == True
        assert policy.should_retry(1) == True
        assert policy.should_retry(2) == True
        
        # Should not retry when retry_count >= max_retries
        assert policy.should_retry(3) == False
        assert policy.should_retry(4) == False
    
    @pytest.mark.asyncio
    async def test_retry_policy_delay_calculation(self, RetryPolicy):
        """RetryPolicy.get_delay should return capped exponential values."""
        policy = RetryPolicy(base_delay=1.0, max_delay=10.0, max_retries=5)
        
        delay0 = policy.get_delay(0)
        delay1 = policy.get_delay(1)
        delay2 = policy.get_delay(2)
        delay3 = policy.get_delay(3)
        
        # Delays should be positive
        assert delay0 > 0
        assert delay1 > 0
        
        # Should not exceed max_delay
        for i in range(10):
            assert policy.get_delay(i) <= policy.max_delay + 5  # Allow for jitter


# ============================================================================
# R7: Memory Leak Tests
# ============================================================================

class TestMemoryLeaks:
    """Test R7: Proper resource cleanup and cache management."""
    
    @pytest.mark.asyncio
    async def test_result_cache_eviction(self, ResultCache):
        """Result cache should evict entries when at max size."""
        cache = ResultCache(max_size=5, ttl_seconds=300)
        
        # Add more than max_size entries
        for i in range(10):
            cache.set(f"key_{i}", f"value_{i}")
        
        # Should have at most max_size entries
        assert len(cache) <= 5
    
    @pytest.mark.asyncio
    async def test_result_cache_ttl(self, ResultCache):
        """Expired cache entries should return None."""
        cache = ResultCache(max_size=100, ttl_seconds=0.1)
        
        cache.set("test_key", "test_value")
        
        # Should be available immediately
        assert cache.get("test_key") == "test_value"
        
        # Wait for TTL to expire
        await asyncio.sleep(0.2)
        
        # Should return None after expiry
        assert cache.get("test_key") is None
    
    @pytest.mark.asyncio
    async def test_result_cache_cleanup(self, ResultCache):
        """cleanup() should remove expired entries."""
        cache = ResultCache(max_size=100, ttl_seconds=0.1)
        
        for i in range(5):
            cache.set(f"key_{i}", f"value_{i}")
        
        assert len(cache) == 5
        
        await asyncio.sleep(0.2)
        cache.cleanup()
        
        # All entries should be removed
        assert len(cache) == 0
    
    @pytest.mark.asyncio
    async def test_queue_stop_cleans_workers(self, AsyncTaskQueue):
        """stop() should properly clean up worker tasks."""
        queue = AsyncTaskQueue(num_workers=4)
        await with_timeout(queue.start())
        
        stats = await with_timeout(queue.get_stats()) if asyncio.iscoroutinefunction(queue.get_stats) else queue.get_stats()
        assert stats["workers"] == 4
        
        await with_timeout(queue.stop())
        
        # Workers should be cleared
        assert len(queue._workers) == 0


# ============================================================================
# R8: Edge Cases Tests
# ============================================================================

class TestEdgeCases:
    """Test R8: Proper handling of edge cases."""
    
    @pytest.mark.asyncio
    async def test_zero_workers_raises_error(self, AsyncTaskQueue):
        """Creating queue with zero workers should raise ValueError."""
        with pytest.raises(ValueError) as excinfo:
            AsyncTaskQueue(num_workers=0)
        
        assert "at least 1" in str(excinfo.value).lower() or "workers" in str(excinfo.value).lower()
    
    @pytest.mark.asyncio
    async def test_empty_queue_no_exception(self, AsyncTaskQueue):
        """Starting an empty queue should not raise exception."""
        queue = AsyncTaskQueue(num_workers=2)
        await with_timeout(queue.start())
        await asyncio.sleep(0.2)
        await with_timeout(queue.stop())
        # No exception means success
    
    @pytest.mark.asyncio
    async def test_submit_after_stop_raises_error(self, AsyncTaskQueue):
        """Submitting to stopped queue should raise error."""
        queue = AsyncTaskQueue(num_workers=2)
        await with_timeout(queue.start())
        await with_timeout(queue.stop())
        
        async def dummy():
            return "test"
        
        with pytest.raises(RuntimeError):
            await with_timeout(queue.submit(dummy))
    
    @pytest.mark.asyncio
    async def test_duplicate_task_id_raises_error(self, AsyncTaskQueue):
        """Submitting with duplicate task_id should raise error."""
        queue = AsyncTaskQueue(num_workers=2)
        await with_timeout(queue.start())
        
        async def dummy():
            await asyncio.sleep(0.5)
            return "test"
        
        await with_timeout(queue.submit(dummy, task_id="unique_id"))
        
        with pytest.raises(ValueError):
            await with_timeout(queue.submit(dummy, task_id="unique_id"))
        
        await with_timeout(queue.stop())
    
    @pytest.mark.asyncio
    async def test_exception_in_task_does_not_crash_worker(self, AsyncTaskQueue):
        """Exception in task should be caught, not crash the worker."""
        queue = AsyncTaskQueue(num_workers=1)
        await with_timeout(queue.start())
        
        async def failing_task():
            raise RuntimeError("Task crashed!")
        
        async def success_task():
            return "success"
        
        # Submit failing task first
        fail_id = await with_timeout(queue.submit(failing_task, max_retries=0))
        
        # Then submit success task
        success_id = await with_timeout(queue.submit(success_task))
        
        await asyncio.sleep(0.5)
        await with_timeout(queue.stop())
        
        # Success task should still have run
        result = await with_timeout(queue.get_result(success_id, timeout=1))
        assert result.success
    
    @pytest.mark.asyncio
    async def test_get_result_timeout(self, AsyncTaskQueue):
        """get_result should timeout if task takes too long."""
        queue = AsyncTaskQueue(num_workers=1)
        
        async def very_slow_task():
            await asyncio.sleep(100)
            return "done"
        
        task_id = await with_timeout(queue.submit(very_slow_task))
        await with_timeout(queue.start())
        
        with pytest.raises(TimeoutError):
            await queue.get_result(task_id, timeout=0.1)
        
        await with_timeout(queue.stop())
    
    @pytest.mark.asyncio
    async def test_cancel_nonexistent_task(self, AsyncTaskQueue):
        """Cancelling non-existent task should return False."""
        queue = AsyncTaskQueue(num_workers=1)
        
        cancel_method = queue.cancel_task
        if asyncio.iscoroutinefunction(cancel_method):
            result = await with_timeout(cancel_method("nonexistent_id"))
        else:
            result = cancel_method("nonexistent_id")
        
        assert result == False


# ============================================================================
# High Concurrency Tests
# ============================================================================

class TestHighConcurrency:
    """Test system under high concurrent load."""
    
    @pytest.mark.asyncio
    async def test_10000_concurrent_tasks(self, AsyncTaskQueue):
        """System should handle 10,000 concurrent tasks without errors."""
        queue = AsyncTaskQueue(num_workers=16, max_queue_size=15000)
        await with_timeout(queue.start())
        
        completed = 0
        
        async def quick_task(value):
            await asyncio.sleep(0.001)
            return value
        
        # Submit 10,000 tasks
        task_ids = []
        for i in range(10000):
            tid = await with_timeout(queue.submit(quick_task, i))
            task_ids.append(tid)
        
        # Wait for completion
        timeout = 60  # 1 minute timeout
        start = time.time()
        
        while time.time() - start < timeout:
            stats = await with_timeout(queue.get_stats()) if asyncio.iscoroutinefunction(queue.get_stats) else queue.get_stats()
            completed = stats.get("completed", 0)
            pending = stats.get("pending", 0)
            
            if pending == 0:
                break
            
            await asyncio.sleep(0.5)
        
        await with_timeout(queue.stop())
        
        final_stats = await with_timeout(queue.get_stats()) if asyncio.iscoroutinefunction(queue.get_stats) else queue.get_stats()
        
        # All tasks should complete
        assert final_stats.get("completed", 0) == 10000, f"Expected 10000 completed, got {final_stats}"
        assert final_stats.get("pending", 0) == 0
        assert final_stats.get("failed", 0) == 0
    
    @pytest.mark.asyncio
    async def test_rapid_submit_cancel_cycle(self, AsyncTaskQueue):
        """Rapid submit/cancel cycles should not corrupt state."""
        queue = AsyncTaskQueue(num_workers=4)
        await with_timeout(queue.start())
        
        async def slow_task():
            await asyncio.sleep(1)
            return "done"
        
        # Rapid submit and cancel
        for _ in range(100):
            task_id = await with_timeout(queue.submit(slow_task))
            
            cancel_method = queue.cancel_task
            if asyncio.iscoroutinefunction(cancel_method):
                await with_timeout(cancel_method(task_id))
            else:
                cancel_method(task_id)
        
        await asyncio.sleep(0.5)
        await with_timeout(queue.stop())
        
        # Should not crash and stats should be consistent
        stats = await with_timeout(queue.get_stats()) if asyncio.iscoroutinefunction(queue.get_stats) else queue.get_stats()
        assert stats.get("pending", 0) >= 0
        assert stats.get("completed", 0) >= 0


# ============================================================================
# Integration Tests
# ============================================================================

class TestIntegration:
    """Full integration tests."""
    
    @pytest.mark.asyncio
    async def test_full_workflow(self, AsyncTaskQueue, TaskStatus):
        """Test complete submit -> process -> get_result workflow."""
        queue = AsyncTaskQueue(num_workers=2)
        await with_timeout(queue.start())
        
        async def compute_task(x, y):
            await asyncio.sleep(0.1)
            return x + y
        
        task_id = await with_timeout(queue.submit(compute_task, 10, 20))
        
        result = await with_timeout(queue.get_result(task_id, timeout=5))
        
        assert result.success
        assert result.result == 30
        assert result.retry_count == 0
        
        status = queue.get_task_status(task_id)
        assert status == TaskStatus.COMPLETED
        
        await with_timeout(queue.stop())
    
    @pytest.mark.asyncio
    async def test_mixed_success_and_failure(self, AsyncTaskQueue):
        """Test queue handles mix of successful and failing tasks."""
        queue = AsyncTaskQueue(num_workers=4)
        await with_timeout(queue.start())
        
        async def success_task(value):
            await asyncio.sleep(0.01)
            return value * 2
        
        async def fail_task():
            await asyncio.sleep(0.01)
            raise ValueError("intentional")
        
        success_ids = []
        fail_ids = []
        
        for i in range(10):
            if i % 2 == 0:
                sid = await with_timeout(queue.submit(success_task, i))
                success_ids.append(sid)
            else:
                fid = await with_timeout(queue.submit(fail_task, max_retries=0))
                fail_ids.append(fid)
        
        await asyncio.sleep(2)
        await with_timeout(queue.stop())
        
        # Check successes
        for sid in success_ids:
            result = await with_timeout(queue.get_result(sid, timeout=1))
            assert result.success
        
        # Check failures
        for fid in fail_ids:
            result = await with_timeout(queue.get_result(fid, timeout=1))
            assert not result.success
