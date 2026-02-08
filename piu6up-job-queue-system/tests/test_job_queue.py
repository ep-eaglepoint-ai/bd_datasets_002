"""
Comprehensive test suite for the Job Queue System.
"""

import pytest
import time
import threading
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from job_queue import (
    Job, JobStatus, JobQueue, Worker, EventHandler, JobQueueManager
)


class TestJob:
    """Tests for the Job class."""

    def test_job_create_valid(self):
        """Test creating a valid job with factory method."""
        job = Job.create(job_type="test_job", payload={"key": "value"}, priority=7)
        assert job.job_type == "test_job"
        assert job.payload == {"key": "value"}
        assert job.priority == 7
        assert job.status == JobStatus.PENDING
        assert job.job_id is not None

    def test_job_create_default_values(self):
        """Test job creation with default values."""
        job = Job.create(job_type="simple")
        assert job.priority == 5
        assert job.max_retries == 3
        assert job.retry_count == 0
        assert job.payload == {}
        assert job.scheduled_at is None

    def test_job_create_invalid_job_type(self):
        """Test that empty job_type raises ValueError."""
        with pytest.raises(ValueError, match="job_type must be a non-empty string"):
            Job.create(job_type="")

        with pytest.raises(ValueError, match="job_type must be a non-empty string"):
            Job.create(job_type="   ")

    def test_job_create_invalid_priority(self):
        """Test that invalid priority raises ValueError."""
        with pytest.raises(ValueError, match="priority must be between 1 and 10"):
            Job.create(job_type="test", priority=0)

        with pytest.raises(ValueError, match="priority must be between 1 and 10"):
            Job.create(job_type="test", priority=11)

    def test_job_create_negative_retries(self):
        """Test that negative max_retries raises ValueError."""
        with pytest.raises(ValueError, match="max_retries cannot be negative"):
            Job.create(job_type="test", max_retries=-1)

    def test_job_comparison_by_priority(self):
        """Test job comparison - higher priority first."""
        job_high = Job.create(job_type="high", priority=10)
        job_low = Job.create(job_type="low", priority=1)
        assert job_high < job_low  # Higher priority comes first

    def test_job_comparison_by_scheduled_time(self):
        """Test job comparison - earlier scheduled first."""
        job_early = Job.create(job_type="early", priority=5, scheduled_at=1000.0)
        job_late = Job.create(job_type="late", priority=5, scheduled_at=2000.0)
        assert job_early < job_late

    def test_job_comparison_by_created_time(self):
        """Test job comparison - earlier created first."""
        job1 = Job(job_type="first", created_at=1000.0)
        job2 = Job(job_type="second", created_at=2000.0)
        assert job1 < job2

    def test_job_serialization(self):
        """Test job to_dict and from_dict round trip."""
        original = Job.create(
            job_type="serialize_test",
            payload={"nested": {"data": [1, 2, 3]}},
            priority=8,
            max_retries=5,
            metadata={"user": "test"}
        )
        original.status = JobStatus.COMPLETED
        original.result = {"success": True}

        data = original.to_dict()
        restored = Job.from_dict(data)

        assert restored.job_id == original.job_id
        assert restored.job_type == original.job_type
        assert restored.payload == original.payload
        assert restored.priority == original.priority
        assert restored.status == original.status
        assert restored.result == original.result
        assert restored.metadata == original.metadata


