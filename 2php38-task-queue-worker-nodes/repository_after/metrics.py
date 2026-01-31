"""Comprehensive observability with Prometheus metrics and REST API."""
from __future__ import annotations

import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from .models import Job, JobStatus, Priority, QueueStats, WorkerInfo


class Counter:
    """Thread-safe counter metric."""
    
    def __init__(self, name: str, description: str = ""):
        self.name = name
        self.description = description
        self._value = 0
        self._lock = threading.Lock()
        self._labels: Dict[tuple, int] = defaultdict(int)
    
    def inc(self, value: int = 1, labels: Optional[Dict[str, str]] = None):
        with self._lock:
            if labels:
                key = tuple(sorted(labels.items()))
                self._labels[key] += value
            else:
                self._value += value
    
    def get(self, labels: Optional[Dict[str, str]] = None) -> int:
        with self._lock:
            if labels:
                key = tuple(sorted(labels.items()))
                return self._labels[key]
            return self._value
    
    def reset(self):
        with self._lock:
            self._value = 0
            self._labels.clear()


class Gauge:
    """Thread-safe gauge metric."""
    
    def __init__(self, name: str, description: str = ""):
        self.name = name
        self.description = description
        self._value = 0.0
        self._lock = threading.Lock()
        self._labels: Dict[tuple, float] = defaultdict(float)
    
    def set(self, value: float, labels: Optional[Dict[str, str]] = None):
        with self._lock:
            if labels:
                key = tuple(sorted(labels.items()))
                self._labels[key] = value
            else:
                self._value = value
    
    def inc(self, value: float = 1.0, labels: Optional[Dict[str, str]] = None):
        with self._lock:
            if labels:
                key = tuple(sorted(labels.items()))
                self._labels[key] += value
            else:
                self._value += value
    
    def dec(self, value: float = 1.0, labels: Optional[Dict[str, str]] = None):
        with self._lock:
            if labels:
                key = tuple(sorted(labels.items()))
                self._labels[key] -= value
            else:
                self._value -= value
    
    def get(self, labels: Optional[Dict[str, str]] = None) -> float:
        with self._lock:
            if labels:
                key = tuple(sorted(labels.items()))
                return self._labels[key]
            return self._value


class Histogram:
    """Thread-safe histogram metric."""
    
    DEFAULT_BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, float("inf"))
    
    def __init__(self, name: str, description: str = "", buckets: Optional[tuple] = None):
        self.name = name
        self.description = description
        self._buckets = buckets or self.DEFAULT_BUCKETS
        self._lock = threading.Lock()
        self._counts: Dict[float, int] = {b: 0 for b in self._buckets}
        self._sum = 0.0
        self._count = 0
        self._labels_data: Dict[tuple, Dict[str, Any]] = defaultdict(
            lambda: {"counts": {b: 0 for b in self._buckets}, "sum": 0.0, "count": 0}
        )
    
    def observe(self, value: float, labels: Optional[Dict[str, str]] = None):
        with self._lock:
            if labels:
                key = tuple(sorted(labels.items()))
                data = self._labels_data[key]
                for bucket in self._buckets:
                    if value <= bucket:
                        data["counts"][bucket] += 1
                data["sum"] += value
                data["count"] += 1
            else:
                for bucket in self._buckets:
                    if value <= bucket:
                        self._counts[bucket] += 1
                self._sum += value
                self._count += 1
    
    def get_count(self, labels: Optional[Dict[str, str]] = None) -> int:
        with self._lock:
            if labels:
                key = tuple(sorted(labels.items()))
                return self._labels_data[key]["count"]
            return self._count
    
    def get_sum(self, labels: Optional[Dict[str, str]] = None) -> float:
        with self._lock:
            if labels:
                key = tuple(sorted(labels.items()))
                return self._labels_data[key]["sum"]
            return self._sum
    
    def get_buckets(self, labels: Optional[Dict[str, str]] = None) -> Dict[float, int]:
        with self._lock:
            if labels:
                key = tuple(sorted(labels.items()))
                return dict(self._labels_data[key]["counts"])
            return dict(self._counts)


