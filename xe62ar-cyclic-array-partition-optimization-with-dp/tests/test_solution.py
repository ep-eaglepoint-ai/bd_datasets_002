import pytest
import time
from repository_after import maxPartitionScore


class TestMaxPartitionScore:
    """Test suite for maxPartitionScore function"""

    def test_example1(self):
        """Test example 1: nums=[1,2,3,3], k=2 -> 2"""
        assert maxPartitionScore([1, 2, 3, 3], 2) == 2

    def test_example2(self):
        """Test example 2: nums=[1,2,3,3], k=1 -> 2"""
        assert maxPartitionScore([1, 2, 3, 3], 1) == 2

    def test_example3(self):
        """Test example 3: nums=[1,2,3,3], k=4 -> 0"""
        assert maxPartitionScore([1, 2, 3, 3], 4) == 0

    def test_identical_elements(self):
        """Test all elements identical: nums=[5,5,5,5], k=2 -> 0"""
        assert maxPartitionScore([5, 5, 5, 5], 2) == 0

    def test_extreme_values_k1(self):
        """Test maximum contrast array: nums=[1, 10^9, 1, 10^9], k=1"""
        nums = [1, 1000000000, 1, 1000000000]
        assert maxPartitionScore(nums, 1) == 999999999

    def test_k_greater_equal_n(self):
        """Test when k >= n: each element separate, range 0"""
        nums = [1, 2, 3, 4]
        assert maxPartitionScore(nums, 4) == 0
        assert maxPartitionScore(nums, 5) == 0

    def test_wraparound_k1(self):
        """Test wraparound subarrays for k=1"""
        nums = [1, 2, 3, 4]
        assert maxPartitionScore(nums, 1) == 3  # 4-1=3

    def test_stress_n1000_k1(self):
        """Stress test: n=1000, k=1"""
        nums = list(range(1, 1001))  # 1 to 1000
        expected = 1000 - 1  # 999
        assert maxPartitionScore(nums, 1) == expected

    def test_stress_n1000_k1000(self):
        """Stress test: n=1000, k=1000"""
        nums = list(range(1, 1001))
        assert maxPartitionScore(nums, 1000) == 0



