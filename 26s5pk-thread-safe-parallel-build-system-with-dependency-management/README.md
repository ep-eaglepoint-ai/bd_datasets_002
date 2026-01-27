# 26S5PK - Thread-Safe Parallel Build System with Dependency Management

**Category:** sft

## Overview
- Task ID: 26S5PK
- Title: Thread-Safe Parallel Build System with Dependency Management
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 26s5pk-thread-safe-parallel-build-system-with-dependency-management

## Requirements
- uild Configuration Parsing and Validation - The build configuration must be parsed from JSON format within 100ms for files up to 500KB containing up to 200 tasks. - When the configuration file is missing, the system must fail with error: "Build configuration not found at path: {path}" and exit code 2. - When JSON is malformed, the system must report: "Invalid JSON at line {line}, column {col}: {error_detail}" and exit code 2. - When a task references a non-existent dependency, the system must fail before starting any builds with error: "Task '{task}' depends on unknown task '{dependency}'" and exit code 2. - When a task has no output artifact specified, the system must fail with error: "Task '{task}' must specify output_artifact" and exit code 2. - When two tasks specify the same output artifact path, the system must fail with error: "Duplicate output artifact '{path}' specified by tasks '{task1}' and '{task2}'" and exit code 2.
- Dependency Graph Construction and Validation - The dependency graph must be constructed in O(V + E) time where V = number of tasks and E = number of dependencies. - For a configuration with 80 tasks and 200 dependencies, graph construction must complete in < 50ms. - Circular dependencies must be detected using depth-first search before any builds start. - When a circular dependency is found, the system must report: "Circular dependency detected: A → B → C → A" and exit code 2. - Diamond dependencies (A→B, A→C, B→D, C→D) must be handled correctly: D must wait for both B and C to complete, and D must be built exactly once. - The system must support forest graphs (multiple independent dependency trees) and execute them in parallel.
- Parallel Task Execution with Worker Pool - The system must create exactly num_workers worker threads (default 8) using threading.Thread or multiprocessing.Process. - Tasks must be distributed to workers using a thread-safe queue (queue.Queue for threading, multiprocessing.Queue for multiprocessing). - When 8 independent tasks are ready to build, all 8 workers must be busy simultaneously (verified by worker status logs). - When only 3 tasks are ready to build, exactly 3 workers must be busy and 5 must be idle waiting for tasks. - Workers must continuously poll the task queue and process tasks until all tasks are complete or failed. - Worker threads must be joined at the end to ensure all work completes before returning results. - Each worker must log when it starts and completes a task: "Worker {id}: Started task '{task}'" and "Worker {id}: Completed task '{task}' in {duration}s".
- Dependency-Aware Task Scheduling - A task must NOT be added to the work queue until ALL of its dependencies have completed successfully. - When task A depends on [B, C, D] and B completes at t=1s, C at t=2s, D at t=3s, task A must be queued at t=3s (after D completes). - The system must use threading.Event objects to signal task completion: each task has an event that is set when the task completes. - When a task completes, the scheduler must check all pending tasks to see if their dependencies are now satisfied, and queue any that are ready. - For a linear dependency chain (A→B→C→D→E), tasks must execute sequentially in order, with only 1 worker busy at a time. - For a diamond dependency (A→B, A→C, B→D, C→D), the execution order must be: A first, then B and C in parallel, then D after both complete. - Dependency checking and task queuing must add < 5ms overhead per task.
- Thread-Safe Status Tracking - Each task must have a status field: "pending", "running", "completed", "failed", or "skipped". - Status updates must be protected by a lock (threading.Lock) to prevent race conditions. - When 2 workers attempt to start the same task simultaneously, exactly 1 must succeed (status changes to "running") and the other must detect it's already running and skip it. - The status update sequence must be atomic: check if status is "pending", if yes set to "running", else skip. - When a task completes successfully, its status must be set to "completed" and its completion event must be set (event.set()). - When a task fails, its status must be set to "failed" and all tasks that depend on it (directly or transitively) must be marked as "skipped" without being queued. - Status queries must be thread-safe: any thread must be able to read task status without data races.
- Atomic Artifact Creation - Artifacts must be written using the atomic write pattern: write to temporary file, then rename to final path. - The temporary file must have a unique name including process ID and thread ID: "{output}.tmp.{pid}.{tid}". - After writing content to the temporary file, the system must call os.fsync() to ensure data is flushed to disk before renaming. - The rename operation (os.rename) must be atomic on POSIX systems, preventing partial writes from being visible. - When 2 workers attempt to write to the same artifact path simultaneously (should not happen with correct scheduling), the atomic rename ensures only one succeeds and the artifact is not corrupted. - If a task fails after writing the temporary file, the temporary file must be cleaned up (deleted) in a finally block. - Artifact creation must be verified with SHA-256 checksum: compute hash of written artifact and compare to expected hash (if provided in config).
- Thread-Safe Build Cache - The build cache must map input_hash (SHA-256 of source files) to artifact_path. - Cache reads and writes must be protected by a threading.Lock to prevent race conditions. - The cache lookup sequence must be atomic: lock, check if key exists, return value or None, unlock. - The cache insertion sequence must be atomic: lock, insert key-value pair, unlock. - When 8 workers simultaneously check the cache for the same input_hash, exactly 1 must find it missing and build the task, while the other 7 must wait and then find the cached result. - Cache hits must skip task execution entirely: log "Task '{task}' skipped: cache hit (artifact: {path})" and mark status as "completed". - Cache misses must execute the task, then insert the result into the cache before marking as "completed". - The cache must be persisted to disk (.build_cache.json) after all builds complete, using atomic write pattern.
- Concurrent Cache Access Without Corruption - When 8 workers access the cache simultaneously, the cache must remain consistent (no lost entries, no corrupted data). - The cache implementation must prevent the following race condition:   - Worker A: lock, check key "abc" not found, unlock   - Worker B: lock, check key "abc" not found, unlock   - Worker A: lock, insert "abc" → artifact_A, unlock   - Worker B: lock, insert "abc" → artifact_B, unlock (overwrites A's entry) - Fix: Extend the lock to cover the entire check-and-insert sequence, OR use a check-and-build pattern where only one worker builds and others wait. - Cache operations must add < 10ms overhead per task (< 5% of typical task execution time).
- Thread-Safe Results Collection - Build results must be collected in a shared dictionary: results: Dict[str, BuildResult]. - The results dictionary must be protected by a threading.Lock to prevent concurrent write races. - When a worker completes a task, it must: lock results dict, insert result, unlock. - When 8 workers complete tasks simultaneously, all 8 results must be recorded (no lost results). - Each BuildResult must include: task_name, status, duration, worker_id, artifact_path, error_message (if failed). - The final build report must aggregate results: total_tasks, completed, failed, skipped, total_duration, worker_utilization.
- Progress Tracking and Logging - The system must display real-time progress showing which tasks are running on which workers. - Progress updates must be logged every 5 seconds: "Progress: {completed}/{total} tasks completed, {running} running, {pending} pending". - Each task start must log: "Worker {id}: Started task '{task}' (dependencies: {deps})". - Each task completion must log: "Worker {id}: Completed task '{task}' in {duration:.2f}s (artifact: {path})". - Each task failure must log: "Worker {id}: Failed task '{task}' after {duration:.2f}s (error: {error})". - Logs from multiple workers must not interleave (use a logging.Lock or queue-based logging). - The final summary must include: "Build completed in {total_time:.2f}s: {completed} succeeded, {failed} failed, {skipped} skipped".

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: threading, multiprocessing, queue, hashlib, pathlib, time, typing
- Databases: (none)
- Tools: (none)
- Best Practices: Thread-safe data structures, - Atomic file operations, - Lock-free algorithms where possible, - Comprehensive error handling, - Progress tracking and logging
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
