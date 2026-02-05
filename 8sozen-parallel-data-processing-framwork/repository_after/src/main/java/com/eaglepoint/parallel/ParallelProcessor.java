package com.eaglepoint.parallel;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

public class ParallelProcessor<T, M, R> {

    private List<T> listData;
    private DataSource<T> dataSource;
    private Mapper<T, M> mapper;
    private Reducer<M, R> reducer;
    
    private ForkJoinPool forkJoinPool;
    private ExecutorService customExecutor;
    private boolean useCommonPool = false;
    private boolean useParallelStream = false;
    private int parallelism = Runtime.getRuntime().availableProcessors();
    
    private ProgressListener progressListener;
    private Duration progressUpdateInterval = Duration.ofMillis(100);
    
    private boolean failFast = false;
    private CancellationToken cancellationToken;
    private Duration timeout;
    private int threshold = -1; // -1 indicates default
    private int maxPendingTasks = -1;

    // Execution Modes
    public static <T, M, R> ParallelProcessor<T, M, R> withForkJoin() {
        ParallelProcessor<T, M, R> processor = new ParallelProcessor<>();
        processor.useCommonPool = true;
        return processor;
    }

    public static <T, M, R> ParallelProcessor<T, M, R> withCustomPool(ForkJoinPool pool) {
        ParallelProcessor<T, M, R> processor = new ParallelProcessor<>();
        processor.forkJoinPool = pool;
        return processor;
    }
    
    public static <T, M, R> ParallelProcessor<T, M, R> withExecutor(ExecutorService executor, int parallelism) {
        ParallelProcessor<T, M, R> processor = new ParallelProcessor<>();
        processor.customExecutor = executor;
        processor.parallelism = parallelism;
        return processor;
    }

    public static <T, M, R> ParallelProcessor<T, M, R> withParallelStream() {
        ParallelProcessor<T, M, R> processor = new ParallelProcessor<>();
        processor.useParallelStream = true;
        return processor;
    }
    
    public static <T, M, R> ParallelProcessor<T, M, R> withCancellation(CancellationToken token) {
        ParallelProcessor<T, M, R> processor = new ParallelProcessor<>();
        processor.cancellationToken = token;
        return processor;
    }

    // Config Methods
    public ParallelProcessor<T, M, R> withProgressListener(ProgressListener listener) {
        this.progressListener = listener;
        return this;
    }
    
    public ParallelProcessor<T, M, R> withProgressUpdateInterval(Duration interval) {
        this.progressUpdateInterval = interval;
        return this;
    }
    
    public ParallelProcessor<T, M, R> withFailFast(boolean failFast) {
        this.failFast = failFast;
        return this;
    }
    
    public ParallelProcessor<T, M, R> withTimeout(Duration timeout) {
        this.timeout = timeout;
        return this;
    }

    public ParallelProcessor<T, M, R> withThreshold(int threshold) {
        this.threshold = threshold;
        return this;
    }

    public ParallelProcessor<T, M, R> withMaxPendingTasks(int maxTasks) {
        this.maxPendingTasks = maxTasks;
        return this;
    }

    // Builder Methods
    public ParallelProcessor<T, M, R> source(List<T> data) {
        this.listData = data;
        this.dataSource = new DataSource<T>() {
            public long estimatedSize() { return data.size(); }
            public Iterator<T> iterator() { return data.iterator(); }
            public boolean supportsRandomAccess() { return true; }
        };
        return this;
    }
    
    public ParallelProcessor<T, M, R> source(Iterable<T> data) {
        if (data instanceof List) {
            return source((List<T>) data);
        }
        this.dataSource = new DataSource<T>() {
            public long estimatedSize() { 
                if (data instanceof Collection) return ((Collection<?>) data).size();
                return Long.MAX_VALUE; 
            }
            public Iterator<T> iterator() { return data.iterator(); }
            public boolean supportsRandomAccess() { return false; }
        };
        return this;
    }

    public ParallelProcessor<T, M, R> source(Iterator<T> iterator) {
        this.dataSource = new DataSource<T>() {
            public long estimatedSize() { return Long.MAX_VALUE; }
            public Iterator<T> iterator() { return iterator; }
            public boolean supportsRandomAccess() { return false; }
        };
        return this;
    }

    public ParallelProcessor<T, M, R> source(Stream<T> stream) {
        return source(stream.iterator());
    }

    public ParallelProcessor<T, M, R> source(java.util.function.Supplier<T> supplier) {
        // Infinite stream from supplier
        return source(Stream.generate(supplier).iterator());
    }

    public <NewM> ParallelProcessor<T, NewM, R> map(Mapper<T, NewM> mapper) {
        ParallelProcessor<T, NewM, R> newProcessor = (ParallelProcessor<T, NewM, R>) this;
        newProcessor.mapper = mapper;
        return newProcessor;
    }

