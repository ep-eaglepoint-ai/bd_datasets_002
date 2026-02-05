# Trajectory

1.  **Code Analysis & Inefficiency Identification**: Reviewed the legacy `Concat` implementation (`repository_before`) and identified it as severely over-engineered. The function utilized unnecessary heavy data structures (heaps, rings, linked lists) and expensive standard library operations (regex compilation, JSON marshaling, IO pipes) for a simple task.

2.  **Baseline Verification**: Before optimizing, I verified that the "Before" implementation—despite its complexity—produced the correct output. I created `TestCorrectness` to confirm that the input `["Byte", "Dance", "Go"]` correctly resulted in `"ByteDanceGo"`.

3.  **Technical Research**: Consulted the [Go `strings` package documentation](https://pkg.go.dev/strings) to identify the most idiomatic and performant method for string manipulation. Identified `strings.Builder` as the standard solution for minimizing allocations during concatenation.

4.  **Bottleneck Analysis**: Analyzed the time and space complexity of the original code. Determined that the combination of nested loops and immutable string additions (`+=`) created $O(n^2)$ complexity with massive memory churn (hundreds of allocations per operation).

5.  **Optimized Implementation**: Implemented a minimal, high-performance solution in `repository_after`. Used `strings.Builder` with the `Grow()` method to pre-allocate the exact memory needed (calculated from the total length of input strings), reducing the operation to linear $O(n)$ time.

6.  **Testing & Validation**: Wrote a robust test suite (`tests/concat_test.go`) and evaluation script (`evaluation.go`) to verify the results.
    * **Guardrails**: Implemented panic recovery to handle the broken baseline code without crashing the evaluator.
    * **Efficiency Gates**: Used `testing.AllocsPerRun` to prove the solution achieves exactly 1 allocation per operation.
    * **Final Report**: Generated a `report.json` via a deterministic evaluation script to formally document the transition from failure to success.