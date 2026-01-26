package cache;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

/**
 * A cache implementation that prevents the "cache stampede" (thundering herd) problem.
 * 
 * When multiple threads request the same missing key simultaneously, this implementation
 * ensures that:
 * <ul>
 *   <li>The expensive computation executes only once per key</li>
 *   <li>All concurrent callers wait for and receive the same result</li>
 *   <li>Failures are consistently propagated to all waiting callers</li>
 *   <li>Different keys do not block each other</li>
 *   <li>Internal state is cleaned up after computation completes</li>
 * </ul>
 * 
 * <h2>Design Principles</h2>
 * <ul>
 *   <li><strong>No busy waiting</strong>: Uses CompletableFuture for efficient blocking</li>
 *   <li><strong>No background threads</strong>: Computation runs on the calling thread</li>
 *   <li><strong>No thread pools</strong>: Only uses Java standard library concurrency primitives</li>
 *   <li><strong>No global synchronization</strong>: Uses ConcurrentHashMap for per-key coordination</li>
 * </ul>
 * 
 * <h2>Thread Safety</h2>
 * This class is thread-safe and designed for high-concurrency environments.
 * 
 * @param <K> the type of keys maintained by this cache
 * @param <V> the type of cached values
 */
public class SingleFlightCache<K, V> {
    
    /**
     * Map of in-flight computations. Each entry represents a computation that is
     * either currently executing or has just completed.
     * 
     * Key: The cache key being computed
     * Value: A CompletableFuture that will hold the computation result
     * 
     * Entries are removed immediately after the computation completes (success or failure)
     * to prevent memory leaks and allow retries on subsequent requests.
     */
    private final ConcurrentHashMap<K, CompletableFuture<V>> inFlightComputations;
    
    /**
     * Constructs a new SingleFlightCache with default settings.
     */
    public SingleFlightCache() {
        this.inFlightComputations = new ConcurrentHashMap<>();
    }
    
    /**
     * Constructs a new SingleFlightCache with specified initial capacity.
     * 
     * @param initialCapacity the initial capacity of the internal map
     * @throws IllegalArgumentException if initialCapacity is negative
     */
    public SingleFlightCache(int initialCapacity) {
        if (initialCapacity < 0) {
            throw new IllegalArgumentException("Initial capacity must be non-negative: " + initialCapacity);
        }
        this.inFlightComputations = new ConcurrentHashMap<>(initialCapacity);
    }
    
    /**
     * Gets or computes a value for the specified key.
     * 
     * If a computation is already in progress for this key, the calling thread
     * will wait for and receive the same result as the thread that started the
     * computation. This ensures that:
     * <ul>
     *   <li>The computation function is called at most once per key at any given time</li>
     *   <li>All waiting threads receive the same result (or exception)</li>
     *   <li>Failures are propagated consistently to all callers</li>
     * </ul>
     * 
     * <p><strong>Important:</strong> This method does NOT cache the result permanently.
     * Each call after the computation completes will trigger a new computation.
     * For permanent caching, combine this with a separate result cache.</p>
     * 
     * @param key the key for which to compute the value (must not be null)
     * @param computeFunction the function to compute the value if not already being computed
     *                        (must not be null)
     * @return the computed value (may be null if the computation produces null)
     * @throws NullPointerException if key or computeFunction is null
     * @throws ComputationException if the computation fails
     * @throws InterruptedException if the current thread is interrupted while waiting
     */
    public V get(K key, ComputeFunction<K, V> computeFunction) throws InterruptedException {
        if (key == null) {
            throw new NullPointerException("Key must not be null");
        }
        if (computeFunction == null) {
            throw new NullPointerException("Compute function must not be null");
        }
        
        // Create a new CompletableFuture that will hold the computation result
        CompletableFuture<V> newFuture = new CompletableFuture<>();
        
        // Atomically try to insert our future. If another thread already inserted
        // one for this key, we get their future instead.
        CompletableFuture<V> existingFuture = inFlightComputations.putIfAbsent(key, newFuture);
        
        if (existingFuture != null) {
            // Another thread is already computing this key - wait for their result
            return waitForResult(existingFuture);
        }
        
        // We are the first thread for this key - perform the computation
        return executeComputation(key, computeFunction, newFuture);
    }
    
