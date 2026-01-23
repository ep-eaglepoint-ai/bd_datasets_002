import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

/**
 * ObjectPool - Fixed implementation with proper concurrency handling.
 * 
 * Fixes:
 * - Pool size never exceeds maxSize (proper synchronization using CAS)
 * - Parallel validation (validation outside lock)
 * - Accurate timeout handling with proper deadline calculation
 * - Interrupt status preserved
 * - Foreign objects rejected (tracked via ConcurrentHashMap)
 * - Factory exceptions don't reduce capacity (capacity reserved before creation)
 */
public class ObjectPool<T> {
    private final int maxSize;
    private final ObjectFactory<T> factory;
    private final Validator<T> validator;
    private final BlockingQueue<T> pool;
    private final AtomicInteger totalActive = new AtomicInteger(0); // Objects that exist (in pool + borrowed)
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition available = lock.newCondition();
    private final ConcurrentHashMap<T, Boolean> poolObjects = new ConcurrentHashMap<>(); // Track objects belonging to this pool
    
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
        
        // Zero timeout: return immediately if no object available (non-blocking)
        if (timeoutMs == 0) {
            T obj = pool.poll();
            if (obj != null) {
                // Validate outside lock for parallel execution
                if (validator.validate(obj)) {
                    return obj;
                } else {
                    // Invalid object - try to replace it (doesn't change totalActive)
                    return tryCreateAndReplace(obj);
                }
            }
            return null;
        }
        
        long deadline = timeoutMs == Long.MAX_VALUE ? Long.MAX_VALUE : System.currentTimeMillis() + timeoutMs;
        
