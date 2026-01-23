import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class ObjectPoolTimeoutTest {
    public static void main(String[] args) {
        int failures = 0;
        
        failures += testTimeoutAccuracy() ? 0 : 1;
        failures += testMultipleTimeouts() ? 0 : 1;
        
        System.exit(failures > 0 ? 1 : 0);
    }
    
    private static boolean testTimeoutAccuracy() {
        System.out.println("Test: Timeout Accuracy");
        try {
            ObjectPool<String> pool = new ObjectPool<>(5, () -> "obj", obj -> true);
            
            // Borrow all objects
            for (int i = 0; i < 5; i++) {
                pool.borrow(1000);
            }
            
            long timeoutMs = 500;
            long start = System.currentTimeMillis();
            try {
                pool.borrow(timeoutMs);
                System.err.println("FAIL: Expected TimeoutException");
                return false;
            } catch (TimeoutException e) {
                long elapsed = System.currentTimeMillis() - start;
                long lowerBound = timeoutMs - 100;
                long upperBound = timeoutMs + 100;
                
                if (elapsed < lowerBound || elapsed > upperBound) {
                    System.err.println("FAIL: Timeout inaccurate. Expected: " + timeoutMs + "ms (±100ms), Actual: " + elapsed + "ms");
                    return false;
                }
            }
            
            System.out.println("PASS: Timeout accuracy");
            return true;
        } catch (Exception e) {
            System.err.println("FAIL: Exception: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    private static boolean testMultipleTimeouts() {
        System.out.println("Test: Multiple Timeouts");
        try {
            ObjectPool<String> pool = new ObjectPool<>(5, () -> "obj", obj -> true);
            
            // Borrow all objects
            for (int i = 0; i < 5; i++) {
                pool.borrow(1000);
            }
            
            int threadCount = 10;
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threadCount);
            AtomicInteger timeoutCount = new AtomicInteger(0);
            AtomicInteger successCount = new AtomicInteger(0);
            
            for (int i = 0; i < threadCount; i++) {
                new Thread(() -> {
                    try {
                        startLatch.await();
                        try {
                            pool.borrow(200);
                            successCount.incrementAndGet();
                        } catch (TimeoutException e) {
                            timeoutCount.incrementAndGet();
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        doneLatch.countDown();
                    }
                }).start();
            }
            
            startLatch.countDown();
            boolean completed = doneLatch.await(5, TimeUnit.SECONDS);
            
            if (!completed) {
                System.err.println("FAIL: Test did not complete in time");
                return false;
            }
            
            // All should timeout since pool is empty
            if (timeoutCount.get() != threadCount) {
                System.err.println("FAIL: Expected all timeouts. Got: " + timeoutCount.get() + " timeouts, " + successCount.get() + " successes");
                return false;
            }
            
            System.out.println("PASS: Multiple timeouts");
            return true;
        } catch (Exception e) {
            System.err.println("FAIL: Exception: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
}
