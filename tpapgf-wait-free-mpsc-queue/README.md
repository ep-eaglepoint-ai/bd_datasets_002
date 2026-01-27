# TPAPGF -  Wait-Free MPSC Queue

**Category:** sft

## Overview
- Task ID: TPAPGF
- Title:  Wait-Free MPSC Queue
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: tpapgf-wait-free-mpsc-queue

## Requirements
- Wait-Free Enqueue Operation - The enqueue operation must be wait-free: it must complete in a bounded number of steps (≤ 20 atomic operations) regardless of other thread activity. - When a high-priority producer thread calls enqueue(), it must NEVER be blocked by low-priority threads holding locks (no priority inversion). - The enqueue operation must complete in < 1 microsecond at p99 latency, measured with high-resolution timer (time.perf_counter_ns()). - When 8 producer threads call enqueue() simultaneously on the same queue, all 8 must complete within 10 microseconds total (< 1.25μs average per thread). - The enqueue operation must use only atomic operations (compare-and-swap, atomic load, atomic store) - NO locks, NO mutexes, NO blocking. - When the queue is bounded and full, enqueue() must return False immediately (< 100 nanoseconds) without blocking or retrying. - The enqueue operation must be linearizable: there exists a total order of operations consistent with real-time ordering
- Lock-Free Dequeue Operation - The dequeue operation must be lock-free: at least one thread makes progress in bounded time, even if individual threads may retry CAS operations. - The dequeue operation must use only compare-and-swap (CAS) operations for synchronization - NO locks, NO mutexes. - When the queue is empty, dequeue() must return None immediately (< 100 nanoseconds) without blocking or spinning. - The dequeue operation must complete in < 5 microseconds at p99 latency, including CAS retries. - When CAS fails due to contention, the dequeue operation must retry with exponential backoff (1ns, 2ns, 4ns, ..., max 1μs) to reduce contention. - The dequeue operation must guarantee system-wide progress: if any thread is calling dequeue() and the queue is non-empty, at least one thread will successfully dequeue within bounded time. - After 1000 CAS retries without success, the operation must log warning: "Dequeue experiencing high contention (1000 CAS failures)" and continue retrying.
- Multi-Producer Single-Consumer Support - The queue must support exactly 8 concurrent producer threads and 1 consumer thread. - When 8 producers enqueue 1000 messages each (8000 total), the consumer must dequeue exactly 8000 messages with no loss or duplication. - Messages from a single producer must be dequeued in FIFO order (if producer enqueues [A, B, C], consumer must dequeue [A, B, C] in that order). - Messages from different producers may be interleaved in any order (no global FIFO guarantee across producers). - The queue must remain correct under high contention: 8 producers + 1 consumer all operating at maximum speed (100,000 messages/sec total). - The implementation must scale linearly with producer count: 16 producers should achieve ~2x throughput of 8 producers (up to hardware limits).
- Generic Message Support - The queue must support arbitrary Python objects as messages: str, int, dict, list, custom classes, None (as a message, not as empty indicator). - Messages must be stored by reference (not copied) to minimize overhead and support large objects. - When a producer enqueues a mutable object (e.g., dict), the consumer must receive the same object reference (not a copy). - The queue must not impose restrictions on message types (no serialization required). - Message size overhead must be ≤ 64 bytes per message (Node object + atomic reference + metadata). - The queue must handle messages of varying sizes (1 byte to 1MB) without performance degradation.
- Memory Safety and Reclamation - The implementation must prevent use-after-free bugs: a node must not be freed while any thread holds a reference to it. - The implementation must prevent memory leaks: all dequeued nodes must eventually be garbage collected. - When 1 million messages are enqueued and dequeued, memory usage must return to baseline after Python GC runs (proving no memory leak). - The implementation must use one of the following safe memory reclamation strategies:   - Hazard Pointers: Consumer marks nodes as "hazardous" before accessing, producers check hazard list before freeing   - Epoch-Based Reclamation: Track global epoch, defer deletion until all threads have moved past that epoch   - Python GC (simplified): Rely on reference counting, ensure no dangling references before releasing nodes - Memory reclamation overhead must be < 10% of total operation time. - After 1 hour of continuous operation at 100K messages/sec, memory usage must be stable (±5% variance, proving no leak).
- ### 6. Bounded Queue Support (Optional but Recommended) - The queue must support an optional capacity limit (e.g., capacity=10000). - When the queue is full (size == capacity), enqueue() must return False immediately without blocking or modifying the queue. - When the queue is unbounded (capacity=None), enqueue() must always succeed (return True) unless out of memory. - The size counter must be atomic (using threading.atomic or ctypes.c_long with atomic operations). - When 8 producers attempt to enqueue into a full queue simultaneously, all 8 must receive False without corrupting the queue state. - The capacity check must be atomic: check size < capacity and increment size must be a single atomic operation (or use CAS loop).
- Atomic Operations and Memory Ordering - All shared state (head pointer, tail pointer, size counter) must be accessed using atomic operations with appropriate memory ordering. - Atomic loads must use acquire semantics to ensure visibility of previous writes. - Atomic stores must use release semantics to ensure writes are visible to other threads. - Compare-and-swap (CAS) operations must use sequentially consistent ordering to prevent reordering. - The implementation must use ctypes or a custom atomic wrapper to implement CAS on Python objects (Python's threading module doesn't provide CAS). - On x86-64 architecture, the implementation must leverage hardware support for atomic operations (LOCK prefix, CMPXCHG instruction).
- ABA Problem Prevention - The implementation must prevent the ABA problem: Consumer reads head=A, another thread dequeues A and enqueues A again, consumer's CAS succeeds but A is a different instance. - Solution 1: Use tagged pointers (combine pointer with version counter in a single atomic word). - Solution 2: Use hazard pointers to prevent premature reuse of nodes. - Solution 3: Use epoch-based reclamation to delay node reuse until safe. - When the ABA problem is prevented, the following scenario must not cause corruption:   - Consumer reads head=Node(value=1, address=0x1000)   - Producer dequeues Node(0x1000), enqueues new Node(value=2, address=0x1000) (same address reused)   - Consumer's CAS must fail (detecting the change) or succeed safely (if using tagged pointers)
- Performance and Throughput Requirements - The queue must support 100,000 messages/second total throughput (8 producers × 12,500 msg/sec each). - At peak load (100K msg/sec), CPU utilization must be < 50% on a 4-core system (2 cores worth of compute). - Enqueue latency must be < 1 microsecond at p99 (99th percentile). - Dequeue latency must be < 5 microseconds at p99 (99th percentile). - At low load (10K msg/sec), latency must be < 500 nanoseconds at p99 for both enqueue and dequeue. - The queue must handle burst traffic: 500,000 messages/sec for 1 second without crashes or data corruption. - Throughput must scale linearly with producer count up to 16 producers (limited by hardware, not algorithm).
- Priority Inversion Prevention - The queue must eliminate priority inversion: high-priority threads must never be blocked waiting for low-priority threads. - When a high-priority producer thread (nice=-20) and low-priority producer thread (nice=19) both call enqueue(), the high-priority thread must complete in < 1μs regardless of low-priority thread state. - The wait-free guarantee ensures that even if a low-priority thread is preempted mid-operation, high-priority threads can still make progress. - Priority inversion test: Run 1 high-priority producer and 7 low-priority producers at 100K msg/sec total.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
