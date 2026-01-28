package com.eaglepoint.parallel;

/**
 * Functional interface for reducing intermediate results into a final result.
 *
 * @param <M> the type of the intermediate result
 * @param <R> the type of the final result
 */
public interface Reducer<M, R> {
    /**
     * Returns the identity value for the reduction.
     * This value must be the neutral element for the reduction operation.
     *
     * @return the identity value
     */
    R identity();

    /**
     * Combines an intermediate result into the accumulator.
     *
     * @param accumulator the current accumulated value
     * @param element     the intermediate element to add
     * @return the new accumulated value
     */
    R reduce(R accumulator, M element);

    /**
     * Merges two partial results from parallel execution.
     * Must be associative.
     *
     * @param left  the left partial result
     * @param right the right partial result
     * @return the merged result
     */
    R combine(R left, R right);
}
