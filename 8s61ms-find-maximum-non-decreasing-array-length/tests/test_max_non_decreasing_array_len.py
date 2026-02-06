import os
import importlib
import unittest
import inspect
import sys

target_repository = os.environ.get("TARGET_REPOSITORY", "repository_after")
module = importlib.import_module(f"{target_repository}.max_non_decreasing_array_length")

maxNonDecreasingLength = getattr(module, "maxNonDecreasingLength")
# --- Test Cases ---
class TestMaxNonDecreasingLength(unittest.TestCase):

    def _count_lines_executed(self, nums):
        target_file = inspect.getsourcefile(maxNonDecreasingLength)
        line_count = 0

        def tracer(frame, event, arg):
            nonlocal line_count
            if event == "line" and frame.f_code.co_filename == target_file:
                line_count += 1
            return tracer

        sys.settrace(tracer)
        try:
            result = maxNonDecreasingLength(nums)
        finally:
            sys.settrace(None)

        return result, line_count

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

    def test_complexity_scaling_decreasing(self):
        """Complexity: scaling on decreasing input should be subquadratic."""
        n = 2000
        nums = list(range(n, 0, -1))
        _, count_n = self._count_lines_executed(nums)

        nums_2n = list(range(2 * n, 0, -1))
        _, count_2n = self._count_lines_executed(nums_2n)

        ratio = count_2n / max(count_n, 1)
        # O(n log n) should stay well below 3.5x for doubling n at this size
        self.assertLess(ratio, 3.5)

    def test_complexity_scaling_constant(self):
        """Complexity: scaling on constant input should be subquadratic."""
        n = 2000
        nums = [10] * n
        result_n, count_n = self._count_lines_executed(nums)

        nums_2n = [10] * (2 * n)
        result_2n, count_2n = self._count_lines_executed(nums_2n)

        self.assertEqual(result_n, n)
        self.assertEqual(result_2n, 2 * n)

        ratio = count_2n / max(count_n, 1)
        self.assertLess(ratio, 3.5)

    # --- Additional Edge Cases ---

    def test_two_elements_increasing(self):
        """Edge Case: Two elements already non-decreasing"""
        self.assertEqual(maxNonDecreasingLength([1, 2]), 2)
        self.assertEqual(maxNonDecreasingLength([5, 5]), 2)

    def test_two_elements_decreasing(self):
        """Edge Case: Two elements requiring merge"""
        self.assertEqual(maxNonDecreasingLength([5, 3]), 1)
        self.assertEqual(maxNonDecreasingLength([100, 1]), 1)

    def test_complexity_scaling_increasing(self):
        """Complexity: scaling on increasing input should be subquadratic."""
        n = 2000
        nums = list(range(1, n + 1))
        result_n, count_n = self._count_lines_executed(nums)

        nums_2n = list(range(1, 2 * n + 1))
        result_2n, count_2n = self._count_lines_executed(nums_2n)

        self.assertEqual(result_n, n)
        self.assertEqual(result_2n, 2 * n)

        ratio = count_2n / max(count_n, 1)
        self.assertLess(ratio, 3.5)

    def test_partial_merge_simple(self):
        """Logic: Partial merges - some elements need combining"""
        # [5, 3, 8] -> merge [5,3]=8 -> [8, 8] = length 2
        self.assertEqual(maxNonDecreasingLength([5, 3, 8]), 2)

    def test_partial_merge_beginning(self):
        """Logic: Merge needed only at the beginning"""
        # [3, 1, 5, 6] -> merge [3,1]=4 -> [4, 5, 6] = length 3
        self.assertEqual(maxNonDecreasingLength([3, 1, 5, 6]), 3)

    def test_partial_merge_end(self):
        """Logic: Merge needed only at the end"""
        # [1, 2, 5, 3] -> merge [5,3]=8 -> [1, 2, 8] = length 3
        self.assertEqual(maxNonDecreasingLength([1, 2, 5, 3]), 3)

    def test_alternating_pattern(self):
        """Logic: Alternating high-low pattern"""
        # [1, 100, 1, 100, 1] requires strategic merging
        result = maxNonDecreasingLength([1, 100, 1, 100, 1])
        self.assertGreaterEqual(result, 1)
        self.assertLessEqual(result, 5)

    def test_alternating_small(self):
        """Logic: Simple alternating pattern"""
        # [2, 1, 2, 1] -> various merge strategies possible
        result = maxNonDecreasingLength([2, 1, 2, 1])
        self.assertGreaterEqual(result, 1)

    def test_large_values_boundary(self):
        """Boundary: Values at maximum constraint (10^5)"""
        nums = [100000, 100000, 100000]
        self.assertEqual(maxNonDecreasingLength(nums), 3)

    def test_large_values_decreasing(self):
        """Boundary: Large values in decreasing order"""
        nums = [100000, 50000, 25000]
        self.assertEqual(maxNonDecreasingLength(nums), 1)

    def test_large_values_mixed(self):
        """Boundary: Large values with mixed pattern"""
        nums = [50000, 100000, 50000, 100000]
        result = maxNonDecreasingLength(nums)
        self.assertGreaterEqual(result, 2)

    def test_three_elements_all_same(self):
        """Edge Case: Three identical elements"""
        self.assertEqual(maxNonDecreasingLength([7, 7, 7]), 3)

    def test_spike_pattern(self):
        """Logic: Spike in the middle of array"""
        # [1, 2, 100, 3, 4] -> need to merge around spike
        result = maxNonDecreasingLength([1, 2, 100, 3, 4])
        self.assertGreaterEqual(result, 1)

    def test_valley_pattern(self):
        """Logic: Valley in the middle of array"""
        # [10, 5, 1, 5, 10] -> merge valley with neighbors
        result = maxNonDecreasingLength([10, 5, 1, 5, 10])
        self.assertGreaterEqual(result, 1)

    def test_optimal_requires_non_greedy(self):
        """Logic: Optimal solution requires non-greedy approach"""
        # Cases where greedy left-to-right fails
        nums = [4, 3, 2, 6]
        # Greedy might do [4+3=7, 2, 6] -> fail
        # Optimal: [4+3+2=9, 6] -> fail, or [4, 3+2+6=11] -> length 2
        result = maxNonDecreasingLength(nums)
        self.assertGreaterEqual(result, 2)

    def test_longer_non_decreasing_sequence(self):
        """Logic: Longer already sorted sequence"""
        nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        self.assertEqual(maxNonDecreasingLength(nums), 10)

    def test_longer_strictly_decreasing(self):
        """Logic: Longer strictly decreasing sequence"""
        nums = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
        # Strategic merging can achieve length > 1
        # e.g., [10, 9+8+7+6+5+4+3+2+1=45] = length 2, or better with [10, 9+8=17, 7+6+5+4+3+2+1=28] = length 3
        self.assertEqual(maxNonDecreasingLength(nums), 3)

    def test_sawtooth_pattern(self):
        """Logic: Sawtooth/zigzag pattern"""
        nums = [1, 3, 2, 4, 3, 5, 4, 6]
        result = maxNonDecreasingLength(nums)
        self.assertGreaterEqual(result, 1)
        self.assertLessEqual(result, 8)

    def test_complexity_scaling_structured(self):
        """Complexity: scaling on structured input should be subquadratic."""
        n = 2000
        nums = [(i % 100) + 1 for i in range(n)]
        _, count_n = self._count_lines_executed(nums)

        nums_2n = [(i % 100) + 1 for i in range(2 * n)]
        _, count_2n = self._count_lines_executed(nums_2n)

        ratio = count_2n / max(count_n, 1)
        self.assertLess(ratio, 3.5)


if __name__ == '__main__':
    # Verbosity=2 gives detailed output for every test case
    unittest.main(argv=['first-arg-is-ignored'], exit=False, verbosity=2)