    public <NewR> ParallelProcessor<T, M, NewR> reduce(Reducer<M, NewR> reducer) {
        ParallelProcessor<T, M, NewR> newProcessor = (ParallelProcessor<T, M, NewR>) this;
        newProcessor.reducer = reducer;
        return newProcessor;
    }

    public R execute() {
        if (timeout != null) {
            if (cancellationToken == null) {
                cancellationToken = new CancellationToken();
            }
            ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
            scheduler.schedule(() -> cancellationToken.cancel(), timeout.toMillis(), TimeUnit.MILLISECONDS);
            scheduler.shutdown();
        }

        if (useParallelStream) {
            if (listData != null) {
                return listData.parallelStream()
                        .map(mapper::map)
                        .reduce(reducer.identity(), reducer::reduce, reducer::combine);
            } else {
                 throw new UnsupportedOperationException("Parallel stream execution currently only supported for List sources");
            }
        }

        Queue<Throwable> exceptions = new ConcurrentLinkedQueue<>();
        AtomicLong processedCount = (progressListener != null) ? new AtomicLong(0) : null;
        long totalCount = dataSource != null ? dataSource.estimatedSize() : 0;
        long startTime = System.currentTimeMillis();

        // Start progress monitor if needed
        ScheduledExecutorService monitor = null;
        if (progressListener != null) {
            monitor = Executors.newScheduledThreadPool(1);
            monitor.scheduleAtFixedRate(() -> {
                long processed = processedCount.get();
                double percent = totalCount > 0 ? (double) processed / totalCount * 100 : 0;
                progressListener.onProgress(percent, processed, totalCount);
                
                long elapsed = System.currentTimeMillis() - startTime;
                if (processed > 0 && elapsed > 0) {
                     double rate = (double) processed / elapsed; // items per ms
                     long remainingItems = totalCount - processed;
                     if (totalCount == Long.MAX_VALUE) remainingItems = 0; // Unknown
                     if (remainingItems > 0 && rate > 0) {
                         progressListener.onEstimatedTimeRemaining(Duration.ofMillis((long) (remainingItems / rate)));
                     }
                }
            }, 0, progressUpdateInterval.toMillis(), TimeUnit.MILLISECONDS);
        }

        try {
            R result;
            int effectiveThreshold = threshold > 0 ? threshold : 
                (listData != null ? Math.max(listData.size() / (parallelism * 4), 100) : 100);

            if (listData != null && dataSource.supportsRandomAccess()) {
                if (customExecutor != null) {
                    Partitioner<T> partitioner = new EvenPartitioner<>();
                    List<List<T>> partitions = partitioner.partition(listData, parallelism);
                    List<Future<R>> futures = new ArrayList<>();
                    
                    for (int pIdx = 0; pIdx < partitions.size(); pIdx++) {
                        final List<T> part = partitions.get(pIdx);
                        final int partGlobalStart = pIdx * (listData.size() / partitions.size());
                        futures.add(customExecutor.submit(() -> {
                            R localAcc = reducer.identity();
                            for (int i = 0; i < part.size(); i++) {
                                if (cancellationToken != null && cancellationToken.isCancelled()) {
                                    throw new CancellationException();
                                }
                                try {
                                    localAcc = reducer.reduce(localAcc, mapper.map(part.get(i)));
                                    if (processedCount != null) {
                                        long current = processedCount.incrementAndGet();
                                        triggerProgressIfPercentage(current, totalCount, startTime, progressListener);
                                    }
                                } catch (Exception e) {
                                    handleException(e, part.get(i), partGlobalStart + i, exceptions);
                                }
                            }
                            return localAcc;
                        }));
                    }
                    
                    result = reducer.identity();
                    for (Future<R> f : futures) {
                        try {
                            result = reducer.combine(result, f.get());
                        } catch (Exception e) {
                            exceptions.add(e);
                        }
                    }
                } else {
                    TaskContext context = new TaskContext(processedCount, exceptions, cancellationToken, failFast, progressListener, totalCount, startTime);
                    ParallelTask<T, M, R> task = new ParallelTask<>(
                        listData, 0, listData.size(), mapper, reducer, effectiveThreshold, context
                    );
                    ForkJoinPool pool = forkJoinPool != null ? forkJoinPool : ForkJoinPool.commonPool();
                    result = pool.invoke(task);
                }
            } else {
                BufferedPartitioner<T, M, R> partitioner = new BufferedPartitioner<>(
                    dataSource, mapper, reducer, forkJoinPool, parallelism, effectiveThreshold,
                    cancellationToken, progressListener, failFast, maxPendingTasks
                );
                result = partitioner.execute(processedCount, exceptions, totalCount, startTime);
            }
            
            if (!exceptions.isEmpty()) {
                throw new ParallelProcessingException(
                    "Parallel processing failed: " + exceptions.size() + " of " + totalCount + " elements failed", 
                    exceptions.size(), 
                    new ArrayList<>(exceptions)
                );
            }
            
            return result;
        } finally {
            if (monitor != null) monitor.shutdownNow();
        }
    }

