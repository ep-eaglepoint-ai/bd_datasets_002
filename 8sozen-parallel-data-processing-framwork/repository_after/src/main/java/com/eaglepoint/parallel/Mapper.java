package com.eaglepoint.parallel;

/**
 * Functional interface for transforming an input element to an intermediate result.
 *
 * @param <T> the type of the input element
 * @param <M> the type of the intermediate result
 */
@FunctionalInterface
public interface Mapper<T, M> {
    /**
     * Transforms a single input element.
     *
     * @param element the input element
     * @return the transformed result
     */
    M map(T element);
}
