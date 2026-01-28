# 8SOZEN - parallel-data-processing-framwork

**Category:** sft

## Overview
- Task ID: 8SOZEN
- Title: parallel-data-processing-framwork
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8sozen-parallel-data-processing-framwork

## Requirements
- The implementation must define three functional interfaces with proper generic type parameters. Mapper<T, M> must declare method M map(T element) that transforms a single input element to an intermediate result. Reducer<M, R> must declare three methods: R identity() returning the identity value for the reduction, R reduce(R accumulator, M element) that combines an intermediate result into the accumulator, and R combine(R left, R right) that merges two partial results from parallel execution (must be associative for correct parallel reduction). Partitioner<T> must declare List<List<T>> partition(List<T> data, int numPartitions) for custom splitting strategies beyond simple halving. Default implementations must be provided: IdentityMapper that returns elements unchanged, SummingReducer for numeric summation, CountingReducer for element counting, and EvenPartitioner that splits data into equal-sized chunks. The interfaces must be annotated with @FunctionalInterface to enable lambda usage. Each interface must include comprehensive Javadoc explaining its contract, thread-safety requirements, and example usage patterns.
- Implement an inner class ParallelTask<T, M, R> extending java.util.concurrent.RecursiveTask<R>. The constructor must accept the data list, start and end indices (for zero-copy sub-task creation), mapper, reducer, and threshold. The compute() method must implement the divide-and-conquer algorithm: if (end - start) <= threshold, process sequentially by iterating from start to end, mapping each element, and reducing into a local accumulator initialized with reducer.identity(). If above threshold, calculate midpoint, create two sub-tasks for [start, mid) and [mid, end), call leftTask.fork() to schedule asynchronously, call rightTask.compute() to process in current thread (compute-right-fork-left pattern for efficiency), then call leftTask.join() to get left result, and finally return reducer.combine(leftResult, rightResult). The threshold must be configurable through the builder pattern with a sensible default of Math.max(data.size() / (Runtime.getRuntime().availableProcessors() * 4), 100). Task creation must avoid copying data by using index ranges into the original list.
- The ParallelProcessor class must provide three static factory methods for different execution modes. ParallelProcessor.withForkJoin() must return a processor using ForkJoinPool.commonPool() for Fork/Join execution with work-stealing. ParallelProcessor.withCustomPool(ForkJoinPool pool) must use a user-provided pool for resource isolation. ParallelProcessor.withExecutor(ExecutorService executor, int parallelism) must partition data and submit partitions as separate tasks to the executor, then aggregate results. All modes must expose the same fluent API: processor.source(List<T> data).map(Mapper<T, M> mapper).reduce(Reducer<M, R> reducer).execute() returning R. The withParallelStream() mode must use data.parallelStream().map(mapper::map).reduce(reducer.identity(), reducer::reduce, reducer::combine) for simple cases. Each mode must be documented with performance characteristics and use-case recommendations. The execute() method must be the terminal operation that triggers computation and blocks until complete.
- The framework must support optional progress monitoring through a ProgressListener interface with methods void onProgress(double percentComplete, long processedCount, long totalCount) and void onEstimatedTimeRemaining(Duration remaining). Progress updates must be batched to avoid overhead: update at most every 100ms or every 1% progress, whichever comes first. The ParallelTask must maintain an AtomicLong for processed count shared across all sub-tasks, incrementing after each element is processed. The processor must track start time and calculate ETA based on current throughput: remaining = (total - processed) / (processed / elapsed). Progress monitoring must be optional and add minimal overhead when disabled (no atomic operations if no listener registered). The builder must provide withProgressListener(ProgressListener listener) and withProgressUpdateInterval(Duration interval) configuration methods. Progress must be accurate even with work-stealing as the processed count is updated regardless of which worker processes each element.
- When exceptions occur during parallel processing, the framework must not fail fast on the first exception but continue processing remaining elements to completion (unless cancellation is requested), collecting all exceptions. Define ParallelProcessingException extending RuntimeException with methods List<Throwable> getSuppressedExceptions() and int getFailedCount(). After task completion, if any exceptions occurred, throw ParallelProcessingException with all collected exceptions added via addSuppressed(). The exception message must summarize: "Parallel processing failed: X of Y elements failed". Each sub-task must catch exceptions during element processing, store them in a thread-safe collection (ConcurrentLinkedQueue<Throwable>), and continue processing. The shared exception queue must be passed to all sub-tasks. A configuration option withFailFast(boolean failFast) must enable immediate termination on first exception for use cases where partial results are unacceptable. Exception handling must include the element that caused the failure when possible, wrapped in a ProcessingFailure record containing the element, index, and cause.
- The framework must support cancellation through a CancellationToken class with methods void cancel(), boolean isCancelled(), and void throwIfCancelled() which throws CancellationException. The token must be passed to ParallelProcessor.withCancellation(CancellationToken token) and propagated to all sub-tasks. Each ParallelTask must check token.isCancelled() before processing each batch of elements (not every element, for efficiency—check every 100 elements or configurable). When cancellation is detected, the task must return immediately with a partial result or identity value, and call ForkJoinTask.completeExceptionally(new CancellationException()) to signal cancellation. Parent tasks must check child task cancellation status after join() and propagate cancellation upward. The CancellationToken must use volatile boolean for visibility across threads. A timeout-based cancellation must be supported: withTimeout(Duration timeout) schedules a timer that calls token.cancel() after the duration expires. Cancelled tasks must not leave threads in inconsistent states or leak resources.
- In addition to List<T> input, the framework must support Iterator<T>, Iterable<T>, Stream<T>, and Supplier<T> (for generators) as data sources through overloaded source() methods. For non-random-access sources, the framework must implement buffered partitioning: read elements into fixed-size buffers (default 10,000), dispatch each full buffer as a task, and process buffers in parallel while reading continues. Define a DataSource<T> interface with methods long estimatedSize() (can return Long.MAX_VALUE for unknown), Iterator<T> iterator(), and boolean supportsRandomAccess(). The BufferedPartitioner must read from the iterator into ArrayLists, submitting each as a processing task when full. Back-pressure must be implemented: if processing falls behind reading, pause reading until pending task count drops below a threshold (default 2 * parallelism). This enables processing datasets larger than memory by maintaining only a sliding window of buffered partitions.
- The framework must provide pre-built operations as static methods in a ParallelOperations utility class. parallelMap(List<T> data, Function<T, R> mapper) must return List<R> with elements in the same order as input, using ForkJoin for parallel mapping and preserving order through index-based result placement. parallelFilter(List<T> data, Predicate<T> predicate) must return List<T> containing only elements matching the predicate, maintaining relative order. parallelSort(List<T> data, Comparator<T> comparator) must implement parallel merge sort: recursively sort halves in parallel, then merge. parallelReduce(List<T> data, T identity, BinaryOperator<T> accumulator) must perform parallel reduction with the Fork/Join pattern. parallelForEach(List<T> data, Consumer<T> action) must execute the action on all elements in parallel without collecting results. parallelFindAny(List<T> data, Predicate<T> predicate) must return Optional<T> with short-circuit evaluation—cancel remaining tasks once a match is found. Each operation must accept an optional ForkJoinPool parameter for custom pools, defaulting to commonPool(). Performance tests must verify these operations achieve at least 3x speedup over sequential equivalents on 4+ core machines for datasets of 1 million+ elements.

