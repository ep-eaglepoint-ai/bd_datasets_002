"""
Production-grade Python in-memory job queue system with heap-based priority scheduling.
"""

import heapq
import threading
import time
import uuid
import random
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Any, Optional, List, Callable
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class JobStatus(Enum):
    """Job lifecycle states."""
    PENDING = "pending"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    DEAD = "dead"


@dataclass
class Job:
    """
    Represents a job in the queue system.

    Supports priority scheduling, delayed execution, retries, and dependencies.
    """
    job_type: str
    payload: Dict[str, Any] = field(default_factory=dict)
    priority: int = 5
    scheduled_at: Optional[float] = None
    max_retries: int = 3
    timeout_seconds: Optional[float] = None
    depends_on: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: float = field(default_factory=time.time)
    retry_count: int = 0
    status: JobStatus = JobStatus.PENDING
    result: Optional[Any] = None
    error: Optional[str] = None
    _removed: bool = field(default=False, repr=False)

    def __lt__(self, other: "Job") -> bool:
        """Comparison for heap ordering: higher priority first, earlier scheduled, earlier created."""
        if self.priority != other.priority:
            return self.priority > other.priority

        self_scheduled = self.scheduled_at or 0
        other_scheduled = other.scheduled_at or 0
        if self_scheduled != other_scheduled:
            return self_scheduled < other_scheduled

        return self.created_at < other.created_at

    @classmethod
    def create(cls, job_type: str, payload: Optional[Dict[str, Any]] = None,
               priority: int = 5, scheduled_at: Optional[float] = None,
               max_retries: int = 3, timeout_seconds: Optional[float] = None,
               depends_on: Optional[List[str]] = None,
               metadata: Optional[Dict[str, Any]] = None) -> "Job":
        """Factory method with validation."""
        if not job_type or not isinstance(job_type, str) or not job_type.strip():
            raise ValueError("job_type must be a non-empty string")

        if not 1 <= priority <= 10:
            raise ValueError("priority must be between 1 and 10")

        if max_retries < 0:
            raise ValueError("max_retries cannot be negative")

        return cls(
            job_type=job_type.strip(),
            payload=payload or {},
            priority=priority,
            scheduled_at=scheduled_at,
            max_retries=max_retries,
            timeout_seconds=timeout_seconds,
            depends_on=depends_on or [],
            metadata=metadata or {}
        )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize job to dictionary."""
        return {
            "job_id": self.job_id,
            "job_type": self.job_type,
            "payload": self.payload,
            "priority": self.priority,
            "scheduled_at": self.scheduled_at,
            "created_at": self.created_at,
            "max_retries": self.max_retries,
            "retry_count": self.retry_count,
            "timeout_seconds": self.timeout_seconds,
            "status": self.status.value,
            "result": self.result,
            "error": self.error,
            "depends_on": self.depends_on,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Job":
        """Deserialize job from dictionary."""
        job = cls(
            job_id=data["job_id"],
            job_type=data["job_type"],
            payload=data.get("payload", {}),
            priority=data.get("priority", 5),
            scheduled_at=data.get("scheduled_at"),
            created_at=data.get("created_at", time.time()),
            max_retries=data.get("max_retries", 3),
            retry_count=data.get("retry_count", 0),
            timeout_seconds=data.get("timeout_seconds"),
            status=JobStatus(data.get("status", "pending")),
            result=data.get("result"),
            error=data.get("error"),
            depends_on=data.get("depends_on", []),
            metadata=data.get("metadata", {})
        )
        return job


class JobQueue:
    """
    Thread-safe priority queue for jobs using heap structure.

    Uses a dictionary for O(1) lookup and tombstone pattern for efficient removal.
    Blocked jobs (with unmet dependencies) are held separately to avoid heap thrashing.
    """

    def __init__(self):
        self._heap: List[Job] = []
        self._jobs: Dict[str, Job] = {}
        self._lock = threading.Lock()
        self._dependents: Dict[str, List[str]] = {}  # job_id -> list of dependent job_ids
        self._blocked_jobs: Dict[str, Job] = {}  # Jobs waiting for dependencies
        self._tombstone_count = 0

    def enqueue(self, job: Job) -> str:
        """Add a job to the queue."""
        with self._lock:
            if job.job_id in self._jobs:
                raise ValueError(f"Job {job.job_id} already exists in queue")

            # Register reverse dependencies
            for dep_id in job.depends_on:
                if dep_id not in self._dependents:
                    self._dependents[dep_id] = []
                self._dependents[dep_id].append(job.job_id)

            self._jobs[job.job_id] = job
            heapq.heappush(self._heap, job)
            return job.job_id

    def dequeue(self) -> Optional[Job]:
        """Get the next ready job for execution."""
        with self._lock:
            current_time = time.time()

            while self._heap:
                job = self._heap[0]

                # Skip tombstones
                if job._removed or job.job_id not in self._jobs:
                    heapq.heappop(self._heap)
                    self._tombstone_count -= 1 if job._removed else 0
                    continue

                # Skip non-pending jobs
                if job.status not in (JobStatus.PENDING, JobStatus.SCHEDULED):
                    heapq.heappop(self._heap)
                    continue

                # Check if scheduled for later
                if job.scheduled_at and job.scheduled_at > current_time:
                    return None

                # Check dependencies
                if not self._check_dependencies(job):
                    # Dependencies not met - move to blocked set instead of re-pushing to heap
                    # This avoids O(n) heap thrashing with many blocked jobs
                    heapq.heappop(self._heap)
                    self._blocked_jobs[job.job_id] = job
                    return None

                heapq.heappop(self._heap)
                return job

            return None

    def _check_dependencies(self, job: Job) -> bool:
        """Check if all dependencies are satisfied. Must be called with lock held."""
        for dep_id in job.depends_on:
            dep_job = self._jobs.get(dep_id)
            if dep_job is None:
                # Dependency not found, assume completed externally
                continue

            if dep_job.status == JobStatus.COMPLETED:
                continue
            elif dep_job.status in (JobStatus.FAILED, JobStatus.DEAD):
                # Mark this job as failed due to dependency
                job.status = JobStatus.FAILED
                job.error = f"Dependency {dep_id} failed"
                return False
            else:
                # Dependency not ready
                return False

        return True

    def _wake_dependents(self, job_id: str) -> None:
        """Wake jobs blocked on the given job. Must be called with lock held."""
        dependent_ids = self._dependents.get(job_id, [])
        for dep_id in dependent_ids:
            if dep_id in self._blocked_jobs:
                blocked_job = self._blocked_jobs.pop(dep_id)
                # Re-add to heap so it can be scheduled
                heapq.heappush(self._heap, blocked_job)

    def peek(self) -> Optional[Job]:
        """Return the next ready job without removing it."""
        with self._lock:
            current_time = time.time()

            for job in self._heap:
                if job._removed or job.job_id not in self._jobs:
                    continue
                if job.status not in (JobStatus.PENDING, JobStatus.SCHEDULED):
                    continue
                if job.scheduled_at and job.scheduled_at > current_time:
                    continue
                return job

            return None

    def get_job(self, job_id: str) -> Job:
        """Get a job by ID."""
        with self._lock:
            if job_id not in self._jobs:
                raise KeyError(f"Job {job_id} not found")
            return self._jobs[job_id]

    def update_status(self, job_id: str, status: JobStatus) -> None:
        """Update a job's status and wake dependent jobs if completed/failed."""
        with self._lock:
            if job_id not in self._jobs:
                raise KeyError(f"Job {job_id} not found")
            self._jobs[job_id].status = status

            # Wake blocked dependents when a job completes or fails
            if status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.DEAD):
                self._wake_dependents(job_id)

    @property
    def size(self) -> int:
        """Total job count."""
        with self._lock:
            return len(self._jobs)

    def ready_count(self) -> int:
        """Count of jobs ready for immediate execution."""
        with self._lock:
            current_time = time.time()
            count = 0

            for job in self._jobs.values():
                if job.status not in (JobStatus.PENDING, JobStatus.SCHEDULED):
                    continue
                if job.scheduled_at and job.scheduled_at > current_time:
                    continue
                count += 1

            return count

    def cleanup(self) -> None:
        """Compact the heap by removing tombstones and cleaning up blocked jobs."""
        with self._lock:
            if self._tombstone_count < len(self._heap) * 0.25:
                return

            self._heap = [j for j in self._heap if not j._removed and j.job_id in self._jobs]
            heapq.heapify(self._heap)
            self._tombstone_count = 0

            # Clean up blocked jobs that are no longer valid
            invalid_blocked = [jid for jid, job in self._blocked_jobs.items()
                               if job._removed or jid not in self._jobs]
            for jid in invalid_blocked:
                del self._blocked_jobs[jid]

    def remove(self, job_id: str) -> None:
        """Mark a job as removed (tombstone)."""
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id]._removed = True
                del self._jobs[job_id]
                self._tombstone_count += 1

    def export_jobs(self) -> List[Dict[str, Any]]:
        """Export all jobs as dictionaries."""
        with self._lock:
            return [job.to_dict() for job in self._jobs.values()]

    def import_jobs(self, jobs_data: List[Dict[str, Any]]) -> None:
        """Import jobs from dictionaries."""
        with self._lock:
            for data in jobs_data:
                job = Job.from_dict(data)
                self._jobs[job.job_id] = job
                heapq.heappush(self._heap, job)

                for dep_id in job.depends_on:
                    if dep_id not in self._dependents:
                        self._dependents[dep_id] = []
                    self._dependents[dep_id].append(job.job_id)

    def get_dependents(self, job_id: str) -> List[str]:
        """Get job IDs that depend on the given job."""
        with self._lock:
            return self._dependents.get(job_id, []).copy()

    def reschedule(self, job_id: str) -> None:
        """Re-add an existing job to the heap for retry. Job must already be in _jobs."""
        with self._lock:
            if job_id not in self._jobs:
                raise KeyError(f"Job {job_id} not found")
            job = self._jobs[job_id]
            # Push back to heap for scheduling
            heapq.heappush(self._heap, job)


