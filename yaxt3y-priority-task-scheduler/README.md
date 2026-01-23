# YAXT3Y - priority task scheduler

**Category:** rl

## Overview
- Task ID: YAXT3Y
- Title: priority task scheduler
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: yaxt3y-priority-task-scheduler

## Requirements
- The optimized implementation must completely eliminate the find_task_by_id method that performs O(n) linear search through the task list on every invocation. Instead, a dictionary mapping task IDs to Task objects must be constructed during initialization and used for all subsequent lookups. This dictionary must be the single source of truth for task access, and no method in the scheduler should iterate through the task list to find a specific task by ID. The implementation must demonstrate that retrieving any task by its ID completes in constant time regardless of the total number of tasks in the system, which is critical for achieving overall O(n log n) complexity since task lookups occur in nearly every method of the scheduler.
- The circular dependency detection must be reimplemented using either Kahn's topological sort algorithm or depth-first search with three-color marking (white for unvisited, gray for in-progress, black for completed). The current implementation checks every pair of tasks and recursively computes transitive dependencies for each, resulting in O(n³) or worse complexity. The optimized version must build an adjacency list representation of the dependency graph once, then perform a single traversal to detect cycles. For Kahn's algorithm, this means maintaining in-degree counts and processing nodes with zero in-degree; for DFS, this means detecting back edges when encountering a gray node during traversal. The algorithm must terminate early upon detecting the first cycle and must not perform any redundant traversals of the dependency graph.
- The build_all_paths method that enumerates all possible execution paths must be completely removed and replaced with a proper critical path method implementation. The algorithm must first perform a topological sort of all tasks, then iterate through tasks in topological order computing the longest path to each node based on previously computed values. This requires storing the maximum path length ending at each task and the predecessor that achieved this maximum. The implementation must not use recursion without memoization, must not enumerate paths explicitly, and must not have any nested loops over the full task set. The critical path must be reconstructed by backtracking through the predecessor links after the forward pass completes, yielding the exact sequence of tasks that form the longest dependency chain.
- Every instance of bubble sort in the codebase must be replaced with either the sorted() built-in function or the list.sort() method, both of which implement the Timsort algorithm with O(n log n) worst-case time complexity. This includes the sort_by_priority method, the sort_by_deadline method, the scoring and sorting of available tasks in generate_schedule, and the schedule sorting in calculate_metrics. Where custom comparison logic is needed, the key parameter must be used with a lambda function or operator.attrgetter rather than implementing comparison logic manually. The implementation must not contain any nested loops that compare and swap adjacent elements, and performance testing must confirm that sorting 10,000 tasks completes in under 100 milliseconds.
- The calculate_priority_score method currently recalculates transitive dependencies from scratch for every task on every scheduling iteration, resulting in massive redundant computation. The optimized implementation must compute transitive dependencies exactly once per task using a topological traversal and cache these results in a dictionary. The memoization cache must be invalidated only when task status changes affect the cached values, not rebuilt from scratch on every call. Additionally, the dependency completion ratio calculation must maintain running counters that are updated incrementally as tasks complete rather than recounting completed dependencies on every score calculation. This optimization alone should reduce the complexity of the main scheduling loop from O(n³) to O(n² log n) in the worst case, with typical cases approaching O(n log n).
- The generate_report method currently builds a string through repeated concatenation using the + operator, which creates a new string object on each concatenation and results in O(n²) time complexity where n is the total length of the report. The optimized implementation must collect all string segments into a list and call the join method exactly once at the end to produce the final report string. Alternatively, the implementation may use io.StringIO with the write method for stream-based string building. This same pattern must be applied to the execution_log attribute, which is also built through repeated concatenation throughout the scheduling process. The implementation must not use += for string building anywhere in the codebase, and memory profiling must confirm that peak memory usage during report generation is proportional to the final report size rather than the sum of all intermediate string sizes.
- The current resource availability checking iterates through resource dictionaries multiple times per scheduling iteration and does not efficiently track which tasks are blocked on which resources. The optimized implementation must maintain a single dictionary tracking current available resources, with allocation and release operations completing in O(r) time where r is the number of resource types needed by a single task, not the total number of resources in the system. Additionally, the implementation should consider maintaining a reverse index from resources to tasks waiting for those resources, enabling O(1) lookup of which tasks become eligible when resources are released. The resource checking logic in get_available_tasks must be refactored to avoid the nested loop that currently checks each resource for each task, potentially by pre-computing resource eligibility masks or using set intersection operations.
- The generate_schedule method must be restructured to use a heap-based priority queue (heapq module) for selecting the next task to execute rather than repeatedly scoring all available tasks and sorting them with bubble sort. Tasks must be added to the priority queue when they become eligible (all dependencies satisfied and resources available) and the highest priority task must be retrieved in O(log n) time using heapq.heappop. When a task completes and releases resources, any newly eligible tasks must be added to the queue in O(log n) time per task. The implementation must not iterate through all pending tasks on every scheduling iteration, and the total number of priority queue operations across the entire scheduling process must be bounded by O(n log n) where n is the number of tasks. This requires careful management of when tasks are added to the queue to avoid duplicate entries and ensure the queue invariant is maintained.

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
