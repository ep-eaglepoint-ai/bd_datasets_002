
import pytest
import time
import sys
import os
from typing import List

# Import from repository_after - works both locally and in Docker
repo_after_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'repository_after')
sys.path.insert(0, repo_after_path)
from solution import findMaximumLength


class TestBasicFunctionality:
    def test_empty_array(self):
        assert findMaximumLength([]) == 0
    
    def test_single_element(self):
        assert findMaximumLength([5]) == 1
        assert findMaximumLength([-5]) == 1
        assert findMaximumLength([0]) == 1
    
    def test_two_elements_ascending(self):
        assert findMaximumLength([1, 2]) == 2
    
    def test_two_elements_descending(self):
        assert findMaximumLength([2, 1]) == 1


class TestNonDecreasingArrays:
    def test_already_sorted_small(self):
        assert findMaximumLength([1, 2, 3]) == 3
    
    def test_already_sorted_with_duplicates(self):
        assert findMaximumLength([1, 1, 2, 2, 3]) == 5
    
    def test_already_sorted_large(self):
        arr = list(range(100))
        assert findMaximumLength(arr) == 100
    
    def test_all_equal_elements(self):
        assert findMaximumLength([5, 5, 5, 5]) == 4


class TestStrictlyDecreasingArrays:
    def test_strictly_decreasing_small(self):
        assert findMaximumLength([3, 2, 1]) == 1
    
    def test_strictly_decreasing_medium(self):
        assert findMaximumLength([5, 4, 3, 2, 1]) == 1
    
    def test_strictly_decreasing_negative(self):
        assert findMaximumLength([0, -1, -2, -3]) == 1


class TestPartialConsolidation:
    def test_partial_consolidation_example1(self):
        assert findMaximumLength([1, 3, 2, 4]) == 3
    
    def test_partial_consolidation_example2(self):
        assert findMaximumLength([5, -1, 3, 2]) == 2
    
    def test_partial_consolidation_example3(self):
        assert findMaximumLength([2, 1, 4, 3, 6]) == 3


class TestStrategicConsolidation:
    def test_strategic_choice_1(self):
        assert findMaximumLength([1, 2, 1, 3]) == 3
    
    def test_strategic_choice_2(self):
        assert findMaximumLength([10, 1, 2, 7, 3]) == 2


class TestDynamicProgramming:
    def test_overlapping_subproblems(self):
        assert findMaximumLength([1, 5, 2, 3, 4]) == 3


class TestComplexityRequirements:
    def test_time_complexity_small(self):
        arr = list(range(10, 0, -1))
        start = time.time()
        result = findMaximumLength(arr)
        elapsed = time.time() - start
        assert result >= 1
        assert elapsed < 0.1
    
    def test_time_complexity_medium(self):
        arr = [i % 5 for i in range(50)]
        start = time.time()
        result = findMaximumLength(arr)
        elapsed = time.time() - start
        assert result >= 1
        assert elapsed < 1.0


class TestEdgeCases:
    def test_negative_numbers(self):
        assert findMaximumLength([-5, -3, -1]) == 3
        assert findMaximumLength([-1, -3, -5]) == 1
    
    def test_mixed_positive_negative(self):
        assert findMaximumLength([-2, 3, -1, 5]) == 3
    
    def test_large_values(self):
        assert findMaximumLength([1000000, 1, 2000000]) == 2
    
    def test_zeros(self):
        assert findMaximumLength([0, 0, 0]) == 3
        assert findMaximumLength([1, 0, 2]) == 2


class TestRequirementsCoverage:
    def test_req_5_already_sorted(self):
        assert findMaximumLength([1, 2, 3, 4, 5]) == 5
    
    def test_req_6_strictly_decreasing(self):
        assert findMaximumLength([10, 9, 8, 7]) == 1
    
    def test_req_10_single_element(self):
        assert findMaximumLength([42]) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
