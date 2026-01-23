import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.HashSet;
import java.util.Set;

/**
 * ObjectPoolCorrectnessTest - Tests basic correctness requirements:
 * - Pool size never exceeds maxSize
 * - Objects failing validation are never returned
 * - Releasing foreign objects doesn't corrupt pool state
 * - Factory exceptions don't permanently reduce capacity
 */
public class ObjectPoolCorrectnessTest {
    private static int testsPassed = 0;
    private static int testsFailed = 0;
    
    public static void main(String[] args) {
        System.out.println("=".repeat(60));
        System.out.println("ObjectPool Correctness Test");
        System.out.println("=".repeat(60));
        
        try {
            testPoolSizeNeverExceedsMaxSize();
            testInvalidObjectsNeverReturned();
            testForeignObjectsRejected();
            testFactoryExceptionsDontReduceCapacity();
            testZeroTimeoutNonBlocking();
            
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
    
    private static void testPoolSizeNeverExceedsMaxSize() {
        System.out.println("\n[Test 1] Pool size never exceeds maxSize...");
        try {
            int maxSize = 50;
            ObjectPool<String> pool = new ObjectPool<>(
                maxSize,
                () -> "object-" + System.nanoTime(),
                obj -> true
            );
            
            // Create 500 concurrent threads trying to borrow
            int numThreads = 500;
            ExecutorService executor = Executors.newFixedThreadPool(numThreads);
            CountDownLatch latch = new CountDownLatch(numThreads);
            AtomicInteger successCount = new AtomicInteger(0);
            AtomicInteger maxObserved = new AtomicInteger(0);
            
            for (int i = 0; i < numThreads; i++) {
                executor.submit(() -> {
                    try {
                        String obj = pool.borrow(1000);
                        if (obj != null) {
                            successCount.incrementAndGet();
                            int current = pool.getCreatedCount();
                            int currentMax = maxObserved.get();
                            while (current > currentMax && !maxObserved.compareAndSet(currentMax, current)) {
                                currentMax = maxObserved.get();
                            }
                            Thread.sleep(10); // Hold object briefly
                            pool.release(obj);
                        }
                    } catch (Exception e) {
                        // Ignore
                    } finally {
                        latch.countDown();
                    }
                });
            }
            
            latch.await(5, TimeUnit.SECONDS);
            executor.shutdown();
            
            // Wait a bit for all releases to complete
            Thread.sleep(100);
            
            int finalCount = pool.getCreatedCount();
            int finalPoolSize = pool.getPoolSize();
            
            System.out.println("  - Max observed totalActive: " + maxObserved.get());
            System.out.println("  - Final totalActive: " + finalCount);
            System.out.println("  - Final pool size: " + finalPoolSize);
            
            if (maxObserved.get() <= maxSize && finalCount <= maxSize) {
                System.out.println("  ✓ PASS: Pool size never exceeded maxSize");
                testsPassed++;
            } else {
                System.out.println("  ✗ FAIL: Pool size exceeded maxSize (max=" + maxSize + ", observed=" + maxObserved.get() + ")");
                testsFailed++;
            }
        } catch (Exception e) {
            System.out.println("  ✗ FAIL: Exception - " + e.getMessage());
            e.printStackTrace();
            testsFailed++;
        }
    }
    
    private static void testInvalidObjectsNeverReturned() {
        System.out.println("\n[Test 2] Objects failing validation are never returned...");
        try {
            AtomicInteger createCount = new AtomicInteger(0);
            AtomicInteger validateCount = new AtomicInteger(0);
            
            ObjectPool<String> pool = new ObjectPool<>(
                10,
                () -> {
                    createCount.incrementAndGet();
                    return "obj-" + createCount.get();
                },
                obj -> {
                    validateCount.incrementAndGet();
                    // First object is invalid, rest are valid
                    return !obj.equals("obj-1");
                }
            );
            
            // Borrow multiple objects - invalid ones should never be returned
            Set<String> borrowed = new HashSet<>();
            for (int i = 0; i < 5; i++) {
                String obj = pool.borrow(1000);
                if (obj != null) {
                    borrowed.add(obj);
                    if (obj.equals("obj-1")) {
                        System.out.println("  ✗ FAIL: Invalid object 'obj-1' was returned");
                        testsFailed++;
                        return;
                    }
                }
            }
            
            // Release all
            for (String obj : borrowed) {
                pool.release(obj);
            }
            
            System.out.println("  - Created: " + createCount.get());
            System.out.println("  - Validated: " + validateCount.get());
            System.out.println("  - Borrowed valid objects: " + borrowed.size());
            
            if (!borrowed.contains("obj-1")) {
                System.out.println("  ✓ PASS: Invalid objects never returned");
                testsPassed++;
            } else {
                System.out.println("  ✗ FAIL: Invalid object was returned");
                testsFailed++;
            }
        } catch (Exception e) {
            System.out.println("  ✗ FAIL: Exception - " + e.getMessage());
            e.printStackTrace();
            testsFailed++;
        }
    }
    
    private static void testForeignObjectsRejected() {
        System.out.println("\n[Test 3] Releasing foreign objects doesn't corrupt pool state...");
        try {
            ObjectPool<String> pool = new ObjectPool<>(
                10,
                () -> "pool-obj",
                obj -> true
            );
            
            int initialPoolSize = pool.getPoolSize();
            int initialCreated = pool.getCreatedCount();
            
            // Try to release a foreign object
            String foreignObj = "foreign-object";
            pool.release(foreignObj);
            
            int afterPoolSize = pool.getPoolSize();
            int afterCreated = pool.getCreatedCount();
            
            // Try to release another foreign object
            pool.release("another-foreign");
            
            int finalPoolSize = pool.getPoolSize();
            int finalCreated = pool.getCreatedCount();
            
            // Pool state should be unchanged
            if (initialPoolSize == afterPoolSize && 
                initialCreated == afterCreated &&
                afterPoolSize == finalPoolSize &&
                afterCreated == finalCreated) {
                System.out.println("  ✓ PASS: Foreign objects rejected, pool state unchanged");
                testsPassed++;
            } else {
                System.out.println("  ✗ FAIL: Pool state changed after releasing foreign object");
                System.out.println("    Before: poolSize=" + initialPoolSize + ", created=" + initialCreated);
                System.out.println("    After: poolSize=" + finalPoolSize + ", created=" + finalCreated);
                testsFailed++;
            }
        } catch (Exception e) {
            System.out.println("  ✗ FAIL: Exception - " + e.getMessage());
            e.printStackTrace();
            testsFailed++;
        }
    }
    
    private static void testFactoryExceptionsDontReduceCapacity() {
        System.out.println("\n[Test 4] Factory exceptions don't permanently reduce capacity...");
        try {
            AtomicInteger createAttempts = new AtomicInteger(0);
            ObjectPool<String> pool = new ObjectPool<>(
                10,
                () -> {
                    createAttempts.incrementAndGet();
                    if (createAttempts.get() <= 3) {
                        throw new RuntimeException("Factory exception");
                    }
                    return "obj-" + createAttempts.get();
                },
                obj -> true
            );
            
            // Try to borrow - first 3 attempts should fail, but capacity should remain
            String obj1 = null;
            for (int i = 0; i < 5; i++) {
                try {
                    obj1 = pool.borrow(1000);
                    if (obj1 != null) break;
                } catch (Exception e) {
                    // Ignore
                }
            }
            
            if (obj1 == null) {
                System.out.println("  ✗ FAIL: Could not borrow object after factory exceptions");
                testsFailed++;
                return;
            }
            
            // Release obj1 to test that we can still reach maxSize after factory exceptions
            pool.release(obj1);
            
            // Should be able to borrow up to maxSize objects (proving capacity wasn't reduced)
            int maxBorrowed = 0;
            for (int i = 0; i < 15; i++) {
                try {
                    String obj = pool.borrow(1000);
                    if (obj != null) {
                        maxBorrowed++;
                    } else {
                        break;
                    }
                } catch (Exception e) {
                    // Timeout or other exception - break
                    break;
                }
            }
            
            System.out.println("  - Max objects borrowed: " + maxBorrowed);
            System.out.println("  - Created count: " + pool.getCreatedCount());
            
            // After factory exceptions, we should still be able to borrow maxSize objects
            if (maxBorrowed >= 10) {
                System.out.println("  ✓ PASS: Factory exceptions don't reduce capacity");
                testsPassed++;
            } else {
                System.out.println("  ✗ FAIL: Capacity reduced after factory exceptions (maxBorrowed=" + maxBorrowed + ", expected >= 10)");
                testsFailed++;
            }
            
            // Cleanup - release all borrowed objects
            // Note: We can't track which objects were borrowed, so we'll just verify the pool state
        } catch (Exception e) {
            System.out.println("  ✗ FAIL: Exception - " + e.getMessage());
            e.printStackTrace();
            testsFailed++;
        }
    }
    
    private static void testZeroTimeoutNonBlocking() {
        System.out.println("\n[Test 5] Zero timeout returns immediately without blocking...");
        try {
            ObjectPool<String> pool = new ObjectPool<>(
                5,
                () -> "obj",
                obj -> true
            );
            
            // Borrow all available objects
            for (int i = 0; i < 5; i++) {
                pool.borrow(1000);
            }
            
            // Zero timeout should return immediately
            long start = System.currentTimeMillis();
            String obj = pool.borrow(0);
            long elapsed = System.currentTimeMillis() - start;
            
            System.out.println("  - Elapsed time: " + elapsed + "ms");
            System.out.println("  - Returned object: " + (obj != null ? "non-null" : "null"));
            
            if (elapsed < 50 && obj == null) { // Should return immediately (< 50ms)
                System.out.println("  ✓ PASS: Zero timeout returns immediately");
                testsPassed++;
            } else {
                System.out.println("  ✗ FAIL: Zero timeout blocked or returned object (elapsed=" + elapsed + "ms)");
                testsFailed++;
            }
        } catch (Exception e) {
            System.out.println("  ✗ FAIL: Exception - " + e.getMessage());
            e.printStackTrace();
            testsFailed++;
        }
    }
}