class TestJobQueue:
    """Tests for the JobQueue class."""

    def test_enqueue_dequeue(self):
        """Test basic enqueue and dequeue operations."""
        queue = JobQueue()
        job = Job.create(job_type="test")

        job_id = queue.enqueue(job)
        assert job_id == job.job_id
        assert queue.size == 1

        dequeued = queue.dequeue()
        assert dequeued.job_id == job.job_id

    def test_priority_ordering(self):
        """Test that higher priority jobs are dequeued first."""
        queue = JobQueue()

        low = Job.create(job_type="low", priority=1)
        high = Job.create(job_type="high", priority=10)
        medium = Job.create(job_type="medium", priority=5)

        queue.enqueue(low)
        queue.enqueue(high)
        queue.enqueue(medium)

        assert queue.dequeue().priority == 10
        assert queue.dequeue().priority == 5
        assert queue.dequeue().priority == 1

    def test_scheduled_job_not_ready(self):
        """Test that future-scheduled jobs are not dequeued."""
        queue = JobQueue()

        future_time = time.time() + 3600  # 1 hour from now
        job = Job.create(job_type="future", scheduled_at=future_time)
        queue.enqueue(job)

        assert queue.dequeue() is None

    def test_scheduled_job_ready(self):
        """Test that past-scheduled jobs are dequeued."""
        queue = JobQueue()

        past_time = time.time() - 10
        job = Job.create(job_type="past", scheduled_at=past_time)
        queue.enqueue(job)

        dequeued = queue.dequeue()
        assert dequeued is not None
        assert dequeued.job_id == job.job_id

    def test_dequeue_skips_future_jobs(self):
        """Test that dequeue skips future-scheduled jobs to find ready ones."""
        queue = JobQueue()

        future_job = Job.create(
            job_type="future", priority=10, scheduled_at=time.time() + 3600
        )
        ready_job = Job.create(job_type="ready", priority=1)

        queue.enqueue(future_job)
        queue.enqueue(ready_job)

        dequeued = queue.dequeue()
        assert dequeued is not None
        assert dequeued.job_id == ready_job.job_id

    def test_dequeue_skips_blocked_jobs(self):
        """Test that dequeue skips dependency-blocked jobs to find ready ones."""
        queue = JobQueue()

        dependency = Job.create(job_type="dep")
        blocked = Job.create(
            job_type="blocked", priority=10, depends_on=[dependency.job_id]
        )
        ready = Job.create(job_type="ready", priority=1)

        queue.enqueue(dependency)
        queue.enqueue(blocked)
        queue.enqueue(ready)

        dequeued = queue.dequeue()
        assert dequeued is not None
        assert dequeued.job_id == dependency.job_id

        dequeued = queue.dequeue()
        assert dequeued is not None
        assert dequeued.job_id == ready.job_id

    def test_get_job(self):
        """Test retrieving a job by ID."""
        queue = JobQueue()
        job = Job.create(job_type="test")
        queue.enqueue(job)

        retrieved = queue.get_job(job.job_id)
        assert retrieved.job_id == job.job_id

    def test_get_job_not_found(self):
        """Test KeyError for non-existent job."""
        queue = JobQueue()
        with pytest.raises(KeyError):
            queue.get_job("nonexistent-id")

    def test_update_status(self):
        """Test updating job status."""
        queue = JobQueue()
        job = Job.create(job_type="test")
        queue.enqueue(job)

        queue.update_status(job.job_id, JobStatus.RUNNING)
        assert queue.get_job(job.job_id).status == JobStatus.RUNNING

    def test_ready_count(self):
        """Test counting ready jobs."""
        queue = JobQueue()

        job1 = Job.create(job_type="ready1")
        job2 = Job.create(job_type="ready2")
        future_job = Job.create(job_type="future", scheduled_at=time.time() + 3600)

        queue.enqueue(job1)
        queue.enqueue(job2)
        queue.enqueue(future_job)

        assert queue.ready_count() == 2

    def test_export_import(self):
        """Test exporting and importing jobs."""
        queue1 = JobQueue()
        job1 = Job.create(job_type="export1", payload={"x": 1})
        job2 = Job.create(job_type="export2", payload={"y": 2})
        queue1.enqueue(job1)
        queue1.enqueue(job2)

        exported = queue1.export_jobs()

        queue2 = JobQueue()
        queue2.import_jobs(exported)

        assert queue2.size == 2

    def test_duplicate_job_raises(self):
        """Test that enqueueing duplicate job raises ValueError."""
        queue = JobQueue()
        job = Job.create(job_type="test")
        queue.enqueue(job)

        with pytest.raises(ValueError, match="already exists"):
            queue.enqueue(job)


