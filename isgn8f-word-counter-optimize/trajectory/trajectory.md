# Trajectory

1.  **Code Audit & Bottleneck Detection**
    The first step was analyzing the legacy implementation (`repository_before`) to identify performance bottlenecks. The audit revealed three major issues: multiple file reads (I/O heavy), quadratic time complexity in `find_word_positions` (scans file from scratch for every word), and manual string parsing loops. I documented these inefficiencies to guide the single-pass architecture design.
    *   Resource: [Python Performance Tips (Time Complexity)](https://wiki.python.org/moin/PythonSpeed/PerformanceTips)

2.  **Defining the Performance Contract (Behavioral Baseline)**
    Optimization must not break existing behavior. I created a "contract" by analyzing the exact statistical output of the legacy code. I discovered quirks: line counts started at 1 (even for empty files), and "words" included numbers while "frequencies" did not. I wrote `tests/test_behavior_check.py` to lock in these behaviors before refactoring, ensuring the optimized code would be a drop-in replacement.
    *   Resource: [Refactoring: Improving the Design of Existing Code](https://martinfowler.com/books/refactoring.html)

3.  **Data Model Optimization (Single-Pass Structures)**
    I redesigned the data model to support O(N) single-pass processing. I selected `collections.Counter` to replace manual dictionary counting for speed (implemented in C) and `defaultdict(list)` to build the positional index on-the-fly. This eliminated the need to store the raw text in memory, addressing the 100MB+ file constraint.
    *   Resource: [Python collections.Counter Documentation](https://docs.python.org/3/library/collections.html#collections.Counter)

4.  **Refactoring the Hot Path (Stream Processing)**
    I implemented the `_process_file` method as the central "hot path". Instead of `read()` (which loads everything), I used a file iterator (`for line in file:`) to process chunks. I combined the logic for line counting, word counting, and frequency tracking into this single effective loop using `re.finditer` for efficient tokenization without memory overhead.
    *   Resource: [Python Iterator Protocol](https://docs.python.org/3/library/stdtypes.html#typeiter)

5.  **Verification with Metrics & Tests**
    Finally, I verified the optimization using a dual-layer approach. First, I ran the unit test suite (`tests/test_word_counter.py`) to prove functional correctness. Second, I ran the project's atomic evaluation script (`evaluation.py`) to confirm that the new implementation passed all 8 tests while the old implementation failed the "single pass" check, proving the optimization was successful and robust.
    *   Resource: [Test-Driven Development (TDD)](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