        while (true) {
            // Check interrupt status before blocking
            if (Thread.currentThread().isInterrupted()) {
                throw new InterruptedException();
            }
            
            // OPTIMIZATION: Fast path - try to get object from pool without blocking (lock-free)
            // This is the most common case and should be as fast as possible
            T obj = pool.poll();
            if (obj != null) {
                // Validate outside lock to allow parallel validation (critical for throughput)
                if (validator.validate(obj)) {
                    return obj;
                } else {
                    // Invalid object - try to create replacement (doesn't change totalActive)
                    T replacement = tryCreateAndReplace(obj);
                    if (replacement != null) {
                        return replacement;
                    }
                    // If replacement failed, continue to wait
                }
            }
            
            // OPTIMIZATION: Check capacity before attempting creation to avoid unnecessary CAS
            // This reduces contention on totalActive when pool is at capacity
            if (totalActive.get() < maxSize) {
                // Try to create new object if capacity allows (lock-free CAS operation)
                T newObj = tryCreateNew();
                if (newObj != null) {
                    return newObj;
                }
            }
            
            // Wait for object to become available
            boolean lockHeld = false;
            lock.lock();
            lockHeld = true;
            try {
                // Double-check after acquiring lock (avoid race condition)
                obj = pool.poll();
                if (obj != null) {
                    // Release lock before validation (validation happens outside lock)
                    lock.unlock();
                    lockHeld = false;
                    // Validate outside lock for parallel execution
                    if (validator.validate(obj)) {
                        return obj;
                    } else {
                        // Invalid object - try to create replacement (doesn't change totalActive)
                        T replacement = tryCreateAndReplace(obj);
                        if (replacement != null) {
                            return replacement;
                        }
                        // Replacement failed, need to wait - re-acquire lock
                        lock.lock();
                        lockHeld = true;
                    }
                } else {
                    // Pool is empty - try to create new object (outside lock)
                    // CRITICAL: Factory calls must be outside locks per best practices
                    lock.unlock();
                    lockHeld = false;
                    T newObj = tryCreateNew();
                    if (newObj != null) {
                        return newObj;
                    }
                    // Creation failed, need to wait - re-acquire lock
                    lock.lock();
                    lockHeld = true;
                }
                
                // At this point we hold the lock and need to wait
                // Calculate remaining time
                long remaining = deadline == Long.MAX_VALUE ? Long.MAX_VALUE : deadline - System.currentTimeMillis();
                if (remaining <= 0) {
                    throw new TimeoutException("Timeout waiting for object");
                }
                
                // Wait with interrupt handling
                try {
                    available.await(remaining, TimeUnit.MILLISECONDS);
                } catch (InterruptedException e) {
                    // Preserve interrupt status
                    Thread.currentThread().interrupt();
                    throw e;
                }
            } finally {
                // Only unlock if we still hold the lock
                if (lockHeld) {
                    lock.unlock();
                }
            }
        }
    }
    
    private T tryCreateNew() {
        // Try to atomically reserve capacity and create object
        while (true) {
            int current = totalActive.get();
            if (current >= maxSize) {
                return null; // Cannot create without exceeding maxSize
            }
            
            // Try to reserve capacity using CAS
            if (totalActive.compareAndSet(current, current + 1)) {
                // Capacity reserved, now create object
                try {
                    T obj = factory.create();
                    if (obj != null) {
                        // Validate before returning - invalid objects should never be returned
                        if (validator.validate(obj)) {
                            poolObjects.put(obj, Boolean.TRUE);
                            return obj;
                        } else {
                            // Object is invalid - discard it and release reserved capacity
                            totalActive.decrementAndGet();
                        }
                    } else {
                        // Creation returned null - release reserved capacity
                        totalActive.decrementAndGet();
                    }
                } catch (Exception e) {
                    // Factory exception - release reserved capacity (doesn't reduce permanent capacity)
                    totalActive.decrementAndGet();
                }
                return null;
            }
            // CAS failed, retry immediately (no backoff for maximum throughput)
        }
    }
    
    private T tryCreateAndReplace(T invalidObj) {
        // Try to create replacement for invalid object
        // This doesn't change totalActive since we're replacing an existing object
        try {
            T newObj = factory.create();
            if (newObj != null) {
                // Validate replacement before returning
                if (validator.validate(newObj)) {
                    poolObjects.put(newObj, Boolean.TRUE);
                    // Remove old invalid object from tracking
                    poolObjects.remove(invalidObj);
                    return newObj;
                } else {
                    // Replacement is also invalid - discard it
                    poolObjects.remove(invalidObj);
                    totalActive.decrementAndGet(); // Account for lost invalid object
                }
            }
        } catch (Exception e) {
            // Factory exception - invalid object is lost
            poolObjects.remove(invalidObj);
            totalActive.decrementAndGet(); // Account for lost invalid object
        }
        return null;
    }
    
    public void release(T obj) {
        if (obj == null) return;
        
        // Only tracked objects (created by this pool) can be released
        // This prevents foreign objects from corrupting the pool state
        if (!poolObjects.containsKey(obj)) {
            // Foreign object - reject it immediately (doesn't corrupt pool state)
            return;
        }
        
        // Try to add back to pool (lock-free, fastest path)
        if (pool.offer(obj)) {
            // Successfully added - signal waiting threads
            // OPTIMIZATION: Minimize lock hold time - acquire, signal, release immediately
            // Use signalAll() to wake all waiting threads for maximum throughput
            // This is critical for high-concurrency scenarios (500 threads, 50 objects)
            // The lock is held for the absolute minimum time (just signaling)
            lock.lock();
            try {
                available.signalAll(); // Wake all waiting threads for maximum throughput
            } finally {
                lock.unlock();
            }
        } else {
            // Pool is full - object cannot be returned to pool, discard it
            // This can happen if pool reached maxSize and this object was borrowed before
            // Decrement totalActive to account for discarded object
            poolObjects.remove(obj);
            totalActive.decrementAndGet();
        }
    }
    
    public int getPoolSize() {
        return pool.size();
    }
    
    public int getCreatedCount() {
        return totalActive.get();
    }
}
