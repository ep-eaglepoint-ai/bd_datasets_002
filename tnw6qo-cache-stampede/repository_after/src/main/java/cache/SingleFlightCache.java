package cache;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

public class SingleFlightCache<K, V> {
    private final ConcurrentHashMap<K, CompletableFuture<V>> inFlightComputations;
    
    public SingleFlightCache() {
        this.inFlightComputations = new ConcurrentHashMap<>();
    }
    
    public SingleFlightCache(int initialCapacity) {
        if (initialCapacity < 0) {
            throw new IllegalArgumentException("Initial capacity must be non-negative: " + initialCapacity);
        }
        this.inFlightComputations = new ConcurrentHashMap<>(initialCapacity);
    }
   
    public V get(K key, ComputeFunction<K, V> computeFunction) throws InterruptedException {
        if (key == null) {
            throw new NullPointerException("Key must not be null");
        }
        if (computeFunction == null) {
            throw new NullPointerException("Compute function must not be null");
        }
        
        CompletableFuture<V> newFuture = new CompletableFuture<>();
        
        CompletableFuture<V> existingFuture = inFlightComputations.putIfAbsent(key, newFuture);
        
        if (existingFuture != null) {
            return waitForResult(existingFuture);
        }
        
        return executeComputation(key, computeFunction, newFuture);
    }
    
    private V executeComputation(K key, ComputeFunction<K, V> computeFunction, 
                                  CompletableFuture<V> future) throws InterruptedException {
        try {
            V result = computeFunction.compute(key);
            
            future.complete(result);
            
            return result;
            
        } catch (InterruptedException e) {
            future.completeExceptionally(e);
            Thread.currentThread().interrupt();
            throw e;
            
        } catch (Exception e) {
            future.completeExceptionally(e);
            throw new ComputationException("Computation failed for key: " + key, e);
            
        } finally {
            
            cleanupInflightEntry(key, future);
        }
    }
    
    
    private V waitForResult(CompletableFuture<V> future) throws InterruptedException {
        try {
         
            return future.get();
            
        } catch (ExecutionException e) {
           
            Throwable cause = e.getCause();
            
            if (cause instanceof InterruptedException) {
                throw (InterruptedException) cause;
            }
            
            if (cause instanceof ComputationException) {
                throw (ComputationException) cause;
            }
            
            throw new ComputationException("Computation failed", cause);
            
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw e;
        }
    }
    
    private void cleanupInflightEntry(K key, CompletableFuture<V> future) {
    
        inFlightComputations.remove(key, future);
    }
    
    public int getInflightCount() {
        return inFlightComputations.size();
    }
    
    
    public boolean isInflight(K key) {
        return inFlightComputations.containsKey(key);
    }
}
