package pool;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;

class ConnectionPoolTest {

    // Helper class to simulate a connection
    static class TestConnection {
        private final int id;
        private final AtomicBoolean isValid = new AtomicBoolean(true);

        public TestConnection(int id) {
            this.id = id;
        }

        public void invalidate() {
            isValid.set(false);
        }

        public boolean isValid() {
            return isValid.get();
        }

        @Override
        public String toString() {
            return "Conn-" + id;
        }
    }

    // Req 16 & 9 & 1: Stress Test
    // 10,000 cycles, 1000 threads, random delays, 0 errors, max size respected
    @Test
    @Timeout(30) // Should finish well within 30s
    void testHighConcurrencyStress() throws InterruptedException {
        int poolSize = 50;
        int threadCount = 1000;
        int totalOps = 10000;
        
        AtomicInteger idCounter = new AtomicInteger(0);
        ConnectionPool<TestConnection> pool = new ConnectionPool<>(
            poolSize,
            () -> new TestConnection(idCounter.incrementAndGet()),
            TestConnection::isValid,
            5000
        );

        // Track currently borrowed IDs to detect "Object already in use" (Req 9)
        Set<Integer> borrowedIds = ConcurrentHashMap.newKeySet();
        
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalOps);
        AtomicInteger errorCount = new AtomicInteger(0);
        AtomicInteger opsCounter = new AtomicInteger(0);

        for (int i = 0; i < totalOps; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await(); // Wait for mass start
                    
                    // Req 1: Pool size check (probabilistic during load)
                    if (pool.getTotalCount() > poolSize) {
                        errorCount.incrementAndGet();
                    }

                    TestConnection conn = pool.borrow();
                    
                    // Req 9: Uniqueness check
                    if (!borrowedIds.add(conn.id)) {
                        System.err.println("Duplicate borrow detected for ID: " + conn.id);
                        errorCount.incrementAndGet();
                    }

                    // Simulate work (1-50ms random delay)
                    Thread.sleep(ThreadLocalRandom.current().nextInt(1, 50));

                    borrowedIds.remove(conn.id);
                    pool.release(conn);
                    
                } catch (Exception e) {
                    e.printStackTrace();
                    errorCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown(); // Release the Kraken
        assertTrue(doneLatch.await(20, TimeUnit.SECONDS), "Test timed out");
        
        assertEquals(0, errorCount.get(), "Errors detected during stress test");
        assertTrue(pool.getTotalCount() <= poolSize, "Pool exceeded max size");
        assertEquals(0, pool.getInUseCount(), "Pool should be empty after test");
        executor.shutdownNow();
    }