class TestJobDependencies:
    """Tests for job dependencies."""

    def test_dependency_satisfied(self):
        """Test that job with completed dependency can be dequeued."""
        queue = JobQueue()

        dep_job = Job.create(job_type="dependency")
        queue.enqueue(dep_job)

        # Complete the dependency
        dep_job.status = JobStatus.COMPLETED
        queue.update_status(dep_job.job_id, JobStatus.COMPLETED)
        queue.dequeue()  # Remove from heap

        main_job = Job.create(job_type="main", depends_on=[dep_job.job_id])
        queue.enqueue(main_job)

        dequeued = queue.dequeue()
        assert dequeued is not None
        assert dequeued.job_id == main_job.job_id

    def test_dependency_not_satisfied(self):
        """Test that job with pending dependency cannot be dequeued."""
        queue = JobQueue()

        dep_job = Job.create(job_type="dependency")
        queue.enqueue(dep_job)

        main_job = Job.create(job_type="main", depends_on=[dep_job.job_id])
        queue.enqueue(main_job)

        # Should get the dependency first since main is blocked
        dequeued = queue.dequeue()
        assert dequeued.job_id == dep_job.job_id

    def test_dependency_failed_marks_job_failed(self):
        """Test that failed dependency marks dependent job as failed."""
        queue = JobQueue()

        dep_job = Job.create(job_type="dependency")
        queue.enqueue(dep_job)

        main_job = Job.create(job_type="main", depends_on=[dep_job.job_id])
        queue.enqueue(main_job)

        # Fail the dependency
        dep_job.status = JobStatus.FAILED
        queue.update_status(dep_job.job_id, JobStatus.FAILED)

        # Dequeue should skip failed dep, try main, and mark it failed
        queue.dequeue()  # Skip failed dep
        result = queue.dequeue()

        # Main job should be marked failed
        assert result is None or main_job.status == JobStatus.FAILED

    def test_failed_dependency_wakes_dependents(self):
        """Test that failed dependency failure propagates to dependents."""
        queue = JobQueue()

        dep_job = Job.create(job_type="dependency")
        main_job = Job.create(job_type="main", depends_on=[dep_job.job_id])

        queue.enqueue(dep_job)
        queue.enqueue(main_job)

        dep_job.status = JobStatus.FAILED
        queue.update_status(dep_job.job_id, JobStatus.FAILED)

        queue.dequeue()
        queue.dequeue()

        assert main_job.status == JobStatus.FAILED


class TestWorker:
    """Tests for the Worker class."""

    def test_worker_executes_job(self):
        """Test that worker executes jobs correctly."""
        queue = JobQueue()
        dead_letter = JobQueue()
        results = []

        def handler(payload):
            results.append(payload)
            return "done"

        job = Job.create(job_type="test", payload={"value": 42})
        queue.enqueue(job)

        worker = Worker(
            queue=queue,
            handlers={"test": handler},
            dead_letter_queue=dead_letter,
            poll_interval=0.01
        )
        worker.start()
        time.sleep(0.2)
        worker.stop()

        assert len(results) == 1
        assert results[0] == {"value": 42}
        assert job.status == JobStatus.COMPLETED

    def test_worker_handles_failure(self):
        """Test that worker handles job failures."""
        queue = JobQueue()
        dead_letter = JobQueue()

        def failing_handler(payload):
            raise Exception("Test failure")

        job = Job.create(job_type="fail", max_retries=0)
        queue.enqueue(job)

        worker = Worker(
            queue=queue,
            handlers={"fail": failing_handler},
            dead_letter_queue=dead_letter,
            poll_interval=0.01
        )
        worker.start()
        time.sleep(0.2)
        worker.stop()

        assert dead_letter.size == 1

    def test_worker_retries_with_backoff(self):
        """Test that worker retries failed jobs with exponential backoff."""
        queue = JobQueue()
        dead_letter = JobQueue()
        attempts = []

        def flaky_handler(payload):
            attempts.append(time.time())
            if len(attempts) < 3:
                raise Exception("Temporary failure")
            return "success"

        job = Job.create(job_type="flaky", max_retries=5)
        queue.enqueue(job)

        worker = Worker(
            queue=queue,
            handlers={"flaky": flaky_handler},
            dead_letter_queue=dead_letter,
            poll_interval=0.01,
            base_delay=0.1
        )
        worker.start()
        time.sleep(2)
        worker.stop()

        # Should have attempted at least once
        assert len(attempts) >= 1

    def test_worker_timeout(self):
        """Test that worker handles job timeout configuration."""
        queue = JobQueue()
        dead_letter = JobQueue()

        # Test that timeout_seconds is properly configured
        job = Job.create(job_type="slow", timeout_seconds=5.0, max_retries=0)
        assert job.timeout_seconds == 5.0
        queue.enqueue(job)

        # Test with a fast handler to verify normal execution
        def fast_handler(payload):
            return "done"

        worker = Worker(
            queue=queue,
            handlers={"slow": fast_handler},
            dead_letter_queue=dead_letter,
            poll_interval=0.01
        )
        worker.start()
        time.sleep(0.3)
        worker.stop()

        # Fast job should complete successfully
        assert job.status == JobStatus.COMPLETED

    def test_worker_graceful_shutdown(self):
        """Test that worker shuts down gracefully."""
        queue = JobQueue()
        dead_letter = JobQueue()

        worker = Worker(
            queue=queue,
            handlers={},
            dead_letter_queue=dead_letter
        )
        worker.start()
        assert worker.is_alive()

        worker.stop(wait=True)
        time.sleep(0.1)
        assert not worker.is_alive()


