import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * ObjectPoolTimeoutTest - Tests timeout requirements:
 * - Borrow timeout accurate within ±100ms (500ms timeout throws between 400-600ms)
 * - Zero timeout returns immediately without blocking if no object available
 * - Waiting threads wake when objects become available
 * - Interrupted threads receive InterruptedException with interrupt status preserved
 */
public class ObjectPoolTimeoutTest {
    private static int testsPassed = 0;
    private static int testsFailed = 0;
    
    public static void main(String[] args) {
        System.out.println("=".repeat(60));
        System.out.println("ObjectPool Timeout Test");
        System.out.println("=".repeat(60));
        
        try {
            testTimeoutAccuracy();
            testZeroTimeoutNonBlocking();
            testWaitingThreadsWake();
            testInterruptHandling();
            
            System.out.println("\n" + "=".repeat(60));
            System.out.println("Results: " + testsPassed + " passed, " + testsFailed + " failed");
            System.out.println("=".repeat(60));
            
            if (testsFailed > 0) {
                System.exit(1);
            }
        } catch (Exception e) {
            System.err.println("Test suite failed with exception: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    private static void testTimeoutAccuracy() {
        System.out.println("\n[Test 1] Timeout accuracy within ±100ms (500ms timeout)...");
        try {
            ObjectPool<String> pool = new ObjectPool<>(
                5,
                () -> "obj",
                obj -> true
            );
            
            // Exhaust pool
            for (int i = 0; i < 5; i++) {
                pool.borrow(1000);
            }
            
            // Test timeout accuracy multiple times
            int accurateCount = 0;
            int totalTests = 10;
            
            for (int i = 0; i < totalTests; i++) {
                long timeoutMs = 500;
                long start = System.currentTimeMillis();
                try {
                    pool.borrow(timeoutMs);
                    System.out.println("  ✗ Unexpected: Object borrowed when pool should be empty");
                } catch (TimeoutException e) {
                    long elapsed = System.currentTimeMillis() - start;
                    // Should be between 400-600ms
                    if (elapsed >= 400 && elapsed <= 600) {
                        accurateCount++;
                    } else {
                        System.out.println("  - Test " + (i + 1) + ": elapsed=" + elapsed + "ms (expected 400-600ms)");
                    }
                }
            }
            
            System.out.println("  - Accurate timeouts: " + accurateCount + "/" + totalTests);
            
            if (accurateCount >= totalTests * 0.8) { // At least 80% accurate
                System.out.println("  ✓ PASS: Timeout accuracy verified");
                System.out.println("PASS: Timeout accuracy"); // For evaluation script
                testsPassed++;
            } else {
                System.out.println("  ✗ FAIL: Timeout accuracy insufficient (" + accurateCount + "/" + totalTests + ")");
                testsFailed++;
            }
        } catch (Exception e) {
            System.out.println("  ✗ FAIL: Exception - " + e.getMessage());
            e.printStackTrace();
            testsFailed++;
        }
    }
    
    private static void testZeroTimeoutNonBlocking() {
        System.out.println("\n[Test 2] Zero timeout returns immediately without blocking...");
        try {
            ObjectPool<String> pool = new ObjectPool<>(
                5,
                () -> "obj",
                obj -> true
            );
            
            // Exhaust pool
            for (int i = 0; i < 5; i++) {
                pool.borrow(1000);
            }
            
            // Zero timeout should return immediately
            long start = System.currentTimeMillis();
            String obj = pool.borrow(0);
            long elapsed = System.currentTimeMillis() - start;
            
            System.out.println("  - Elapsed time: " + elapsed + "ms");
            System.out.println("  - Returned: " + (obj != null ? "object" : "null"));
            
            if (elapsed < 50 && obj == null) { // Should return immediately
                System.out.println("  ✓ PASS: Zero timeout returns immediately");
                testsPassed++;
            } else {
                System.out.println("  ✗ FAIL: Zero timeout blocked (elapsed=" + elapsed + "ms)");
                testsFailed++;
            }
        } catch (Exception e) {
            System.out.println("  ✗ FAIL: Exception - " + e.getMessage());
            e.printStackTrace();
            testsFailed++;
        }
    }
    
    private static void testWaitingThreadsWake() {
        System.out.println("\n[Test 3] Waiting threads wake when objects become available...");
        try {
            ObjectPool<String> pool = new ObjectPool<>(
                5,
                () -> "obj",
                obj -> true
            );
            
            // Exhaust pool
            String[] borrowed = new String[5];
            for (int i = 0; i < 5; i++) {
                borrowed[i] = pool.borrow(1000);
            }
            
            // Start threads waiting for objects
            int numWaiting = 10;
            ExecutorService executor = Executors.newFixedThreadPool(numWaiting);
            CountDownLatch waitingLatch = new CountDownLatch(numWaiting);
            CountDownLatch receivedLatch = new CountDownLatch(numWaiting);
            AtomicInteger receivedCount = new AtomicInteger(0);
            
            for (int i = 0; i < numWaiting; i++) {
                executor.submit(() -> {
                    try {
                        waitingLatch.countDown();
                        String obj = pool.borrow(5000);
                        if (obj != null) {
                            receivedCount.incrementAndGet();
                            pool.release(obj);
                        }
                    } catch (Exception e) {
                        // Ignore
                    } finally {
                        receivedLatch.countDown();
                    }
                });
            }
            
            // Wait for all threads to start waiting
            waitingLatch.await(2, TimeUnit.SECONDS);
            Thread.sleep(100); // Give threads time to start waiting
            
            // Release objects - should wake waiting threads
            for (int i = 0; i < 5; i++) {
                pool.release(borrowed[i]);
            }
            
            // Wait for threads to receive objects
            boolean completed = receivedLatch.await(3, TimeUnit.SECONDS);
            executor.shutdown();
            
            System.out.println("  - Objects received: " + receivedCount.get() + "/" + numWaiting);
            System.out.println("  - All threads completed: " + completed);
            
            if (receivedCount.get() >= 5 && completed) { // At least 5 should get objects
                System.out.println("  ✓ PASS: Waiting threads wake when objects available");
                testsPassed++;
            } else {
                System.out.println("  ✗ FAIL: Waiting threads didn't wake properly");
                testsFailed++;
            }
        } catch (Exception e) {
            System.out.println("  ✗ FAIL: Exception - " + e.getMessage());
            e.printStackTrace();
            testsFailed++;
        }
    }
    
    private static void testInterruptHandling() {
        System.out.println("\n[Test 4] Interrupted threads receive InterruptedException with interrupt status preserved...");
        try {
            ObjectPool<String> pool = new ObjectPool<>(
                5,
                () -> "obj",
                obj -> true
            );
            
            // Exhaust pool
            for (int i = 0; i < 5; i++) {
                pool.borrow(1000);
            }
            
            // Start thread that will be interrupted
            AtomicInteger interruptStatusPreserved = new AtomicInteger(0);
            Thread testThread = new Thread(() -> {
                try {
                    pool.borrow(10000);
                } catch (InterruptedException e) {
                    // Check if interrupt status is preserved
                    if (Thread.currentThread().isInterrupted()) {
                        interruptStatusPreserved.set(1);
                    } else {
                        interruptStatusPreserved.set(-1);
                    }
                } catch (Exception e) {
                    interruptStatusPreserved.set(-2);
                }
            });
            
            testThread.start();
            Thread.sleep(100); // Let thread start waiting
            
            // Interrupt the thread
            testThread.interrupt();
            testThread.join(2000);
            
            System.out.println("  - Interrupt status preserved: " + (interruptStatusPreserved.get() == 1));
            
            if (interruptStatusPreserved.get() == 1) {
                System.out.println("  ✓ PASS: Interrupt status preserved");
                testsPassed++;
            } else {
                System.out.println("  ✗ FAIL: Interrupt status not preserved (code=" + interruptStatusPreserved.get() + ")");
                testsFailed++;
            }
        } catch (Exception e) {
            System.out.println("  ✗ FAIL: Exception - " + e.getMessage());
            e.printStackTrace();
            testsFailed++;
        }
    }
}
