package com.eaglepoint.parallel;

public class IdentityMapper<T> implements Mapper<T, T> {
    @Override
    public T map(T element) {
        return element;
    }
}
