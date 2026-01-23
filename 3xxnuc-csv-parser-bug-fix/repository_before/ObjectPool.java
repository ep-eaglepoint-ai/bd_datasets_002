import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

/**
 * ObjectPool - Broken implementation demonstrating concurrency failures.
 * 
 * Known issues:
 * - Pool size can exceed maxSize under concurrent load
 * - Threads serialize on validation (no parallel execution)
 * - Timeout handling is inaccurate
 * - Interrupt status not preserved
 * - Foreign objects corrupt pool state
 * - Factory exceptions reduce capacity permanently
 */
public class ObjectPool<T> {
    private final int maxSize;
    private final ObjectFactory<T> factory;
    private final Validator<T> validator;
    private final BlockingQueue<T> pool;
    private final AtomicInteger created = new AtomicInteger(0);
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition available = lock.newCondition();
    
    public interface ObjectFactory<T> {
        T create() throws Exception;
    }
    
    public interface Validator<T> {
        boolean validate(T obj);
    }
    
    public ObjectPool(int maxSize, ObjectFactory<T> factory, Validator<T> validator) {
        if (maxSize <= 0) throw new IllegalArgumentException("maxSize must be positive");
        if (factory == null || validator == null) throw new NullPointerException();
        this.maxSize = maxSize;
        this.factory = factory;
        this.validator = validator;
        this.pool = new LinkedBlockingQueue<>(maxSize);
    }
    
    public T borrow(long timeoutMs) throws InterruptedException, TimeoutException {
        if (timeoutMs < 0) throw new IllegalArgumentException("timeout must be non-negative");
        
        // BUG: No synchronization - can exceed maxSize
        if (pool.isEmpty() && created.get() < maxSize) {
            try {
                T obj = factory.create();
                created.incrementAndGet();
                return obj;
            } catch (Exception e) {
                // BUG: Exception reduces capacity permanently
                return null;
            }
        }
        
        // BUG: Zero timeout still blocks
        if (timeoutMs == 0) {
            T obj = pool.poll();
            if (obj != null && validator.validate(obj)) {
                return obj;
            }
            return null;
        }
        
        // BUG: Serialized validation - all threads wait
        lock.lock();
        try {
            long deadline = System.currentTimeMillis() + timeoutMs;
            while (true) {
                T obj = pool.poll();
                if (obj != null) {
                    // BUG: Validation happens while holding lock - serializes all threads
                    if (validator.validate(obj)) {
                        return obj;
                    } else {
                        // BUG: Invalid object not handled - may be lost
                        try {
                            T newObj = factory.create();
                            if (newObj != null) {
                                created.incrementAndGet();
                                return newObj;
                            }
                        } catch (Exception e) {
                            // Ignore
                        }
                    }
                }
                
                long remaining = deadline - System.currentTimeMillis();
                if (remaining <= 0) {
                    throw new TimeoutException("Timeout waiting for object");
                }
                
                // BUG: Interrupt status not checked/preserved
                available.await(remaining, TimeUnit.MILLISECONDS);
            }
        } finally {
            lock.unlock();
        }
    }
    
    public void release(T obj) {
        if (obj == null) return;
        
        // BUG: No validation that object belongs to this pool
        // BUG: Can exceed maxSize if pool already full
        if (pool.size() < maxSize) {
            pool.offer(obj);
            lock.lock();
            try {
                available.signal();
            } finally {
                lock.unlock();
            }
        }
        // BUG: Objects beyond maxSize are silently discarded, reducing capacity
    }
    
    public int getPoolSize() {
        return pool.size();
    }
    
    public int getCreatedCount() {
        return created.get();
    }
}