    private void triggerProgressIfPercentage(long processed, long totalCount, long startTime, ProgressListener listener) {
        if (listener == null || totalCount <= 0 || totalCount == Long.MAX_VALUE) return;
        if (processed % Math.max(1, totalCount / 100) == 0) {
            double percent = (double) processed / totalCount * 100;
            listener.onProgress(percent, processed, totalCount);
        }
    }
    
    private void handleException(Throwable e, T element, int index, Queue<Throwable> exceptions) {
        if (e instanceof CancellationException) return;
        exceptions.add(new ProcessingFailure(element, index, e));
        if (failFast) {
            if (cancellationToken != null) cancellationToken.cancel();
            else throw new RuntimeException(e); // If no token, hard fail
        }
    }

    static class TaskContext {
        final AtomicLong processedCount;
        final Queue<Throwable> exceptions;
        final CancellationToken cancellationToken;
        final boolean failFast;
        final ProgressListener progressListener;
        final long totalCount;
        final long startTime;

        TaskContext(AtomicLong processedCount, Queue<Throwable> exceptions, CancellationToken cancellationToken,
                    boolean failFast, ProgressListener progressListener, long totalCount, long startTime) {
            this.processedCount = processedCount;
            this.exceptions = exceptions;
            this.cancellationToken = cancellationToken;
            this.failFast = failFast;
            this.progressListener = progressListener;
            this.totalCount = totalCount;
            this.startTime = startTime;
        }
    }

    static class ParallelTask<T, M, R> extends RecursiveTask<R> {
        private final List<T> data;
        private final int start;
        private final int end;
        private final Mapper<T, M> mapper;
        private final Reducer<M, R> reducer;
        private final int threshold;
        private final TaskContext context;
        
        public ParallelTask(List<T> data, int start, int end, Mapper<T, M> mapper, Reducer<M, R> reducer, 
                            int threshold, TaskContext context) {
            this.data = data;
            this.start = start;
            this.end = end;
            this.mapper = mapper;
            this.reducer = reducer;
            this.threshold = threshold;
            this.context = context;
        }
        
        @Override
        protected R compute() {
             if (context.cancellationToken != null && context.cancellationToken.isCancelled()) {
                 completeExceptionally(new CancellationException());
                 return null;
             }
             
             if (end - start <= threshold) {
                 R acc = reducer.identity();
                 for (int i = start; i < end; i++) {
                     if (i % 100 == 0 && context.cancellationToken != null && context.cancellationToken.isCancelled()) {
                         completeExceptionally(new CancellationException());
                         return null;
                     }
                     
                     T element = data.get(i);
                     try {
                         M mapped = mapper.map(element);
                         acc = reducer.reduce(acc, mapped);
                         if (context.processedCount != null) {
                             long current = context.processedCount.incrementAndGet();
                             triggerProgressIfPercentage(current, context.totalCount, context.startTime, context.progressListener);
                         }
                     } catch (Exception e) {
                         handleException(e, element, i, context.exceptions);
                     }
                 }
                 return acc;
             } else {
                 int mid = (start + end) / 2;
                 ParallelTask<T, M, R> left = new ParallelTask<>(data, start, mid, mapper, reducer, threshold, context);
                 ParallelTask<T, M, R> right = new ParallelTask<>(data, mid, end, mapper, reducer, threshold, context);
                 
                 left.fork();
                 R rightResult = right.compute();
                 R leftResult = left.join();
                 
                 return reducer.combine(leftResult, rightResult); 
             }
        }

        private void triggerProgressIfPercentage(long processed, long totalCount, long startTime, ProgressListener listener) {
            if (listener == null || totalCount <= 0 || totalCount == Long.MAX_VALUE) return;
            if (processed % Math.max(1, totalCount / 100) == 0) {
                double percent = (double) processed / totalCount * 100;
                listener.onProgress(percent, processed, totalCount);
            }
        }

        private void handleException(Throwable e, T element, int index, Queue<Throwable> exceptions) {
            if (e instanceof CancellationException) return;
            exceptions.add(new ProcessingFailure(element, index, e));
            if (context.failFast) {
                if (context.cancellationToken != null) context.cancellationToken.cancel();
                else throw new RuntimeException(e);
            }
        }
    }
}
