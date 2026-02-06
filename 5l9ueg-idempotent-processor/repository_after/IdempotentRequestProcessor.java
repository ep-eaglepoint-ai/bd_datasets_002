import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

public class IdempotentRequestProcessor<K, V> {
    private final Map<K, CompletableFuture<V>> storage;
    private final Queue<K> evictionQueue;
    private final AtomicInteger currentSize;
    private final int maxCapacity;

public IdempotentRequestProcessor(int maxCapacity) {
    if (maxCapacity <= 0) {
        throw new IllegalArgumentException("Capacity must be positive");
    }
    this.maxCapacity = maxCapacity;
    this.storage = new ConcurrentHashMap<>();
    this.evictionQueue = new ConcurrentLinkedQueue<>();
    this.currentSize = new AtomicInteger(0);
}

public V process(K requestId, Supplier<V> action) {
    CompletableFuture<V> promise = new CompletableFuture<>();
    CompletableFuture<V> existing = storage.putIfAbsent(requestId, promise);

    if (existing != null) {
        return joinAndUnwrap(existing);
    }

    // Maintain bounded memory
    enforceCapacity();
    
    evictionQueue.offer(requestId);
    currentSize.incrementAndGet();

    try {
        V result = action.get();
        promise.complete(result);
        return result;
    } catch (Throwable t) {
        promise.completeExceptionally(t);
        throw unwrapException(t);
    }
}

private V joinAndUnwrap(CompletableFuture<V> future) {
    try {
        return future.join();
    } catch (CompletionException e) {
        throw unwrapException(e.getCause());
    }
}

private RuntimeException unwrapException(Throwable t) {
    if (t instanceof RuntimeException) {
        return (RuntimeException) t;
    }
    return new CompletionException(t);
}

private void enforceCapacity() {
    while (currentSize.get() >= maxCapacity) {
        K keyToRemove = evictionQueue.poll();
        if (keyToRemove == null) {
            // Queue is empty, reset size to match reality and break
            currentSize.set(0);
            break;
        }
        if (storage.remove(keyToRemove) != null) {
            currentSize.decrementAndGet();
        }
    }
}
}