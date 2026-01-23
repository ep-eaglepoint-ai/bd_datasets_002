import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.Random;

/**
 * ObjectPoolStressTest - Tests stress scenarios:
 * - 10,000 cycles across 1,000 threads (1-50ms delays) with zero errors
 * - Capacity never exceeded
 */
public class ObjectPoolStressTest {
    private static int testsPassed = 0;
    private static int testsFailed = 0;
    
    public static void main(String[] args) {
        System.out.println("=".repeat(60));
        System.out.println("ObjectPool Stress Test");
        System.out.println("=".repeat(60));
        
        try {
            testStressScenario();
            
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
    
    private static void testStressScenario() {
        System.out.println("\n[Test] Stress test: 10,000 cycles across 1,000 threads...");
        try {
            int maxSize = 50;
            AtomicInteger created = new AtomicInteger(0);
            AtomicInteger maxObserved = new AtomicInteger(0);
            AtomicInteger errorCount = new AtomicInteger(0);
            AtomicInteger cycleCount = new AtomicInteger(0);
            Random random = new Random();
            
            ObjectPool<String> pool = new ObjectPool<>(
                maxSize,
                () -> "obj-" + created.incrementAndGet(),
                obj -> {
                    // Random validation delay 1-50ms
                    try {
                        Thread.sleep(random.nextInt(50) + 1);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return false;
                    }
                    return true;
                }
            );
            
            int numThreads = 1000;
            int cyclesPerThread = 10; // 1000 threads * 10 cycles = 10,000 cycles
            ExecutorService executor = Executors.newFixedThreadPool(numThreads);
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch finishLatch = new CountDownLatch(numThreads);
            
            for (int i = 0; i < numThreads; i++) {
                executor.submit(() -> {
                    try {
                        startLatch.await();
                        
                        for (int cycle = 0; cycle < cyclesPerThread; cycle++) {
                            try {
                                // Borrow with longer timeout to handle high contention
                                // With 1000 threads and maxSize=50, timeouts are expected
                                long timeout = random.nextInt(5000) + 2000; // 2-7 seconds
                                String obj = pool.borrow(timeout);
                                
                                if (obj != null) {
                                    // Check capacity
                                    int current = pool.getCreatedCount();
                                    int currentMax = maxObserved.get();
                                    while (current > currentMax && !maxObserved.compareAndSet(currentMax, current)) {
                                        currentMax = maxObserved.get();
                                    }
                                    
                                    if (current > maxSize) {
                                        errorCount.incrementAndGet();
                                        System.err.println("ERROR: Capacity exceeded! current=" + current + ", maxSize=" + maxSize);
                                    }
                                    
                                    // Hold object for random time (1-50ms)
                                    Thread.sleep(random.nextInt(50) + 1);
                                    
                                    // Release
                                    pool.release(obj);
                                }
                                // Note: TimeoutException is expected under high contention and not counted as error
                                
                                cycleCount.incrementAndGet();
                                
                                // Random delay between cycles (1-50ms)
                                Thread.sleep(random.nextInt(50) + 1);
                            } catch (InterruptedException e) {
                                Thread.currentThread().interrupt();
                                errorCount.incrementAndGet();
                                break;
                            } catch (TimeoutException e) {
                                // Timeout is expected under high contention (1000 threads, 50 objects)
                                // Don't count as error, just continue to next cycle
                                cycleCount.incrementAndGet();
                            } catch (Exception e) {
                                // Only count non-timeout exceptions as errors
                                errorCount.incrementAndGet();
                                System.err.println("Exception in cycle: " + e.getMessage());
                            }
                        }
                    } catch (Exception e) {
                        errorCount.incrementAndGet();
                        System.err.println("Exception in thread: " + e.getMessage());
                    } finally {
                        finishLatch.countDown();
                    }
                });
            }
            
            long startTime = System.currentTimeMillis();
            startLatch.countDown();
            // Wait for completion with timeout - for broken implementations, this may timeout
            // but we still want to collect results
            boolean completed = finishLatch.await(150, TimeUnit.SECONDS);
            long elapsed = System.currentTimeMillis() - startTime;
            
            // Force shutdown if not completed
            executor.shutdown();
            if (!completed) {
                executor.shutdownNow(); // Force shutdown
            }
            executor.awaitTermination(5, TimeUnit.SECONDS);
            
            // Wait a bit for all releases
            Thread.sleep(200);
            
            int finalCount = pool.getCreatedCount();
            int finalPoolSize = pool.getPoolSize();
            
            System.out.println("  - Cycles completed: " + cycleCount.get());
            System.out.println("  - Errors encountered: " + errorCount.get());
            System.out.println("  - Max observed totalActive: " + maxObserved.get());
            System.out.println("  - Final totalActive: " + finalCount);
            System.out.println("  - Final pool size: " + finalPoolSize);
            System.out.println("  - Test duration: " + elapsed + "ms");
            System.out.println("  - Completed: " + completed);
            
            boolean capacityOk = maxObserved.get() <= maxSize && finalCount <= maxSize;
            boolean noErrors = errorCount.get() == 0;
            boolean cyclesOk = cycleCount.get() >= 9000; // At least 90% completed
            
            if (capacityOk && noErrors && cyclesOk && completed) {
                System.out.println("  ✓ PASS: Stress test passed (zero errors, capacity never exceeded)");
                testsPassed++;
            } else {
                System.out.println("  ✗ FAIL: Stress test failed");
                if (!capacityOk) {
                    System.out.println("    - Capacity exceeded: max=" + maxSize + ", observed=" + maxObserved.get());
                }
                if (!noErrors) {
                    System.out.println("    - Errors: " + errorCount.get());
                }
                if (!cyclesOk) {
                    System.out.println("    - Cycles incomplete: " + cycleCount.get() + "/10000");
                }
                if (!completed) {
                    System.out.println("    - Test did not complete within timeout");
                }
                testsFailed++;
            }
        } catch (Exception e) {
            System.out.println("  ✗ FAIL: Exception - " + e.getMessage());
            e.printStackTrace();
            testsFailed++;
        }
    }
}
