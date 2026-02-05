package com.eaglepoint.parallel;

public class CountingReducer<T> implements Reducer<T, Long> {
    @Override
    public Long identity() {
        return 0L;
    }

    @Override
    public Long reduce(Long accumulator, T element) {
        return accumulator + 1;
    }

    @Override
    public Long combine(Long left, Long right) {
        return left + right;
    }
}
