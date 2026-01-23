import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.HashSet;
import java.util.Set;

public class ObjectPoolCorrectnessTest {
    private static final AtomicInteger testCounter = new AtomicInteger(0);
    
    public static void main(String[] args) {
        int failures = 0;
        
        failures += testCapacityControl() ? 0 : 1;
        failures += testZeroTimeout() ? 0 : 1;
        failures += testInvalidObjectRejection() ? 0 : 1;
        failures += testForeignObjectRejection() ? 0 : 1;
        failures += testFactoryExceptionRecovery() ? 0 : 1;
        
        System.exit(failures > 0 ? 1 : 0);
    }
    
    private static boolean testCapacityControl() {
        System.out.println("Test: Capacity Control");
        try {
            ObjectPool<String> pool = new ObjectPool<>(10, () -> "obj" + testCounter.incrementAndGet(), obj -> true);
            
            Set<String> borrowed = new HashSet<>();
            for (int i = 0; i < 15; i++) {
                try {
                    String obj = pool.borrow(1000);
                    if (obj != null) {
                        borrowed.add(obj);
                    }
                } catch (TimeoutException e) {
                    // Expected for borrows beyond maxSize
                    break;
                }
            }
            
            // Pool size should never exceed maxSize
            int poolSize = pool.getPoolSize();
            int created = pool.getCreatedCount();
            
            if (created > 10 || poolSize > 10) {
                System.err.println("FAIL: Pool exceeded maxSize. Created: " + created + ", PoolSize: " + poolSize);
                return false;
            }
            
            System.out.println("PASS: Capacity control");
            return true;
        } catch (Exception e) {
            System.err.println("FAIL: Exception: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    private static boolean testZeroTimeout() {
        System.out.println("Test: Zero Timeout");
        try {
            ObjectPool<String> pool = new ObjectPool<>(5, () -> "obj", obj -> true);
            
            // Borrow all objects
            for (int i = 0; i < 5; i++) {
                pool.borrow(1000);
            }
            
            long start = System.currentTimeMillis();
            String obj = pool.borrow(0);
            long elapsed = System.currentTimeMillis() - start;
            
            if (elapsed > 50) {
                System.err.println("FAIL: Zero timeout blocked for " + elapsed + "ms");
                return false;
            }
            
            if (obj != null) {
                System.err.println("FAIL: Zero timeout returned object when pool empty");
                return false;
            }
            
            System.out.println("PASS: Zero timeout");
            return true;
        } catch (Exception e) {
            System.err.println("FAIL: Exception: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    private static boolean testInvalidObjectRejection() {
        System.out.println("Test: Invalid Object Rejection");
        try {
            AtomicInteger validCount = new AtomicInteger(0);
            ObjectPool<String> pool = new ObjectPool<>(10, () -> "obj", obj -> {
                return validCount.incrementAndGet() <= 5; // First 5 valid, rest invalid
            });
            
            // Create and release objects
            for (int i = 0; i < 10; i++) {
                try {
                    String obj = pool.borrow(1000);
                    if (obj != null) {
                        pool.release(obj);
                    }
                } catch (TimeoutException e) {
                    // Timeout acceptable if we can't create valid objects
                    break;
                }
            }
            
            // All borrowed objects should be valid
            int validBorrowed = 0;
            for (int i = 0; i < 10; i++) {
                try {
                    String obj = pool.borrow(1000);
                    if (obj != null) {
                        validBorrowed++;
                    }
                } catch (TimeoutException e) {
                    // Timeout is acceptable
                    break;
                }
            }
            
            if (validBorrowed > 5) {
                System.err.println("FAIL: Invalid objects were returned. Valid: " + validBorrowed);
                return false;
            }
            
            System.out.println("PASS: Invalid object rejection");
            return true;
        } catch (Exception e) {
            System.err.println("FAIL: Exception: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    private static boolean testForeignObjectRejection() {
        System.out.println("Test: Foreign Object Rejection");
        try {
            ObjectPool<String> pool1 = new ObjectPool<>(5, () -> "pool1", obj -> true);
            ObjectPool<String> pool2 = new ObjectPool<>(5, () -> "pool2", obj -> true);
            
            String obj1 = pool1.borrow(1000);
            String obj2 = pool2.borrow(1000);
            
            int initialSize = pool1.getPoolSize();
            
            // Release foreign object
            pool1.release(obj2);
            
            int afterSize = pool1.getPoolSize();
            
            if (afterSize != initialSize) {
                System.err.println("FAIL: Foreign object corrupted pool. Size: " + initialSize + " -> " + afterSize);
                return false;
            }
            
            System.out.println("PASS: Foreign object rejection");
            return true;
        } catch (Exception e) {
            System.err.println("FAIL: Exception: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    private static boolean testFactoryExceptionRecovery() {
        System.out.println("Test: Factory Exception Recovery");
        try {
            AtomicInteger attempts = new AtomicInteger(0);
            ObjectPool<String> pool = new ObjectPool<>(5, () -> {
                if (attempts.incrementAndGet() <= 3) {
                    throw new RuntimeException("Factory error");
                }
                return "obj";
            }, obj -> true);
            
            // Should eventually succeed after exceptions
            String obj = null;
            for (int i = 0; i < 10; i++) {
                try {
                    obj = pool.borrow(1000);
                    if (obj != null) break;
                } catch (Exception e) {
                    // Continue
                }
            }
            
            if (obj == null) {
                System.err.println("FAIL: Could not create object after factory exceptions");
                return false;
            }
            
            // Capacity should still be available
            int created = pool.getCreatedCount();
            if (created == 0) {
                System.err.println("FAIL: Factory exceptions permanently reduced capacity");
                return false;
            }
            
            System.out.println("PASS: Factory exception recovery");
            return true;
        } catch (Exception e) {
            System.err.println("FAIL: Exception: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
}
