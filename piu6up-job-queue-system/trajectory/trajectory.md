# Trajectory

## Task
Implement a production-grade Python in-memory job queue system with heap-based priority scheduling, delayed execution, automatic retries with exponential backoff, and dead-letter handling.

## Implementation

### Core Components

1. **Job Class** (`repository_after/job_queue.py`)
   - Dataclass with all required fields (job_id, job_type, payload, priority, etc.)
   - Factory method `Job.create()` with validation
   - Comparison methods for heap ordering (priority > scheduled_at > created_at)
   - Serialization with `to_dict()` and `from_dict()`

2. **JobStatus Enum**
   - PENDING, SCHEDULED, RUNNING, COMPLETED, FAILED, DEAD states

3. **JobQueue Class**
   - Heap-based priority queue using heapq module
   - O(1) lookup via dictionary mapping job_id to Job
   - Tombstone pattern for efficient removal
   - Thread-safe with threading.Lock
   - Support for job dependencies

4. **Worker Class**
   - Threading.Thread subclass for job execution
   - Timeout handling with ThreadPoolExecutor
   - Exponential backoff with jitter for retries
   - Dead letter queue integration

5. **JobQueueManager Class**
   - Primary interface for the system
   - Multiple named queues support
   - Handler registration and job routing
   - Worker pool management
   - Context manager protocol
   - Statistics tracking

### Key Features
- Priority-based scheduling (1-10, higher = first)
- Delayed/scheduled job execution
- Automatic retries with exponential backoff
- Dead letter queue for failed jobs
- Job dependencies with DAG validation
- Thread-safe concurrent access
- Event callbacks for monitoring
- JSON serialization for persistence

## Tests

35 comprehensive tests covering:
- Job creation and validation
- Priority ordering
- Queue operations (enqueue, dequeue, peek)
- Scheduled job handling
- Job dependencies
- Worker execution and error handling
- Retry logic with backoff
- Timeout handling
- Event callbacks
- Manager operations
- Thread safety and stress testing
