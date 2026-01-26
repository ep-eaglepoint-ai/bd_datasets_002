package cache;

/**
 * Functional interface for computing expensive values.
 * 
 * This interface represents a computation that produces a value for a given key.
 * The computation may be expensive (e.g., database query, API call, complex calculation)
 * and should only be executed once per key under concurrent access.
 *
 * @param <K> the type of the key
 * @param <V> the type of the computed value
 */
@FunctionalInterface
public interface ComputeFunction<K, V> {
    
    /**
     * Computes a value for the given key.
     * 
     * This method may throw any exception if the computation fails.
     * The exception will be propagated to all callers waiting for this key's result.
     *
     * @param key the key for which to compute the value
     * @return the computed value (may be null if the computation produces null)
     * @throws Exception if the computation fails
     */
    V compute(K key) throws Exception;
}