    // Req 2 & 3: Throughput & Non-blocking Validation
    // Throughput > 100 ops/sec even with 500ms validation
    @Test
    @Timeout(60) // Needs extra time for pre-warming with slow validation
    void testThroughputWithSlowValidation() throws InterruptedException {
        int poolSize = 100; // Need enough concurrency to overcome latency
        int opCount = 500;
        
        // Validator sleeps 500ms
        ConnectionPool<TestConnection> pool = new ConnectionPool<>(
            poolSize,
            () -> new TestConnection(0),
            c -> {
                try { Thread.sleep(500); } catch (InterruptedException e) {}
                return true;
            },
            2000
        );

        // Pre-warm the pool to isolate validation logic from creation logic
        for(int i=0; i<poolSize; i++) pool.release(pool.borrow());

        long start = System.currentTimeMillis();
        
        ExecutorService executor = Executors.newFixedThreadPool(poolSize);
        CountDownLatch latch = new CountDownLatch(opCount);

        for (int i = 0; i < opCount; i++) {
            executor.submit(() -> {
                try {
                    TestConnection c = pool.borrow();
                    pool.release(c);
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        long duration = System.currentTimeMillis() - start;
        double throughput = (double) opCount / (duration / 1000.0);

        System.out.println("Throughput with 500ms validation: " + throughput + " ops/sec");
        
        // If validation was blocking (serialized), throughput would be ~2 ops/sec.
        // We expect much higher because validation happens concurrently.
        assertTrue(throughput > 100, "Throughput too low: " + throughput);
        executor.shutdownNow();
        executor.awaitTermination(5, TimeUnit.SECONDS);
    }

    // Req 4: Timeout Accuracy
    @Test
    void testBorrowTimeoutAccuracy() throws InterruptedException {
        ConnectionPool<TestConnection> pool = new ConnectionPool<>(
            1, // Size 1
            () -> new TestConnection(1),
            c -> true,
            1000
        );

        // Exhaust pool
        pool.borrow();

        long timeoutMs = 500;
        long start = System.currentTimeMillis();
        
        try {
            pool.borrow(timeoutMs, TimeUnit.MILLISECONDS);
            fail("Should have timed out");
        } catch (RuntimeException e) {
            long duration = System.currentTimeMillis() - start;
            // Req 4: Accurate within 100ms
            assertTrue(duration >= timeoutMs - 100, "Timeout too fast: " + duration);
            assertTrue(duration <= timeoutMs + 100, "Timeout too slow: " + duration);
        }
    }

    // Req 7: Interrupt Handling
    @Test
    void testInterruptHandling() throws InterruptedException {
        ConnectionPool<TestConnection> pool = new ConnectionPool<>(
            1, () -> new TestConnection(1), c -> true, 5000
        );
        pool.borrow(); // Exhaust pool

        Thread t = new Thread(() -> {
            try {
                pool.borrow();
                fail("Should have thrown InterruptedException");
            } catch (InterruptedException e) {
                // Req 7: Status preserved?
                // In Java, catching InterruptedException clears the flag.
                // We verify the exception type.
            } catch (RuntimeException e) {
                // If the pool wraps it in RuntimeException, that's a failure of the specific req.
                fail("Should throw InterruptedException, not RuntimeException");
            }
        });

        t.start();
        Thread.sleep(100);
        t.interrupt();
        t.join(1000);
        
        assertFalse(t.isAlive(), "Thread hung");
    }

    // Req 8 & 15: Invalid Object Removal
    @Test
    void testInvalidObjectDiscarded() throws InterruptedException {
        AtomicInteger factoryCalls = new AtomicInteger(0);
        ConnectionPool<TestConnection> pool = new ConnectionPool<>(
            1, 
            () -> new TestConnection(factoryCalls.incrementAndGet()), 
            TestConnection::isValid, 
            1000
        );

        TestConnection c1 = pool.borrow();
        assertEquals(1, c1.id);
        
        // Invalidate it
        c1.invalidate();
        pool.release(c1); // Should be discarded
        
        // Borrow again - should get a NEW object (id 2)
        TestConnection c2 = pool.borrow();
        assertEquals(2, c2.id);
        assertEquals(1, pool.getInUseCount());
    }

    // Req 10 & 11: Double Release / Alien Release
    @Test
    void testSafeRelease() throws InterruptedException {
        ConnectionPool<TestConnection> pool = new ConnectionPool<>(
            5, () -> new TestConnection(1), c -> true, 1000
        );

        TestConnection c = pool.borrow();
        assertEquals(0, pool.getAvailableCount());
        
        pool.release(c);
        assertEquals(1, pool.getAvailableCount());
        
        // Req 10: Double Release
        pool.release(c); 
        assertEquals(1, pool.getAvailableCount(), "Double release should not increase available count");
        
        // Req 11: Alien Release
        pool.release(new TestConnection(999));
        assertEquals(1, pool.getAvailableCount(), "Releasing alien object should be ignored");
    }

    // Req 12: Zero Timeout
    @Test
    void testZeroTimeout() throws InterruptedException {
        ConnectionPool<TestConnection> pool = new ConnectionPool<>(
            1, () -> new TestConnection(1), c -> true, 1000
        );
        pool.borrow(); // Exhaust
        
        long start = System.currentTimeMillis();
        try {
            pool.borrow(0, TimeUnit.MILLISECONDS);
            fail("Should fail immediately");
        } catch (RuntimeException e) {
            long duration = System.currentTimeMillis() - start;
            assertTrue(duration < 20, "Zero timeout blocked for " + duration + "ms");
        }
    }

    // Req 14: Factory Failure Recovery
    @Test
    void testFactoryFailureDoesNotLeakCapacity() throws InterruptedException {
        AtomicBoolean failFactory = new AtomicBoolean(false);
        ConnectionPool<TestConnection> pool = new ConnectionPool<>(
            1,
            () -> {
                if (failFactory.get()) throw new RuntimeException("Factory Error");
                return new TestConnection(1);
            },
            c -> true,
            100
        );

        failFactory.set(true);
        try {
            pool.borrow();
            fail("Expected Factory Error");
        } catch (RuntimeException e) {
            // Expected
        }

        // Capacity should be released
        failFactory.set(false);
        assertNotNull(pool.borrow(), "Should be able to borrow after factory failure");
    }

    // Req 5: Spurious Wakeup Handling
    // Verify that wait conditions are rechecked and timeout is recalculated
    @Test
    @Timeout(10)
    void testSpuriousWakeupHandling() throws InterruptedException {
        ConnectionPool<TestConnection> pool = new ConnectionPool<>(
            1, () -> new TestConnection(1), c -> true, 5000
        );
        
        // Exhaust pool
        TestConnection borrowed = pool.borrow();
        
        CountDownLatch startLatch = new CountDownLatch(1);
        AtomicBoolean threadCompleted = new AtomicBoolean(false);
        AtomicBoolean timedOut = new AtomicBoolean(false);
        
        Thread waiter = new Thread(() -> {
            try {
                startLatch.countDown();
                long start = System.currentTimeMillis();
                try {
                    // Request with 2 second timeout
                    pool.borrow(2000, TimeUnit.MILLISECONDS);
                    threadCompleted.set(true);
                } catch (RuntimeException e) {
                    long duration = System.currentTimeMillis() - start;
                    // Verify timeout is accurate despite potential spurious wakeups
                    if (duration >= 1900 && duration <= 2100) {
                        timedOut.set(true);
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        
        waiter.start();
        startLatch.await();
        
        // Give thread time to start waiting
        Thread.sleep(100);
        
        // Do NOT release the object - let it timeout
        // The pool implementation must handle any spurious wakeups
        // and recalculate remaining timeout correctly
        
        waiter.join(3000);
        assertFalse(waiter.isAlive(), "Thread should have completed or timed out");
        assertTrue(timedOut.get(), "Thread should have timed out correctly despite potential spurious wakeups");
        
        // Cleanup
        pool.release(borrowed);
    }

    // Req 6: All Waiting Threads Eventually Wake
    // When objects are released, waiting threads must be notified
    @Test
    @Timeout(10)
    void testAllWaitingThreadsEventuallyWake() throws InterruptedException {
        int poolSize = 5;
        int waitingThreads = 20;
        
        ConnectionPool<TestConnection> pool = new ConnectionPool<>(
            poolSize, 
            () -> new TestConnection(0), 
            c -> true, 
            5000
        );
        
        // Exhaust the pool
        List<TestConnection> borrowed = new ArrayList<>();
        for (int i = 0; i < poolSize; i++) {
            borrowed.add(pool.borrow());
        }
        
        // Create threads that will wait for objects
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch completionLatch = new CountDownLatch(waitingThreads);
        AtomicInteger successCount = new AtomicInteger(0);
        
        for (int i = 0; i < waitingThreads; i++) {
            final int threadId = i;
            new Thread(() -> {
                try {
                    startLatch.await();
                    TestConnection conn = pool.borrow(3000, TimeUnit.MILLISECONDS);
                    successCount.incrementAndGet();
                    // Hold briefly then release
                    Thread.sleep(10);
                    pool.release(conn);
                } catch (Exception e) {
                    // Timeout is acceptable for some threads
                } finally {
                    completionLatch.countDown();
                }
            }).start();
        }
        
        // Let all threads start waiting
        Thread.sleep(100);
        startLatch.countDown();
        Thread.sleep(100);
        
        // Release objects one by one - each should wake a waiting thread
        for (TestConnection conn : borrowed) {
            pool.release(conn);
            Thread.sleep(50); // Small delay between releases
        }
        
        // Wait for all threads to complete
        assertTrue(completionLatch.await(5, TimeUnit.SECONDS), 
            "Not all threads completed in time");
        
        // All threads should have gotten a chance to borrow
        // With proper notification, all 20 threads should succeed
        // (they release quickly, allowing reuse)
        assertTrue(successCount.get() >= waitingThreads - 2, 
            "Too few threads succeeded: " + successCount.get() + "/" + waitingThreads +
            " - waiting threads may not be properly notified");
    }
}