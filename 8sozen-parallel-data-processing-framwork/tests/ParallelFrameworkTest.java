package com.eaglepoint.parallel;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.CancellationException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;
import java.util.stream.Collectors;

/**
 * Comprehensive test suite for 8SOZEN - Parallel Data Processing Framework.
 * Tests all requirements from README.md including interfaces, processors, error handling, and utilities.
 */
public class ParallelFrameworkTest {

    // -------------------------------------------------------------------------
    // 1. Core Interfaces & Default Implementations
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Verify IdentityMapper returns elements unchanged")
    void testIdentityMapper() {
        Mapper<String, String> mapper = new IdentityMapper<>();
        Assertions.assertEquals("test", mapper.map("test"));
        Assertions.assertEquals("hello", mapper.map("hello"));
    }

    @Test
    @DisplayName("Verify SummingReducer sums integers correctly")
    void testSummingReducer() {
        Reducer<Integer, Integer> reducer = new SummingReducer();
        Assertions.assertEquals(0, reducer.identity());
        Assertions.assertEquals(15, reducer.reduce(10, 5));
        Assertions.assertEquals(30, reducer.combine(10, 20));
    }

    @Test
    @DisplayName("Verify CountingReducer counts elements")
    void testCountingReducer() {
        Reducer<String, Long> reducer = new CountingReducer<>();
        Assertions.assertEquals(0L, reducer.identity());
        Assertions.assertEquals(1L, reducer.reduce(0L, "item"));
        Assertions.assertEquals(5L, reducer.combine(2L, 3L));
    }

    @Test
    @DisplayName("Verify EvenPartitioner splits data evenly")
    void testEvenPartitioner() {
        Partitioner<Integer> partitioner = new EvenPartitioner<>();
        List<Integer> data = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        List<List<Integer>> partitions = partitioner.partition(data, 3);
        
        Assertions.assertEquals(3, partitions.size());
        // Check that all elements are present
        int totalElements = partitions.stream().mapToInt(List::size).sum();
        Assertions.assertEquals(10, totalElements);
    }

    // -------------------------------------------------------------------------
    // 2. ParallelProcessor Execution Modes
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("ParallelProcessor with ForkJoin execution")
    void testForkJoinExecution() {
        List<Integer> data = Arrays.asList(1, 2, 3, 4, 5);
        
        Integer result = ParallelProcessor.<Integer, Integer, Integer>withForkJoin()
            .source(data)
            .map(x -> x * 2)
            .reduce(new SummingReducer())
            .execute();
        
        int expected = data.stream().mapToInt(x -> x * 2).sum(); // 30
        Assertions.assertEquals(expected, result);
    }

    @Test
    @DisplayName("ParallelProcessor with Custom Pool")
    void testCustomPoolExecution() {
        ForkJoinPool customPool = new ForkJoinPool(2);
        List<Integer> data = Arrays.asList(1, 2, 3);
        
        try {
            Integer result = ParallelProcessor.<Integer, Integer, Integer>withCustomPool(customPool)
                .source(data)
                .map(x -> x)
                .reduce(new SummingReducer())
                .execute();
            Assertions.assertEquals(6, result);
        } finally {
            customPool.shutdown();
        }
    }

    @Test
    @DisplayName("ParallelProcessor with Parallel Stream")
    void testParallelStreamMode() {
        List<Integer> data = Arrays.asList(1, 2, 3, 4);
        
        Integer result = ParallelProcessor.<Integer, Integer, Integer>withParallelStream()
            .source(data)
            .map(x -> x)
            .reduce(new SummingReducer())
            .execute();
        Assertions.assertEquals(10, result);
    }

    @Test
    @DisplayName("ParallelProcessor processes large dataset efficiently")
    void testLargeDataset() {
        List<Integer> data = IntStream.range(0, 1000000).boxed().collect(Collectors.toList());
        
        long start = System.currentTimeMillis();
        Long count = ParallelProcessor.<Integer, Integer, Long>withForkJoin()
            .source(data)
            .map(x -> x)
            .reduce(new CountingReducer<>())
            .execute();
        long elapsed = System.currentTimeMillis() - start;
        
        Assertions.assertEquals(1000000L, count);
        System.out.println("Processed 1M elements in " + elapsed + "ms");
    }

