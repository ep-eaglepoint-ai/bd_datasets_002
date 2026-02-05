package com.eaglepoint.parallel;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

public class BufferedPartitioner<T, M, R> {
    private final DataSource<T> dataSource;
    private final Mapper<T, M> mapper;
    private final Reducer<M, R> reducer;
    private final ForkJoinPool pool;
    private final int parallelism;
    private final int threshold;
    private final CancellationToken cancellationToken;
    private final ProgressListener progressListener;
    private final boolean failFast;
    private final int maxPendingTasks;

    public BufferedPartitioner(DataSource<T> dataSource, Mapper<T, M> mapper, Reducer<M, R> reducer, 
                               ForkJoinPool pool, int parallelism, int threshold, 
                               CancellationToken cancellationToken, ProgressListener progressListener,
                               boolean failFast, int maxPendingTasks) {
        this.dataSource = dataSource;
        this.mapper = mapper;
        this.reducer = reducer;
        this.pool = pool;
        this.parallelism = parallelism;
        this.threshold = threshold;
        this.cancellationToken = cancellationToken;
        this.progressListener = progressListener;
        this.failFast = failFast;
        this.maxPendingTasks = maxPendingTasks > 0 ? maxPendingTasks : 2 * parallelism;
    }

    public R execute(AtomicLong processedCount, Queue<Throwable> exceptions, long totalCount, long startTime) {
        ForkJoinPool executor = pool != null ? pool : ForkJoinPool.commonPool();
        int bufferSize = Math.max(threshold, 10000);
        Iterator<T> it = dataSource.iterator();
        
        List<Future<R>> futures = new ArrayList<>();
        Semaphore backPressure = new Semaphore(maxPendingTasks);
        
        while (it.hasNext()) {
            if (cancellationToken != null && cancellationToken.isCancelled()) break;
            
            try {
                backPressure.acquire();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
            
            List<T> buffer = new ArrayList<>(bufferSize);
            for (int i = 0; i < bufferSize && it.hasNext(); i++) {
                buffer.add(it.next());
            }
            
            if (buffer.isEmpty()) {
                backPressure.release();
                continue;
            }

            final List<T> taskChunk = buffer;
            futures.add(executor.submit(() -> {
                try {
                    R acc = reducer.identity();
                    for (int i=0; i<taskChunk.size(); i++) {
                         if (cancellationToken != null && cancellationToken.isCancelled()) break;
                         
                         T element = taskChunk.get(i);
                         try {
                             acc = reducer.reduce(acc, mapper.map(element));
                             if (processedCount != null) {
                                 long current = processedCount.incrementAndGet();
                                 if (progressListener != null) {
                                     triggerProgressIfPercentage(current, totalCount, progressListener);
                                 }
                             }
                         } catch (Exception e) {
                             handleException(e, element, i, exceptions);
                         }
                    }
                    return acc;
                } finally {
                    backPressure.release();
                }
            }));
        }
        
        R total = reducer.identity();
        for (Future<R> f : futures) {
            try {
                total = reducer.combine(total, f.get());
            } catch (Exception e) {
                exceptions.add(e);
            }
        }
        return total;
    }

    private void triggerProgressIfPercentage(long processed, long totalCount, ProgressListener listener) {
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
}