class MetricsRegistry:
    """Registry for all metrics."""
    
    def __init__(self):
        self._counters: Dict[str, Counter] = {}
        self._gauges: Dict[str, Gauge] = {}
        self._histograms: Dict[str, Histogram] = {}
        self._lock = threading.Lock()
    
    def counter(self, name: str, description: str = "") -> Counter:
        with self._lock:
            if name not in self._counters:
                self._counters[name] = Counter(name, description)
            return self._counters[name]
    
    def gauge(self, name: str, description: str = "") -> Gauge:
        with self._lock:
            if name not in self._gauges:
                self._gauges[name] = Gauge(name, description)
            return self._gauges[name]
    
    def histogram(self, name: str, description: str = "", buckets: Optional[tuple] = None) -> Histogram:
        with self._lock:
            if name not in self._histograms:
                self._histograms[name] = Histogram(name, description, buckets)
            return self._histograms[name]
    
    def get_all_metrics(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "counters": {k: v.get() for k, v in self._counters.items()},
                "gauges": {k: v.get() for k, v in self._gauges.items()},
                "histograms": {
                    k: {"count": v.get_count(), "sum": v.get_sum()}
                    for k, v in self._histograms.items()
                },
            }


class TaskQueueMetrics:
    """Metrics specific to the task queue system."""
    
    def __init__(self, registry: Optional[MetricsRegistry] = None):
        self._registry = registry or MetricsRegistry()
        
        self.jobs_submitted = self._registry.counter(
            "taskqueue_jobs_submitted_total",
            "Total number of jobs submitted"
        )
        self.jobs_completed = self._registry.counter(
            "taskqueue_jobs_completed_total",
            "Total number of jobs completed successfully"
        )
        self.jobs_failed = self._registry.counter(
            "taskqueue_jobs_failed_total",
            "Total number of jobs that failed"
        )
        self.jobs_retried = self._registry.counter(
            "taskqueue_jobs_retried_total",
            "Total number of job retries"
        )
        self.jobs_dead_lettered = self._registry.counter(
            "taskqueue_jobs_dead_lettered_total",
            "Total number of jobs sent to dead-letter queue"
        )
        
        self.queue_depth = self._registry.gauge(
            "taskqueue_queue_depth",
            "Current number of jobs in queue"
        )
        self.queue_depth_by_priority = self._registry.gauge(
            "taskqueue_queue_depth_by_priority",
            "Current queue depth by priority level"
        )
        self.running_jobs = self._registry.gauge(
            "taskqueue_running_jobs",
            "Current number of jobs being processed"
        )
        self.worker_count = self._registry.gauge(
            "taskqueue_worker_count",
            "Number of active workers"
        )
        self.dlq_depth = self._registry.gauge(
            "taskqueue_dlq_depth",
            "Number of jobs in dead-letter queue"
        )
        
        self.job_latency = self._registry.histogram(
            "taskqueue_job_latency_seconds",
            "Job processing latency in seconds",
            buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0, float("inf"))
        )
        self.job_wait_time = self._registry.histogram(
            "taskqueue_job_wait_time_seconds",
            "Time jobs spend waiting in queue"
        )
    
    def record_job_submitted(self, priority: Priority):
        self.jobs_submitted.inc()
        self.jobs_submitted.inc(labels={"priority": priority.name})
    
    def record_job_completed(self, duration_seconds: float, priority: Priority):
        self.jobs_completed.inc()
        self.jobs_completed.inc(labels={"priority": priority.name})
        self.job_latency.observe(duration_seconds)
        self.job_latency.observe(duration_seconds, labels={"priority": priority.name})
    
    def record_job_failed(self, priority: Priority):
        self.jobs_failed.inc()
        self.jobs_failed.inc(labels={"priority": priority.name})
    
    def record_job_retried(self):
        self.jobs_retried.inc()
    
    def record_dead_letter(self):
        self.jobs_dead_lettered.inc()
    
    def update_queue_depth(self, total: int, by_priority: Dict[Priority, int]):
        self.queue_depth.set(total)
        for priority, count in by_priority.items():
            self.queue_depth_by_priority.set(count, labels={"priority": priority.name})
    
    def update_running_jobs(self, count: int):
        self.running_jobs.set(count)
    
    def update_worker_count(self, count: int):
        self.worker_count.set(count)
    
    def update_dlq_depth(self, count: int):
        self.dlq_depth.set(count)
    
    def get_stats(self) -> QueueStats:
        return QueueStats(
            total_jobs=int(self.jobs_submitted.get()),
            pending_jobs=int(self.queue_depth.get()),
            running_jobs=int(self.running_jobs.get()),
            completed_jobs=int(self.jobs_completed.get()),
            failed_jobs=int(self.jobs_failed.get()),
            dead_jobs=int(self.dlq_depth.get()),
            avg_processing_time_ms=(
                self.job_latency.get_sum() / max(1, self.job_latency.get_count()) * 1000
            ),
        )
    
    def export_prometheus(self) -> str:
        """Export metrics in Prometheus text format."""
        lines = []
        
        def add_metric(name: str, mtype: str, value: Any, labels: Optional[Dict] = None):
            label_str = ""
            if labels:
                label_str = "{" + ",".join(f'{k}="{v}"' for k, v in labels.items()) + "}"
            lines.append(f"{name}{label_str} {value}")
        
        add_metric("taskqueue_jobs_submitted_total", "counter", self.jobs_submitted.get())
        add_metric("taskqueue_jobs_completed_total", "counter", self.jobs_completed.get())
        add_metric("taskqueue_jobs_failed_total", "counter", self.jobs_failed.get())
        add_metric("taskqueue_jobs_retried_total", "counter", self.jobs_retried.get())
        add_metric("taskqueue_queue_depth", "gauge", self.queue_depth.get())
        add_metric("taskqueue_running_jobs", "gauge", self.running_jobs.get())
        add_metric("taskqueue_worker_count", "gauge", self.worker_count.get())
        add_metric("taskqueue_dlq_depth", "gauge", self.dlq_depth.get())
        
        add_metric("taskqueue_job_latency_seconds_count", "histogram", self.job_latency.get_count())
        add_metric("taskqueue_job_latency_seconds_sum", "histogram", self.job_latency.get_sum())
        
        return "\n".join(lines)