## Metadata
- Programming Languages: Java
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Quick Start

### Run Tests
```bash
# Docker
docker compose run --rm app mvn clean test

# Local
mvn clean test
```

### Run Evaluation
```bash
# Docker
docker compose run --rm app mvn clean compile exec:java "-Dexec.mainClass=com.eaglepoint.parallel.Evaluation" -q

# Local
mvn clean compile exec:java "-Dexec.mainClass=com.eaglepoint.parallel.Evaluation"
```

### Run Evaluation (Custom Output)
```bash
# Docker
docker compose run --rm app mvn clean compile exec:java "-Dexec.mainClass=com.eaglepoint.parallel.Evaluation" "-Dexec.args=--output /app/evaluation/report.json" -q

# Local
mvn clean compile exec:java "-Dexec.mainClass=com.eaglepoint.parallel.Evaluation" "-Dexec.args=--output /app/evaluation/report.json"
```

## Patches
To generate a patch for the implementation made:
```bash
git diff --no-index repository_before repository_after > patches/task_001.patch
```

## Expected Test Results

The test suite includes:
- ✓ Core interface implementations (IdentityMapper, SummingReducer, CountingReducer, EvenPartitioner)
- ✓ ParallelProcessor execution modes (ForkJoin, CustomPool, ParallelStream)
- ✓ Large dataset processing (1M+ elements)
- ✓ Exception handling and accumulation
- ✓ Fail-fast mode
- ✓ Progress monitoring
- ✓ Cancellation and timeouts
- ✓ ParallelOperations utilities (map, filter, sort, reduce, forEach, findAny)
- ✓ Performance benchmarks

## Performance Expectations

On a 4-core system:
- 1M element processing: < 100ms
- 10M element processing: < 500ms  
- Expected speedup: 3x+ over sequential

## Project Structure

```text
.
├── evaluation/                    # Directory for generated evaluation reports
├── instances/
│   └── instance.json              # Task metadata and problem statement
├── patches/
│   └── diff.patch                 # Patch file and implementation summary
├── repository_after/              # Production implementations
│   └── src/main/java/com/eaglepoint/parallel/
│       ├── Mapper.java            # Element transformation interface
│       ├── Reducer.java           # Parallel reduction interface
│       ├── Partitioner.java       # Data splitting interface
│       ├── IdentityMapper.java    # Default identity transformation
│       ├── SummingReducer.java    # Numeric summation implementation
│       ├── CountingReducer.java   # Element counting implementation
│       ├── EvenPartitioner.java   # Equal-sized chunk partitioner
│       ├── ParallelProcessor.java # Main processor with Task decomposition
│       ├── ParallelOperations.java# Static utility operations (map, sort, etc.)
│       ├── ProgressListener.java  # Progress monitoring interface
│       ├── CancellationToken.java # Cancellation and timeout support
│       ├── ParallelProcessingException.java # Aggregated error handling
│       ├── ProcessingFailure.java # Error detail record
│       ├── DataSource.java        # Data source abstraction
│       └── Evaluation.java        # Evaluation and benchmark script
├── repository_before/             # Baseline repository (empty)
├── tests/
│   └── ParallelFrameworkTest.java # Comprehensive JUnit 5 test suite
├── trajectory/
│   └── trajectory.md              # Implementation trajectory and notes
├── Dockerfile                     # Docker environment configuration
├── docker-compose.yml             # Docker Compose for test execution
├── pom.xml                        # Maven project configuration
└── README.md                      # Documentation and Quick Start guide
```

## Dependencies

- Java 17+
- Maven 3.6+
- JUnit 5.9.2 (for testing)

No external runtime dependencies!