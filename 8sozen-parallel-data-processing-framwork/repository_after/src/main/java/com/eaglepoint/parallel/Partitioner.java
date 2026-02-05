package com.eaglepoint.parallel;

import java.util.List;

/**
 * Functional interface for partitioning data into chunks.
 * 
 * <p>Partitions the input data into a specified number of sub-lists.
 * Custom strategies can be implemented for load balancing or specific data locality.
 * 
 * <p>Thread-safety: The partitioner is typically called on the main thread before
 * submitting tasks.
 * 
 * <p>Example usage:
 * <pre>
 * Partitioner&lt;Integer&gt; evenSplitter = (data, num) -&gt; { ... };
 * </pre>
 *
 * @param <T> the type of the input elements
 */
@FunctionalInterface
public interface Partitioner<T> {
    /**
     * Partitions the data into the specified number of chunks.
     *
     * @param data          the input data
     * @param numPartitions the target number of partitions
     * @return a list of partitions
     */
    List<List<T>> partition(List<T> data, int numPartitions);
}
