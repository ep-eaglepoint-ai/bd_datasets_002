import os
import importlib
import unittest
import time

target_repository = os.environ.get("TARGET_REPOSITORY", "repository_after")
module = importlib.import_module(f"{target_repository}.max_non_decreasing_array_length")

maxNonDecreasingLength = getattr(module, "maxNonDecreasingLength")
# --- Test Cases ---
class TestMaxNonDecreasingLength(unittest.TestCase):

    def test_single_element(self):
        """Edge Case: Single element arrays (return 1)"""
        self.assertEqual(maxNonDecreasingLength([10]), 1)
        self.assertEqual(maxNonDecreasingLength([1]), 1)

    def test_already_non_decreasing(self):
        """Edge Case: Already non-decreasing arrays (return original length)"""
        nums = [1, 2, 3, 4, 5]
        self.assertEqual(maxNonDecreasingLength(nums), 5)

        # Test with duplicates
        nums = [2, 2, 2, 2]
        self.assertEqual(maxNonDecreasingLength(nums), 4)

    def test_requires_complete_merge(self):
        """Edge Case: Arrays requiring complete merge (return 1)"""
        self.assertEqual(maxNonDecreasingLength([100, 50, 25]), 1)

    def test_complex_strategy(self):
        """Logic: Arrays with multiple optimal merge strategies"""
        self.assertEqual(maxNonDecreasingLength([11, 7, 5, 12]), 3)

    def test_performance_decreasing(self):
        """Performance: N=10^5 fully decreasing must complete in < 2s"""
        n = 100000
        # Worst-case for simple greedy approaches
        nums = list(range(n, 0, -1))

        start_time = time.time()
        result = maxNonDecreasingLength(nums)
        duration = time.time() - start_time

        print(f"\nPerformance (Decreasing N={n}): {duration:.4f}s")

        self.assertLess(duration, 2.0, "Algorithm too slow for worst-case input")
        self.assertGreater(result, 0)

    def test_performance_constant(self):
        """Performance: N=10^5 constant values"""
        n = 100000
        nums = [10] * n

        start_time = time.time()
        result = maxNonDecreasingLength(nums)
        duration = time.time() - start_time

        print(f"Performance (Constant N={n}): {duration:.4f}s")

        self.assertLess(duration, 2.0)
        self.assertEqual(result, n)

if __name__ == '__main__':
    # Verbosity=2 gives detailed output for every test case
    unittest.main(argv=['first-arg-is-ignored'], exit=False, verbosity=2)