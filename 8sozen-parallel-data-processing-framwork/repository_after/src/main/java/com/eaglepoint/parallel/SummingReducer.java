package com.eaglepoint.parallel;

public class SummingReducer implements Reducer<Integer, Integer> {
    @Override
    public Integer identity() {
        return 0;
    }

    @Override
    public Integer reduce(Integer accumulator, Integer element) {
        return accumulator + element;
    }

    @Override
    public Integer combine(Integer left, Integer right) {
        return left + right;
    }
}
