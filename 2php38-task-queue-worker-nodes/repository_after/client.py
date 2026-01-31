"""Main task queue client interface."""
from __future__ import annotations

import asyncio
import threading
import time
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, TypeVar

from .dependencies import CircularDependencyError, DependencyGraph, DependencyResolver
from .metrics import QueueManagementAPI, TaskQueueMetrics
from .models import Job, JobResult, JobStatus, Priority, QueueStats, RetryConfig
from .priority_queue import AsyncPriorityQueue, MultiLevelPriorityQueue, PriorityWeights
from .retry import RetryDecision, RetryManager, RetryScheduler
from .scheduler import (
    BulkJobSubmitter,
    DelayedJobScheduler,
    RecurringJobScheduler,
    UniquenessConstraint,
)
from .worker import WorkerNode, WorkerProcess, WorkerRegistry, WorkStealing


T = TypeVar("T")


class TaskQueue:
    """Main task queue client for submitting and managing jobs."""
    
    def __init__(
        self,
        priority_weights: Optional[PriorityWeights] = None,
        heartbeat_timeout: float = 30.0,
    ):
        self._priority_queue = MultiLevelPriorityQueue(priority_weights)
        self._delayed_scheduler = DelayedJobScheduler()
        self._recurring_scheduler = RecurringJobScheduler()
        self._dependency_resolver = DependencyResolver()
        self._uniqueness = UniquenessConstraint()
        
        self._metrics = TaskQueueMetrics()
        self._api = QueueManagementAPI(self._metrics)
        
        self._retry_manager = RetryManager(
            on_retry=self._on_job_retry,
            on_dlq=self._on_job_dlq,
            on_failure=self._on_job_failure,
        )
        self._retry_scheduler = RetryScheduler(self._retry_manager)
        
        self._worker_registry = WorkerRegistry(heartbeat_timeout)
        self._work_stealing = WorkStealing(self._worker_registry)
        
        self._bulk_submitter = BulkJobSubmitter(
            self._delayed_scheduler,
            on_submit=self._on_job_submitted,
        )
        
        self._handlers: Dict[str, Callable[[Job], JobResult]] = {}
        self._running = False
        self._lock = threading.RLock()
    
    def register_handler(self, job_name: str, handler: Callable[[Job], JobResult]):
        """Register a handler function for a job type."""
        with self._lock:
            self._handlers[job_name] = handler
    
    def submit(
        self,
        name: str,
        payload: Dict[str, Any],
        priority: Priority = Priority.NORMAL,
        delay_ms: int = 0,
        depends_on: Optional[List[str]] = None,
        retry_config: Optional[RetryConfig] = None,
        unique_key: Optional[str] = None,
        cron_expression: Optional[str] = None,
        timezone: str = "UTC",
    ) -> str:
        """Submit a new job to the queue."""
        job = Job(
            name=name,
            payload=payload,
            priority=priority,
            delay_ms=delay_ms,
            depends_on=depends_on or [],
            retry_config=retry_config or RetryConfig(),
            unique_key=unique_key,
            cron_expression=cron_expression,
            timezone=timezone,
        )
        
        return self._submit_job(job)
    
    def _submit_job(self, job: Job) -> str:
        """Internal job submission."""
        if job.unique_key:
            if not self._uniqueness.acquire(job.unique_key, job.id):
                raise ValueError(f"Duplicate job with unique key: {job.unique_key}")
        
        if job.depends_on:
            success, error = self._dependency_resolver.submit_job(job)
            if not success:
                if job.unique_key:
                    self._uniqueness.release(job.unique_key)
                raise CircularDependencyError([error or "Unknown dependency error"])
        
        if job.cron_expression:
            self._recurring_scheduler.register(job)
            self._api.register_job(job)
            self._metrics.record_job_submitted(Priority(job.priority))
            return job.id
        
        if job.delay_ms > 0 or job.scheduled_at:
            self._delayed_scheduler.schedule(job)
            self._api.register_job(job)
            self._metrics.record_job_submitted(Priority(job.priority))
            return job.id
        
        if job.depends_on and self._dependency_resolver.graph.has_unmet_dependencies(job.id):
            job.status = JobStatus.PENDING
            self._api.register_job(job)
            self._metrics.record_job_submitted(Priority(job.priority))
            return job.id
        
        self._priority_queue.enqueue(job)
        self._api.register_job(job)
        self._metrics.record_job_submitted(Priority(job.priority))
        self._update_metrics()
        
        return job.id
    
    def submit_batch(
        self,
        jobs: List[Dict[str, Any]],
        atomic: bool = True,
    ) -> tuple[List[str], List[tuple[str, str]]]:
        """Submit multiple jobs with optional atomic semantics."""
        job_objects = []
        for job_data in jobs:
            job = Job(
                name=job_data["name"],
                payload=job_data.get("payload", {}),
                priority=job_data.get("priority", Priority.NORMAL),
                delay_ms=job_data.get("delay_ms", 0),
                depends_on=job_data.get("depends_on", []),
                retry_config=job_data.get("retry_config", RetryConfig()),
                unique_key=job_data.get("unique_key"),
            )
            job_objects.append(job)
        
        return self._bulk_submitter.submit_batch(job_objects, atomic)
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get a job by its ID."""
        return self._api.get_job(job_id)
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel a pending or scheduled job."""
        job = self._api.get_job(job_id)
        if not job:
            return False
        
        if job.status == JobStatus.SCHEDULED:
            self._delayed_scheduler.cancel(job_id)
        elif job.status == JobStatus.PENDING:
            self._priority_queue.remove_job(job_id)
        else:
            return False
        
        if job.unique_key:
            self._uniqueness.release(job.unique_key)
        
        return self._api.cancel_job(job_id)
    
    def update_priority(self, job_id: str, new_priority: Priority) -> bool:
        """Update a job's priority."""
        if self._priority_queue.update_priority(job_id, new_priority):
            return self._api.update_job_priority(job_id, new_priority)
        return False
    
    def get_next_job(self, timeout: Optional[float] = None) -> Optional[Job]:
        """Get the next job to process from the queue."""
        due_delayed = self._delayed_scheduler.get_due_jobs()
        for job in due_delayed:
            if not self._dependency_resolver.graph.has_unmet_dependencies(job.id):
                return job
            self._priority_queue.enqueue(job)
        
        due_recurring = self._recurring_scheduler.get_due_jobs()
        for job in due_recurring:
            new_job = Job(
                name=job.name,
                payload=job.payload,
                priority=job.priority,
            )
            self._priority_queue.enqueue(new_job)
            self._api.register_job(new_job)
        
        due_retries = self._retry_scheduler.get_due_retries()
        for job_id in due_retries:
            self._retry_scheduler.pop_retry(job_id)
            job = self._api.get_job(job_id)
            if job:
                job.status = JobStatus.PENDING
                self._priority_queue.enqueue(job)
        
        job = self._priority_queue.dequeue(timeout)
        if job:
            self._update_metrics()
        return job
    
    def complete_job(self, job_id: str, result: JobResult):
        """Mark a job as complete."""
        job = self._api.get_job(job_id)
        if not job:
            return
        
        if result.success:
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            
            runnable = self._dependency_resolver.complete_job(job_id)
            for dep_job in runnable:
                self._priority_queue.enqueue(dep_job)
            
            self._metrics.record_job_completed(
                result.duration_ms / 1000,
                Priority(job.priority),
            )
        else:
            decision = self._retry_manager.handle_failure(job, result.error or "Unknown error")
            
            if decision.should_retry:
                self._retry_scheduler.schedule_retry(job, decision.delay_ms)
                self._metrics.record_job_retried()
            else:
                self._dependency_resolver.fail_job(job_id)
                self._metrics.record_job_failed(Priority(job.priority))
        
        if job.unique_key and job.status in (JobStatus.COMPLETED, JobStatus.DEAD):
            self._uniqueness.release(job.unique_key)
        
        self._update_metrics()
    
    def get_stats(self) -> QueueStats:
        """Get queue statistics."""
        return self._api.get_queue_stats()
    
    def get_dlq(self) -> List[Job]:
        """Get jobs in the dead-letter queue."""
        return self._retry_manager.get_dlq()
    
    def requeue_from_dlq(self, job_id: str, reset_attempts: bool = True) -> Optional[str]:
        """Requeue a job from the dead-letter queue."""
        job = self._retry_manager.requeue_from_dlq(job_id, reset_attempts)
        if job:
            self._priority_queue.enqueue(job)
            self._update_metrics()
            return job.id
        return None
    
    def get_prometheus_metrics(self) -> str:
        """Get metrics in Prometheus format."""
        return self._metrics.export_prometheus()
    
    def _on_job_submitted(self, job: Job):
        """Callback when a job is submitted."""
        pass
    
    def _on_job_retry(self, job: Job, attempt: int, delay_ms: int):
        """Callback when a job is scheduled for retry."""
        pass
    
    def _on_job_dlq(self, job: Job, reason: str):
        """Callback when a job is sent to DLQ."""
        self._metrics.record_dead_letter()
    
    def _on_job_failure(self, job: Job, error: str):
        """Callback when a job fails permanently."""
        pass
    
    def _update_metrics(self):
        """Update queue metrics."""
        size_by_priority = self._priority_queue.size_by_priority()
        self._metrics.update_queue_depth(
            self._priority_queue.size(),
            size_by_priority,
        )
        self._metrics.update_dlq_depth(self._retry_manager.get_dlq_size())
        self._metrics.update_worker_count(self._worker_registry.get_worker_count())
    
    def register_worker(self, worker: WorkerProcess) -> bool:
        """Register a worker with the queue."""
        node = WorkerNode(info=worker.info)
        return self._worker_registry.register(node)
    
    def unregister_worker(self, worker_id: str):
        """Unregister a worker."""
        self._worker_registry.unregister(worker_id)
        self._update_metrics()
    
    def worker_heartbeat(self, worker_id: str) -> bool:
        """Update worker heartbeat."""
        return self._worker_registry.heartbeat(worker_id)
    
    def get_queue_size(self) -> int:
        """Get total queue size."""
        return self._priority_queue.size()
    
    def get_queue_size_by_priority(self) -> Dict[Priority, int]:
        """Get queue size by priority level."""
        return self._priority_queue.size_by_priority()
    
    def clear(self):
        """Clear all jobs from the queue."""
        self._priority_queue.clear()
        self._update_metrics()


class AsyncTaskQueue:
    """Async wrapper for TaskQueue."""
    
    def __init__(self, queue: Optional[TaskQueue] = None):
        self._queue = queue or TaskQueue()
        self._async_queue = AsyncPriorityQueue()
    
    async def submit(
        self,
        name: str,
        payload: Dict[str, Any],
        priority: Priority = Priority.NORMAL,
        **kwargs,
    ) -> str:
        return self._queue.submit(name, payload, priority, **kwargs)
    
    async def get_next_job(self, timeout: Optional[float] = None) -> Optional[Job]:
        return self._queue.get_next_job(timeout)
    
    async def complete_job(self, job_id: str, result: JobResult):
        self._queue.complete_job(job_id, result)
    
    def get_stats(self) -> QueueStats:
        return self._queue.get_stats()