@dataclass
class JobInspection:
    """Job inspection result for REST API."""
    job: Job
    queue_position: Optional[int] = None
    estimated_wait_ms: Optional[float] = None
    dependency_status: Dict[str, str] = field(default_factory=dict)


class QueueManagementAPI:
    """REST API-like interface for queue management operations."""
    
    def __init__(self, metrics: TaskQueueMetrics):
        self._metrics = metrics
        self._jobs: Dict[str, Job] = {}
        self._lock = threading.RLock()
    
    def register_job(self, job: Job):
        with self._lock:
            self._jobs[job.id] = job
    
    def unregister_job(self, job_id: str):
        with self._lock:
            self._jobs.pop(job_id, None)
    
    def get_job(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)
    
    def list_jobs(
        self,
        status: Optional[JobStatus] = None,
        priority: Optional[Priority] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Job]:
        with self._lock:
            jobs = list(self._jobs.values())
            
            if status:
                jobs = [j for j in jobs if j.status == status]
            if priority:
                jobs = [j for j in jobs if j.priority == priority.value]
            
            return jobs[offset : offset + limit]
    
    def get_queue_stats(self) -> QueueStats:
        return self._metrics.get_stats()
    
    def cancel_job(self, job_id: str) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            if job and job.status in (JobStatus.PENDING, JobStatus.SCHEDULED):
                job.status = JobStatus.FAILED
                job.last_error = "Cancelled by user"
                return True
            return False
    
    def update_job_priority(self, job_id: str, new_priority: Priority) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            if job and job.status == JobStatus.PENDING:
                job.priority = new_priority.value
                return True
            return False
    
    def inspect_job(self, job_id: str) -> Optional[JobInspection]:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            
            return JobInspection(job=job)
    
    def get_workers(self) -> List[WorkerInfo]:
        return []
    
    def get_metrics(self) -> Dict[str, Any]:
        return self._metrics._registry.get_all_metrics()
    
    def get_prometheus_metrics(self) -> str:
        return self._metrics.export_prometheus()
