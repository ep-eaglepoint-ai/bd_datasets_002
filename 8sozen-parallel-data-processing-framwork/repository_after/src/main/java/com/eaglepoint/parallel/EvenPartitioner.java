package com.eaglepoint.parallel;

import java.util.ArrayList;
import java.util.List;

public class EvenPartitioner<T> implements Partitioner<T> {
    @Override
    public List<List<T>> partition(List<T> data, int numPartitions) {
        List<List<T>> partitions = new ArrayList<>(numPartitions);
        if (data == null || data.isEmpty()) {
            return partitions;
        }

        int size = data.size();
        int chunkSize = (int) Math.ceil((double) size / numPartitions);

        for (int i = 0; i < size; i += chunkSize) {
            partitions.add(data.subList(i, Math.min(size, i + chunkSize)));
        }
        return partitions;
    }
}