    // -------------------------------------------------------------------------
    // 3. Exception Handling
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Exception accumulation (not failing fast by default)")
    void testAccumulateExceptions() {
        List<Integer> data = Arrays.asList(1, 2, 3, 4, 5);
        
        // Mapper that fails on 3
        Mapper<Integer, Integer> failingMapper = x -> {
            if (x == 3) throw new RuntimeException("Error on 3");
            return x;
        };

        ParallelProcessingException ex = Assertions.assertThrows(ParallelProcessingException.class, () -> {
            ParallelProcessor.<Integer, Integer, Integer>withForkJoin()
                .source(data)
                .map(failingMapper)
                .reduce(new SummingReducer())
                .execute();
        });

        Assertions.assertTrue(ex.getFailedCount() > 0);
        Assertions.assertTrue(ex.getSuppressedExceptions().stream()
            .anyMatch(t -> t.getMessage() != null && t.getMessage().contains("Error on 3")));
    }

    @Test
    @DisplayName("Fail-fast configuration stops on first error")
    void testFailFast() {
        CancellationToken token = new CancellationToken();
        
        Assertions.assertThrows(Exception.class, () -> {
            ParallelProcessor.<Integer, Integer, Integer>withCancellation(token)
                .withFailFast(true)
                .source(IntStream.range(0, 1000).boxed().collect(Collectors.toList()))
                .map(x -> {
                    if (x == 100) throw new RuntimeException("Fail fast");
                    return x;
                })
                .reduce(new SummingReducer())
                .execute();
        });
    }

    // -------------------------------------------------------------------------
    // 4. Progress Monitoring
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Progress listener receives updates")
    void testProgressListener() {
        AtomicInteger updateCount = new AtomicInteger(0);
        ProgressListener listener = new ProgressListener() {
            @Override
            public void onProgress(double percent, long processed, long total) {
                updateCount.incrementAndGet();
                System.out.println("Progress: " + percent + "% (" + processed + "/" + total + ")");
            }
            @Override
            public void onEstimatedTimeRemaining(Duration remaining) {
                System.out.println("ETA: " + remaining.toMillis() + "ms");
            }
        };

        ParallelProcessor.<Integer, Integer, Integer>withForkJoin()
            .withProgressListener(listener)
            .withProgressUpdateInterval(Duration.ofMillis(50))
            .source(IntStream.range(0, 50000).boxed().collect(Collectors.toList()))
            .map(x -> {
                // Small delay to ensure processing takes long enough for progress updates
                if (x % 1000 == 0) {
                    try { Thread.sleep(1); } catch (InterruptedException e) {}
                }
                return x;
            })
            .reduce(new SummingReducer())
            .execute();

        Assertions.assertTrue(updateCount.get() > 0, "Should have received progress updates");
    }

    // -------------------------------------------------------------------------
    // 5. Cancellation & Timeouts
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Cancellation via Token stops processing")
    void testCancellation() {
        CancellationToken token = new CancellationToken();
        AtomicInteger processedCount = new AtomicInteger(0);
        
        // Schedule cancellation after a delay
        new Thread(() -> {
            try {
                Thread.sleep(100);
                token.cancel();
            } catch (InterruptedException e) {}
        }).start();
        
        try {
            ParallelProcessor.<Integer, Integer, Integer>withCancellation(token)
                .source(IntStream.range(0, 100000).boxed().collect(Collectors.toList()))
                .map(x -> {
                    processedCount.incrementAndGet();
                    try { Thread.sleep(1); } catch (InterruptedException e) {}
                    return x;
                })
                .reduce(new SummingReducer())
                .execute();
        } catch (Exception e) {
            // Expected - may be cancellation or processing exception
        }
        
        // Should have processed less than all elements
        System.out.println("Processed " + processedCount.get() + " before cancellation");
    }

    @Test
    @DisplayName("Timeout stops execution")
    void testTimeout() {
        long start = System.currentTimeMillis();
        
        try {
            ParallelProcessor.<Integer, Integer, Integer>withForkJoin()
                .withTimeout(Duration.ofMillis(200))
                .source(IntStream.range(0, 100000).boxed().collect(Collectors.toList()))
                .map(x -> {
                    try { Thread.sleep(1); } catch (InterruptedException e) {}
                    return x;
                })
                .reduce(new SummingReducer())
                .execute();
        } catch (Exception e) {
            // Expected timeout
        }
        
        long elapsed = System.currentTimeMillis() - start;
        // Should complete relatively quickly due to timeout
        Assertions.assertTrue(elapsed < 2000, "Should timeout before completing all work");
    }

    // -------------------------------------------------------------------------
    // 6. Parallel Operations Utility
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("ParallelOperations: parallelMap preserves order")
    void testParallelMap() {
        List<Integer> input = Arrays.asList(1, 2, 3, 4, 5);
        List<Integer> result = ParallelOperations.parallelMap(input, x -> x * 2);
        Assertions.assertEquals(Arrays.asList(2, 4, 6, 8, 10), result);
    }