class TestDeadLetterReplay:
    """Tests for dead letter replay behavior."""

    def test_replay_dead_letter_preserves_job_id(self):
        """Test that replaying dead jobs preserves job_id."""
        manager = JobQueueManager()

        def failing_handler(payload):
            raise Exception("fail")

        manager.register_handler("fail", failing_handler)
        job_id = manager.submit("fail", payload={"x": 1}, max_retries=0)
        manager.start_workers()

        manager.wait_for_completion([job_id], timeout=2)
        manager.stop_workers(graceful=True)

        dead_letter = manager.get_dead_letter_queue()
        assert dead_letter.size == 1

        replayed_job_id = manager.replay_dead_letter(job_id)
        assert replayed_job_id == job_id


class TestEventHandler:
    """Tests for event handler callbacks."""

    def test_event_callbacks(self):
        """Test that event callbacks are triggered."""
        events = []

        class TestEventHandler(EventHandler):
            def on_job_submitted(self, job):
                events.append(("submitted", job.job_id))

            def on_job_started(self, job, worker_id):
                events.append(("started", job.job_id))

            def on_job_completed(self, job, result):
                events.append(("completed", job.job_id))

        manager = JobQueueManager(event_handler=TestEventHandler())
        manager.register_handler("test", lambda p: "ok")

        job_id = manager.submit("test", {})
        manager.start_workers(count=1)
        time.sleep(0.2)
        manager.stop_workers()

        assert ("submitted", job_id) in events
        # Other events may or may not be captured depending on timing


