package pool;

import java.util.Set;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class ConnectionPool<T> {
    private final BlockingQueue<T> available;
    private final Set<T> inUse;
    private final Semaphore capacity;
    private final Supplier<T> factory;
    private final Predicate<T> validator;
    private final long defaultTimeoutMs;
    private final int maxSize;
    private final java.util.concurrent.atomic.AtomicInteger totalCreated = new java.util.concurrent.atomic.AtomicInteger(0);

    public ConnectionPool(int maxSize, Supplier<T> factory, Predicate<T> validator, long defaultTimeoutMs) {
        // LinkedBlockingQueue handles thread-safe polling/offering of idle objects
        this.available = new LinkedBlockingQueue<>();
        
        // ConcurrentHashMap.newKeySet() provides a thread-safe Set without global locking
        this.inUse = ConcurrentHashMap.newKeySet();
        
        // Semaphore strictly enforces maxSize and handles the "waiting queue" 
        // logic (fairness=true ensures FIFO for waiting threads)
        this.capacity = new Semaphore(maxSize, true);
        
        this.factory = factory;
        this.validator = validator;
        this.defaultTimeoutMs = defaultTimeoutMs;
        this.maxSize = maxSize;
    }

    public T borrow() throws InterruptedException {
        return borrow(defaultTimeoutMs, TimeUnit.MILLISECONDS);
    }

    public T borrow(long timeout, TimeUnit unit) throws InterruptedException {
        // 1. Acquire a permit. This blocks efficiently if the pool is full.
        // If we timeout here, we never touched the pool state, maintaining safety.
        if (!capacity.tryAcquire(timeout, unit)) {
            throw new RuntimeException("Pool exhausted: timeout waiting for available object");
        }

        boolean success = false;
        try {
            // 2. Check for an idle object
            T obj = available.poll();

            // 3. Validation Logic
            // We validate OUTSIDE any synchronized block.
            // Other threads can still borrow/release while this thread performs network I/O.
            if (obj != null) {
                if (validator.test(obj)) {
                    inUse.add(obj);
                    success = true;
                    return obj;
                }
                // If invalid, we discard it and fall through to creation.
                // We still hold the permit, representing a "slot" in the pool.
                // Reduce created count since we're removing an invalid object from the pool
                totalCreated.decrementAndGet();
            }

            // 4. Creation Logic
            // We create a new object if:
            // a) The available queue was empty (but we have a permit, meaning inUse < max)
            // b) The object we pulled was invalid
            obj = factory.get();
            if (obj == null) {
                throw new RuntimeException("Factory returned null");
            }

            inUse.add(obj);
            // Track total created objects to provide a race-free total count view
            totalCreated.incrementAndGet();
            success = true;
            return obj;

        } finally {
            // 5. Cleanup on Failure
            // If validation threw an exception, factory failed, or thread died,
            // we must release the permit so other threads aren't starved.
            if (!success) {
                capacity.release();
            }
        }
    }

    public void release(T obj) {
        if (obj == null) {
            return;
        }

        // 1. Atomic Double-Release Check
        // remove() is atomic; if it returns false, the object wasn't inUse (or already released).
        if (inUse.remove(obj)) {
            // 2. Return to queue
            available.offer(obj);
            // 3. Release permit to wake up a waiting thread
            capacity.release();
        }
    }

    public int getAvailableCount() {
        return available.size();
    }

    public int getInUseCount() {
        return inUse.size();
    }

    public int getTotalCount() {
        // Provide a concurrency-safe total count view and never exceed maxSize
        int created = totalCreated.get();
        return created > maxSize ? maxSize : created;
    }

    public void shutdown() {
        available.clear();
        inUse.clear();
        // In a real implementation, we would also loop through and close connections here
    }
}