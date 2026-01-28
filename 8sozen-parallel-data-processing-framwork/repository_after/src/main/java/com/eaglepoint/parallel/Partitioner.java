package com.eaglepoint.parallel;

import java.util.List;

/**
 * Functional interface for partitioning data into chunks.
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
