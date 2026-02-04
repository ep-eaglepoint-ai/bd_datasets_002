package pool;

import java.util.LinkedList;
import java.util.Queue;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import java.util.function.Predicate;

public class ConnectionPool<T> {
    private final Queue<T> available;
    private final Set<T> inUse;
    private final int maxSize;
    private final Supplier<T> factory;
    private final Predicate<T> validator;
    private final long defaultTimeoutMs;
    
    public ConnectionPool(int maxSize, Supplier<T> factory, Predicate<T> validator, long defaultTimeoutMs) {
        this.available = new LinkedList<>();
        this.inUse = new HashSet<>();
        this.maxSize = maxSize;
        this.factory = factory;
        this.validator = validator;
        this.defaultTimeoutMs = defaultTimeoutMs;
    }
    
    public T borrow() throws InterruptedException {
        return borrow(defaultTimeoutMs, TimeUnit.MILLISECONDS);
    }
    
    public T borrow(long timeout, TimeUnit unit) throws InterruptedException {
        long timeoutMs = unit.toMillis(timeout);
        long deadline = System.currentTimeMillis() + timeoutMs;
        
        synchronized (this) {
            if (available.isEmpty() && inUse.size() < maxSize) {
                T newObj = factory.get();
                inUse.add(newObj);
                return newObj;
            }
            
            if (available.isEmpty()) {
                wait(timeoutMs);
            }
            
            if (available.isEmpty()) {
                throw new RuntimeException("Pool exhausted: timeout waiting for available object");
            }
            
            T obj = available.poll();
            
            if (!validator.test(obj)) {
                obj = factory.get();
            }
            
            inUse.add(obj);
            return obj;
        }
    }
    
    public void release(T obj) {
        synchronized (this) {
            if (!inUse.contains(obj)) {
                return;
            }
            inUse.remove(obj);
            available.offer(obj);
        }
    }
    
    public synchronized int getAvailableCount() {
        return available.size();
    }
    
    public synchronized int getInUseCount() {
        return inUse.size();
    }
    
    public synchronized int getTotalCount() {
        return available.size() + inUse.size();
    }
    
    public void shutdown() {
        synchronized (this) {
            available.clear();
            inUse.clear();
        }
    }
}

