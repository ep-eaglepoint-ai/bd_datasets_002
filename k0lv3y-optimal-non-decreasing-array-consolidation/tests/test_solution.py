import pytest
import time
import sys
import os

repo_after_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'repository_after')
sys.path.insert(0, repo_after_path)

from solution import findMaximumLength


class TestBasicFunctionality:
    def test_empty(self):
        assert findMaximumLength([]) == 0

    def test_single(self):
        assert findMaximumLength([5]) == 1
        assert findMaximumLength([-5]) == 1
        assert findMaximumLength([0]) == 1

    def test_two_elements(self):
        assert findMaximumLength([1, 2]) == 2
        assert findMaximumLength([2, 1]) == 1


class TestRequirement5AlreadySorted:
    def test_sorted(self):
        assert findMaximumLength([1, 2, 3, 4]) == 4

    def test_sorted_with_duplicates(self):
        assert findMaximumLength([1, 1, 2, 2]) == 4

    def test_all_equal(self):
        assert findMaximumLength([5, 5, 5, 5]) == 4


class TestRequirement6StrictlyDecreasing:
    def test_small(self):
        assert findMaximumLength([3, 2, 1]) == 1

    def test_medium(self):
        assert findMaximumLength([10, 9, 8, 7]) == 1

    def test_negative(self):
        assert findMaximumLength([0, -1, -2, -3]) == 1


class TestPartialConsolidation:
    def test_case_1(self):
        assert findMaximumLength([1, 3, 2, 4]) == 3

    def test_case_2(self):
        assert findMaximumLength([5, -1, 3, 2]) == 2

    def test_case_3(self):
        assert findMaximumLength([2, 1, 4, 3, 6]) == 3


class TestStrategicConsolidation:
    def test_non_greedy(self):
        assert findMaximumLength([1, 2, 1, 3]) == 3

    def test_given_counterexample(self):
        assert findMaximumLength([10, 1, 2, 7, 3]) == 2


class TestDynamicProgrammingCorrectness:
    def test_overlapping_subproblems(self):
        assert findMaximumLength([1, 5, 2, 3, 4]) == 3


class TestEdgeCases:
    def test_negatives(self):
        assert findMaximumLength([-5, -3, -1]) == 3
        assert findMaximumLength([-1, -3, -5]) == 1

    def test_mixed_sign(self):
        assert findMaximumLength([-2, 3, -1, 5]) == 3

    def test_large_values(self):
        assert findMaximumLength([1000000, 1, 2000000]) == 2

    def test_zeros(self):
        assert findMaximumLength([0, 0, 0]) == 3
        assert findMaximumLength([1, 0, 2]) == 2


class TestEarlyTermination:
    def test_early_stop(self):
        # Valid solution: [5, 7, 103] -> length 3
        arr = [5, 4, 3, 2, 1, 100]
        assert findMaximumLength(arr) == 3


class TestComplexity:
    def test_small_runtime(self):
        arr = list(range(20, 0, -1))
        start = time.time()
        result = findMaximumLength(arr)
        assert result == 1
        assert time.time() - start < 0.1

    def test_medium_runtime(self):
        arr = [i % 7 for i in range(60)]
        start = time.time()
        result = findMaximumLength(arr)
        assert result >= 1
        assert time.time() - start < 1.0
