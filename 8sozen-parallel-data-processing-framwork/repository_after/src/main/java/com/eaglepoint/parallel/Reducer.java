package com.eaglepoint.parallel;

/**
 * Interface for reducing intermediate results into a final result.
 * 
 * <p>A Reducer must define an identity value, a reduction operation to combine
 * elements into an accumulator, and a combination operation to merge two partial results.
 * 
 * <p>The combine operation must be associative: combine(a, combine(b, c)) == combine(combine(a, b), c).
 * The identity value must be a neutral element: combine(identity(), x) == x.
 * 
 * <p>Thread-safety: The reducer methods themselves are typical functions. The framework
 * ensures that parallel results are combined correctly.
 * 
 * <p>Example usage (Summing integers):
 * <pre>
 * Reducer&lt;Integer, Integer&gt; sumReducer = new Reducer&lt;&gt;() {
 *     public Integer identity() { return 0; }
 *     public Integer reduce(Integer acc, Integer el) { return acc + el; }
 *     public Integer combine(Integer left, Integer right) { return left + right; }
 * };
 * </pre>
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