class EventHandler:
    """Default no-op event handler for job lifecycle events."""

    def on_job_submitted(self, job: Job) -> None:
        pass

    def on_job_started(self, job: Job, worker_id: str) -> None:
        pass

    def on_job_completed(self, job: Job, result: Any) -> None:
        pass

    def on_job_failed(self, job: Job, error: str) -> None:
        pass

    def on_job_retried(self, job: Job, next_scheduled_at: float) -> None:
        pass

    def on_job_dead(self, job: Job) -> None:
        pass


class Worker(threading.Thread):
    """
    Worker thread that polls a queue and executes jobs.
    """

    def __init__(self, queue: JobQueue, handlers: Dict[str, Callable],
                 dead_letter_queue: JobQueue, event_handler: EventHandler = None,
                 poll_interval: float = 0.1, base_delay: float = 1.0,
                 worker_id: str = None):
        super().__init__(daemon=True)
        self.queue = queue
        self.handlers = handlers
        self.dead_letter_queue = dead_letter_queue
        self.event_handler = event_handler or EventHandler()
        self.poll_interval = poll_interval
        self.base_delay = base_delay
        self.worker_id = worker_id or str(uuid.uuid4())[:8]
        self._stop_flag = threading.Event()
        self._current_job: Optional[Job] = None

    def run(self) -> None:
        """Main worker loop."""
        while not self._stop_flag.is_set():
            job = self.queue.dequeue()

            if job is None:
                time.sleep(self.poll_interval)
                continue

            self._current_job = job
            self._execute_job(job)
            self._current_job = None

    def _execute_job(self, job: Job) -> None:
        """Execute a single job with timeout and error handling."""
        handler = self.handlers.get(job.job_type)

        if handler is None:
            job.error = f"No handler registered for job type: {job.job_type}"
            job.status = JobStatus.FAILED
            self._handle_failure(job)
            return

        job.status = JobStatus.RUNNING
        self.queue.update_status(job.job_id, JobStatus.RUNNING)
        self.event_handler.on_job_started(job, self.worker_id)

        try:
            if job.timeout_seconds:
                with ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(handler, job.payload)
                    result = future.result(timeout=job.timeout_seconds)
            else:
                result = handler(job.payload)

            job.result = result
            job.status = JobStatus.COMPLETED
            self.queue.update_status(job.job_id, JobStatus.COMPLETED)
            self.event_handler.on_job_completed(job, result)
            logger.info(f"Job {job.job_id} completed successfully")

        except FuturesTimeoutError:
            job.error = f"Job timed out after {job.timeout_seconds} seconds"
            job.status = JobStatus.FAILED
            self._handle_failure(job)

        except Exception as e:
            job.error = str(e)
            job.status = JobStatus.FAILED
            self._handle_failure(job)

    def _handle_failure(self, job: Job) -> None:
        """Handle job failure with retry or dead letter."""
        self.event_handler.on_job_failed(job, job.error)
        logger.warning(f"Job {job.job_id} ({job.job_type}) failed: {job.error}")

        if job.retry_count < job.max_retries:
            job.retry_count += 1
            delay = self.base_delay * (2 ** job.retry_count)
            jitter = random.uniform(0, 0.5 * delay)
            next_scheduled = time.time() + delay + jitter

            job.scheduled_at = next_scheduled
            job.status = JobStatus.PENDING
            self.queue.update_status(job.job_id, JobStatus.PENDING)

            # Reschedule existing job (job is still in _jobs, just needs to be re-added to heap)
            self.queue.reschedule(job.job_id)

            self.event_handler.on_job_retried(job, next_scheduled)
            logger.info(f"Job {job.job_id} scheduled for retry {job.retry_count}/{job.max_retries}")
        else:
            job.status = JobStatus.DEAD
            self.queue.update_status(job.job_id, JobStatus.DEAD)
            self.dead_letter_queue.enqueue(Job(
                job_id=job.job_id,
                job_type=job.job_type,
                payload=job.payload,
                priority=job.priority,
                max_retries=job.max_retries,
                retry_count=job.retry_count,
                status=JobStatus.DEAD,
                error=job.error,
                metadata=job.metadata,
                depends_on=job.depends_on
            ))
            self.event_handler.on_job_dead(job)
            logger.error(f"Job {job.job_id} moved to dead letter queue after {job.max_retries} retries")

    def stop(self, wait: bool = True) -> None:
        """Signal the worker to stop."""
        self._stop_flag.set()
        if wait and self.is_alive():
            self.join(timeout=5.0)