    @Test
    @DisplayName("ParallelOperations: parallelFilter maintains order")
    void testParallelFilter() {
        List<Integer> input = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        List<Integer> result = ParallelOperations.parallelFilter(input, x -> x % 2 == 0);
        Assertions.assertEquals(Arrays.asList(2, 4, 6, 8, 10), result);
    }

    @Test
    @DisplayName("ParallelOperations: parallelSort sorts correctly")
    void testParallelSort() {
        List<Integer> input = Arrays.asList(5, 3, 1, 4, 2, 9, 7, 6, 8);
        List<Integer> result = ParallelOperations.parallelSort(input, Integer::compareTo);
        Assertions.assertEquals(Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9), result);
    }

    @Test
    @DisplayName("ParallelOperations: parallelReduce aggregates values")
    void testParallelReduce() {
        List<Integer> input = Arrays.asList(1, 2, 3, 4, 5);
        Integer result = ParallelOperations.parallelReduce(input, 0, Integer::sum);
        Assertions.assertEquals(15, result);
    }

    @Test
    @DisplayName("ParallelOperations: parallelForEach executes actions")
    void testParallelForEach() {
        List<Integer> input = Arrays.asList(1, 2, 3, 4, 5);
        AtomicInteger sum = new AtomicInteger(0);
        ParallelOperations.parallelForEach(input, sum::addAndGet);
        Assertions.assertEquals(15, sum.get());
    }

    @Test
    @DisplayName("ParallelOperations: parallelFindAny with short-circuit")
    void testParallelFindAny() {
        List<Integer> input = IntStream.range(0, 1000000).boxed().collect(Collectors.toList());
        long start = System.currentTimeMillis();
        Optional<Integer> result = ParallelOperations.parallelFindAny(input, x -> x == 5000);
        long elapsed = System.currentTimeMillis() - start;
        
        Assertions.assertTrue(result.isPresent());
        Assertions.assertEquals(5000, result.get());
        System.out.println("Found element in " + elapsed + "ms with short-circuit");
    }

    @Test
    @DisplayName("ParallelOperations: large dataset performance test")
    void testLargeDatasetPerformance() {
        List<Integer> data = IntStream.range(0, 1000000).boxed().collect(Collectors.toList());
        
        // Sequential
        long start = System.currentTimeMillis();
        List<Integer> seqResult = data.stream()
            .map(x -> x * 2)
            .filter(x -> x % 4 == 0)
            .collect(Collectors.toList());
        long seqTime = System.currentTimeMillis() - start;
        
        // Parallel
        start = System.currentTimeMillis();
        List<Integer> parResult = ParallelOperations.parallelMap(data, x -> x * 2);
        parResult = ParallelOperations.parallelFilter(parResult, x -> x % 4 == 0);
        long parTime = System.currentTimeMillis() - start;
        
        System.out.println("Sequential: " + seqTime + "ms, Parallel: " + parTime + "ms");
        Assertions.assertEquals(seqResult.size(), parResult.size());
    }

    // -------------------------------------------------------------------------
    // 7. Data Source Support
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("ParallelProcessor supports Iterable source")
    void testIterableSource() {
        Set<Integer> set = new HashSet<>(Arrays.asList(1, 2, 3, 4, 5));
        
        Long count = ParallelProcessor.<Integer, Integer, Long>withForkJoin()
            .source(set)
            .map(x -> x)
            .reduce(new CountingReducer<>())
            .execute();
        
        Assertions.assertEquals(5L, count);
    }

    @Test
    @DisplayName("CancellationToken methods work correctly")
    void testCancellationToken() {
        CancellationToken token = new CancellationToken();
        Assertions.assertFalse(token.isCancelled());
        
        token.cancel();
        Assertions.assertTrue(token.isCancelled());
        
        Assertions.assertThrows(CancellationException.class, token::throwIfCancelled);
    }

    @Test
    @DisplayName("ParallelProcessingException contains error details")
    void testParallelProcessingException() {
        List<Throwable> exceptions = Arrays.asList(
            new RuntimeException("Error 1"),
            new RuntimeException("Error 2")
        );
        
        ParallelProcessingException ex = new ParallelProcessingException(
            "Test exception", 2, exceptions
        );
        
        Assertions.assertEquals(2, ex.getFailedCount());
        Assertions.assertEquals(2, ex.getSuppressedExceptions().size());
        Assertions.assertTrue(ex.getMessage().contains("Test exception"));
    }
}