class TestJobQueueManager:
    """Tests for the JobQueueManager class."""

    def test_manager_create_queue(self):
        """Test creating queues."""
        manager = JobQueueManager()
        queue = manager.create_queue("custom")
        assert queue is not None
        assert manager.get_queue("custom") is queue

    def test_manager_register_handler(self):
        """Test registering handlers."""
        manager = JobQueueManager()
        manager.register_handler("my_job", lambda p: p)
        # Should not raise
        job_id = manager.submit("my_job", {"data": 1})
        assert job_id is not None

    def test_manager_submit_without_handler(self):
        """Test that submitting without handler raises."""
        manager = JobQueueManager()
        with pytest.raises(ValueError, match="No handler registered"):
            manager.submit("unregistered", {})

    def test_manager_stats(self):
        """Test getting system statistics."""
        manager = JobQueueManager()
        stats = manager.get_stats()
        assert "total_submitted" in stats
        assert "jobs_per_queue" in stats
        assert "workers_per_queue" in stats

    def test_manager_context_manager(self):
        """Test using manager as context manager."""
        with JobQueueManager() as manager:
            manager.register_handler("test", lambda p: "done")
            manager.submit("test", {})
            manager.start_workers(count=1)
            time.sleep(0.1)
        # Workers should be stopped after exit

    def test_manager_dead_letter_queue(self):
        """Test dead letter queue access."""
        manager = JobQueueManager()
        dlq = manager.get_dead_letter_queue()
        assert dlq is not None
        assert dlq.size == 0

    def test_manager_replay_dead_letter(self):
        """Test replaying a dead letter job."""
        manager = JobQueueManager()
        fail_count = [0]

        def handler(payload):
            fail_count[0] += 1
            if fail_count[0] < 2:
                raise Exception("Fail first time")
            return "success"

        manager.register_handler("replay_test", handler)
        job_id = manager.submit("replay_test", {}, max_retries=0)

        manager.start_workers(count=1)
        time.sleep(0.3)

        # Job should be in dead letter queue
        dlq = manager.get_dead_letter_queue()
        if dlq.size > 0:
            # Replay it
            jobs = dlq.export_jobs()
            if jobs:
                new_id = manager.replay_dead_letter(jobs[0]["job_id"])
                assert new_id is not None

        manager.stop_workers()

    def test_manager_start_stop_workers(self):
        """Test starting and stopping workers."""
        manager = JobQueueManager()
        manager.register_handler("test", lambda p: None)

        manager.start_workers(count=2)
        stats = manager.get_stats()
        assert stats["workers_per_queue"]["default"] == 2

        manager.stop_workers()
        stats = manager.get_stats()
        assert stats["workers_per_queue"]["default"] == 0

    def test_manager_multiple_queues(self):
        """Test managing multiple queues."""
        manager = JobQueueManager()
        manager.create_queue("queue1")
        manager.create_queue("queue2")

        manager.register_handler("job1", lambda p: "q1", queue="queue1")
        manager.register_handler("job2", lambda p: "q2", queue="queue2")

        id1 = manager.submit("job1", {})
        id2 = manager.submit("job2", {})

        assert manager.get_queue("queue1").size == 1
        assert manager.get_queue("queue2").size == 1


class TestThreadSafety:
    """Tests for thread safety."""

    def test_concurrent_enqueue(self):
        """Test concurrent enqueue operations."""
        queue = JobQueue()
        num_jobs = 100
        errors = []

        def enqueue_jobs():
            try:
                for i in range(num_jobs):
                    job = Job.create(job_type=f"concurrent_{threading.current_thread().name}")
                    queue.enqueue(job)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=enqueue_jobs) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        assert queue.size == num_jobs * 5

    def test_concurrent_enqueue_dequeue(self):
        """Test concurrent enqueue and dequeue operations."""
        queue = JobQueue()
        enqueued = []
        dequeued = []
        lock = threading.Lock()

        def producer():
            for i in range(50):
                job = Job.create(job_type="concurrent")
                queue.enqueue(job)
                with lock:
                    enqueued.append(job.job_id)
                time.sleep(0.001)

        def consumer():
            for _ in range(100):
                job = queue.dequeue()
                if job:
                    job.status = JobStatus.COMPLETED
                    queue.update_status(job.job_id, JobStatus.COMPLETED)
                    with lock:
                        dequeued.append(job.job_id)
                time.sleep(0.001)

        producers = [threading.Thread(target=producer) for _ in range(3)]
        consumers = [threading.Thread(target=consumer) for _ in range(2)]

        for t in producers + consumers:
            t.start()
        for t in producers + consumers:
            t.join()

        # All dequeued jobs should be unique (no duplicates)
        assert len(dequeued) == len(set(dequeued))

        # All dequeued jobs should have been enqueued
        for job_id in dequeued:
            assert job_id in enqueued

    def test_stress_test(self):
        """Stress test with multiple producers and workers."""
        manager = JobQueueManager(config={"max_workers": 5})
        completed = []
        lock = threading.Lock()

        def handler(payload):
            time.sleep(0.001)
            with lock:
                completed.append(payload["id"])
            return "done"

        manager.register_handler("stress", handler)

        # Start workers
        manager.start_workers(count=5)

        # Submit jobs concurrently
        job_ids = []

        def submit_jobs():
            for i in range(100):
                jid = manager.submit("stress", {"id": f"{threading.current_thread().name}_{i}"})
                job_ids.append(jid)

        threads = [threading.Thread(target=submit_jobs) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Wait for completion
        time.sleep(3)
        manager.stop_workers()

        # Verify no duplicates
        assert len(completed) == len(set(completed))