class JobQueueManager:
    """
    Primary interface for the job queue system.

    Manages multiple named queues, worker pools, and job routing.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None,
                 event_handler: EventHandler = None):
        self.config = config or {}
        self.event_handler = event_handler or EventHandler()

        self._queues: Dict[str, JobQueue] = {}
        self._handlers: Dict[str, tuple] = {}  # job_type -> (handler, queue_name)
        self._workers: Dict[str, List[Worker]] = {}
        self._dead_letter_queue = JobQueue()

        self._queue_lock = threading.Lock()
        self._worker_lock = threading.Lock()
        self._handler_lock = threading.Lock()

        self._stats = {
            "total_submitted": 0,
            "total_completed": 0,
            "total_failed": 0,
            "total_dead": 0
        }

        # Create default queue
        self.create_queue("default")

    def __enter__(self) -> "JobQueueManager":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.stop_workers(graceful=True)

    def create_queue(self, name: str, **config) -> JobQueue:
        """Create and register a new queue."""
        with self._queue_lock:
            if name in self._queues:
                return self._queues[name]

            queue = JobQueue()
            self._queues[name] = queue
            self._workers[name] = []
            return queue

    def get_queue(self, name: str) -> JobQueue:
        """Get a queue by name."""
        with self._queue_lock:
            if name not in self._queues:
                raise KeyError(f"Queue '{name}' not found")
            return self._queues[name]

    def register_handler(self, job_type: str, handler: Callable,
                         queue: str = "default") -> None:
        """Associate a handler with a job type and queue."""
        with self._handler_lock:
            if queue not in self._queues:
                self.create_queue(queue)
            self._handlers[job_type] = (handler, queue)

    def submit(self, job_type: str, payload: Optional[Dict[str, Any]] = None,
               **kwargs) -> str:
        """Create and submit a job."""
        with self._handler_lock:
            if job_type not in self._handlers:
                raise ValueError(f"No handler registered for job type: {job_type}")
            _, queue_name = self._handlers[job_type]

        # Check for circular dependencies
        depends_on = kwargs.get("depends_on", [])
        if depends_on:
            self._check_circular_dependencies(depends_on, queue_name)

        job = Job.create(job_type=job_type, payload=payload, **kwargs)

        queue = self.get_queue(queue_name)
        queue.enqueue(job)

        self._stats["total_submitted"] += 1
        self.event_handler.on_job_submitted(job)

        return job.job_id

    def _check_circular_dependencies(self, depends_on: List[str], queue_name: str) -> None:
        """Check for circular dependencies."""
        queue = self.get_queue(queue_name)
        visited = set()

        def dfs(job_id: str) -> None:
            if job_id in visited:
                raise ValueError(f"Circular dependency detected involving job {job_id}")
            visited.add(job_id)

            try:
                job = queue.get_job(job_id)
                for dep_id in job.depends_on:
                    dfs(dep_id)
            except KeyError:
                pass  # Job not in this queue

        for dep_id in depends_on:
            dfs(dep_id)

    def start_workers(self, queue: str = None, count: int = None) -> None:
        """Start worker threads for specified queue(s)."""
        queues = [queue] if queue else list(self._queues.keys())

        for q_name in queues:
            self._start_workers_for_queue(q_name, count)

    def _start_workers_for_queue(self, queue_name: str, count: int = None) -> None:
        """Start workers for a specific queue."""
        with self._worker_lock:
            q = self.get_queue(queue_name)

            # Get handlers for this queue
            queue_handlers = {}
            with self._handler_lock:
                for job_type, (handler, q_name) in self._handlers.items():
                    if q_name == queue_name:
                        queue_handlers[job_type] = handler

            worker_count = count or self.config.get("max_workers", 2)

            for i in range(worker_count):
                worker = Worker(
                    queue=q,
                    handlers=queue_handlers,
                    dead_letter_queue=self._dead_letter_queue,
                    event_handler=self._create_stats_handler(),
                    worker_id=f"{queue_name}-worker-{i}"
                )
                worker.start()
                self._workers[queue_name].append(worker)

    def _create_stats_handler(self) -> EventHandler:
        """Create an event handler that updates stats."""
        manager = self

        class StatsHandler(EventHandler):
            def on_job_completed(self, job: Job, result: Any) -> None:
                manager._stats["total_completed"] += 1
                manager.event_handler.on_job_completed(job, result)

            def on_job_failed(self, job: Job, error: str) -> None:
                manager._stats["total_failed"] += 1
                manager.event_handler.on_job_failed(job, error)

            def on_job_dead(self, job: Job) -> None:
                manager._stats["total_dead"] += 1
                manager.event_handler.on_job_dead(job)

            def on_job_submitted(self, job: Job) -> None:
                manager.event_handler.on_job_submitted(job)

            def on_job_started(self, job: Job, worker_id: str) -> None:
                manager.event_handler.on_job_started(job, worker_id)

            def on_job_retried(self, job: Job, next_scheduled_at: float) -> None:
                manager.event_handler.on_job_retried(job, next_scheduled_at)

        return StatsHandler()

    def stop_workers(self, queue: str = None, graceful: bool = True) -> None:
        """Stop worker threads."""
        with self._worker_lock:
            queues = [queue] if queue else list(self._workers.keys())

            for q_name in queues:
                for worker in self._workers.get(q_name, []):
                    worker.stop(wait=graceful)
                self._workers[q_name] = []

    def get_stats(self) -> Dict[str, Any]:
        """Get system statistics."""
        with self._queue_lock:
            jobs_per_queue = {name: q.size for name, q in self._queues.items()}

        with self._worker_lock:
            workers_per_queue = {name: len(workers) for name, workers in self._workers.items()}

        return {
            **self._stats,
            "jobs_per_queue": jobs_per_queue,
            "workers_per_queue": workers_per_queue,
            "dead_letter_count": self._dead_letter_queue.size
        }

    def get_dead_letter_queue(self) -> JobQueue:
        """Get the dead letter queue."""
        return self._dead_letter_queue

    def replay_dead_letter(self, job_id: str) -> str:
        """Replay a dead letter job."""
        try:
            dead_job = self._dead_letter_queue.get_job(job_id)
        except KeyError:
            raise KeyError(f"Job {job_id} not found in dead letter queue")

        # Find original queue
        with self._handler_lock:
            if dead_job.job_type not in self._handlers:
                raise ValueError(f"No handler for job type: {dead_job.job_type}")
            _, queue_name = self._handlers[dead_job.job_type]

        # Reset job state
        dead_job.retry_count = 0
        dead_job.status = JobStatus.PENDING
        dead_job.scheduled_at = None
        dead_job.error = None

        # Remove from dead letter queue and add to original queue
        self._dead_letter_queue.remove(job_id)

        queue = self.get_queue(queue_name)
        new_job = Job(
            job_id=str(uuid.uuid4()),
            job_type=dead_job.job_type,
            payload=dead_job.payload,
            priority=dead_job.priority,
            max_retries=dead_job.max_retries,
            metadata=dead_job.metadata,
            depends_on=dead_job.depends_on
        )
        queue.enqueue(new_job)

        return new_job.job_id

    def get_job(self, job_id: str, queue: str = None) -> Job:
        """Get a job by ID."""
        if queue:
            return self.get_queue(queue).get_job(job_id)

        with self._queue_lock:
            for q in self._queues.values():
                try:
                    return q.get_job(job_id)
                except KeyError:
                    continue

        raise KeyError(f"Job {job_id} not found")

    def wait_for_completion(self, job_ids: List[str], timeout: float = None) -> bool:
        """Wait for jobs to complete."""
        start_time = time.time()

        while True:
            all_done = True

            for job_id in job_ids:
                try:
                    job = self.get_job(job_id)
                    if job.status not in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.DEAD):
                        all_done = False
                        break
                except KeyError:
                    pass

            if all_done:
                return True

            if timeout and (time.time() - start_time) > timeout:
                return False

            time.sleep(0.05)