    /**
     * Executes the computation and properly handles success/failure cleanup.
     * 
     * This method ensures that:
     * <ul>
     *   <li>The computation result (or exception) is published to all waiters</li>
     *   <li>The in-flight entry is removed after completion</li>
     *   <li>Exceptions are properly propagated</li>
     * </ul>
     * 
     * @param key the key being computed
     * @param computeFunction the function to execute
     * @param future the future to complete with the result
     * @return the computed value
     * @throws InterruptedException if the computation is interrupted
     * @throws ComputationException if the computation fails
     */
    private V executeComputation(K key, ComputeFunction<K, V> computeFunction, 
                                  CompletableFuture<V> future) throws InterruptedException {
        try {
            // Execute the expensive computation
            V result = computeFunction.compute(key);
            
            // Publish success to all waiting threads
            future.complete(result);
            
            return result;
            
        } catch (InterruptedException e) {
            // Preserve interrupt status and propagate failure to waiters
            future.completeExceptionally(e);
            Thread.currentThread().interrupt();
            throw e;
            
        } catch (Exception e) {
            // Propagate failure to all waiting threads
            future.completeExceptionally(e);
            throw new ComputationException("Computation failed for key: " + key, e);
            
        } finally {
            // Always clean up the in-flight entry to prevent memory leaks
            // and allow subsequent requests to retry
            cleanupInflightEntry(key, future);
        }
    }
    
    /**
     * Waits for an existing computation to complete and returns its result.
     * 
     * This method blocks the calling thread until the computation completes,
     * using CompletableFuture's efficient waiting mechanism (no busy waiting).
     * 
     * @param future the future representing the in-flight computation
     * @return the computed value
     * @throws InterruptedException if the current thread is interrupted while waiting
     * @throws ComputationException if the computation failed
     */
    private V waitForResult(CompletableFuture<V> future) throws InterruptedException {
        try {
            // Block until the computation completes
            // This uses efficient OS-level waiting, not busy waiting
            return future.get();
            
        } catch (ExecutionException e) {
            // The computation threw an exception - propagate it
            Throwable cause = e.getCause();
            
            if (cause instanceof InterruptedException) {
                throw (InterruptedException) cause;
            }
            
            if (cause instanceof ComputationException) {
                throw (ComputationException) cause;
            }
            
            throw new ComputationException("Computation failed", cause);
            
        } catch (InterruptedException e) {
            // Current thread was interrupted while waiting
            Thread.currentThread().interrupt();
            throw e;
        }
    }
    
    /**
     * Removes the in-flight computation entry for the given key.
     * 
     * This cleanup is essential for:
     * <ul>
     *   <li>Preventing memory leaks from accumulated entries</li>
     *   <li>Allowing subsequent requests to trigger new computations</li>
     *   <li>Ensuring failed computations can be retried</li>
     * </ul>
     * 
     * The removal is conditional - only removes if the current value matches
     * the provided future. This prevents accidentally removing a newer computation
     * that was started after this one completed.
     * 
     * @param key the key to remove
     * @param future the specific future to remove (must match current value)
     */
    private void cleanupInflightEntry(K key, CompletableFuture<V> future) {
        // Use remove(key, value) to only remove if the value matches
        // This prevents race conditions where a new computation was started
        // after this one completed
        inFlightComputations.remove(key, future);
    }
    
    /**
     * Returns the number of currently in-flight computations.
     * 
     * This method is primarily useful for testing and monitoring.
     * The returned value is a snapshot and may be immediately stale
     * in a concurrent environment.
     * 
     * @return the number of keys currently being computed
     */
    public int getInflightCount() {
        return inFlightComputations.size();
    }
    
    /**
     * Checks if a computation is currently in progress for the specified key.
     * 
     * This method is primarily useful for testing and monitoring.
     * The returned value is a snapshot and may be immediately stale
     * in a concurrent environment.
     * 
     * @param key the key to check
     * @return true if a computation is in progress for this key, false otherwise
     */
    public boolean isInflight(K key) {
        return inFlightComputations.containsKey(key);
    }
}
