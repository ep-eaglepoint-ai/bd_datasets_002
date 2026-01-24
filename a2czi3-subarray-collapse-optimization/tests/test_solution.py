import unittest
import random
import time
from repository_after.solution import Solution

class TestFindMaximumNonDecreasingLength(unittest.TestCase):
    def setUp(self):
        self.solution = Solution()

    def test_example_1(self):
        # [5, 2, 2] -> merge [5,2,2] -> [9]. Length 1.
        self.assertEqual(self.solution.findMaximumNonDecreasingLength([5, 2, 2]), 1)

    def test_example_2(self):
        # [1, 2, 3, 4] -> already non-decreasing. Length 4.
        self.assertEqual(self.solution.findMaximumNonDecreasingLength([1, 2, 3, 4]), 4)

    def test_example_3(self):
        # [4, 3, 2, 6] -> [4, 3+2, 6] -> [4, 5, 6]. Length 3.
        self.assertEqual(self.solution.findMaximumNonDecreasingLength([4, 3, 2, 6]), 3)

    def test_single_element(self):
        self.assertEqual(self.solution.findMaximumNonDecreasingLength([42]), 1)

    def test_all_identical(self):
        self.assertEqual(self.solution.findMaximumNonDecreasingLength([7, 7, 7, 7]), 4)

    def test_strictly_decreasing(self):
        # [10, 9, 8, 7] -> [10], [9+8+7]=24. [10, 24]. Length 2.
        # Prompt said 1 but 2 is clearly possible and valid.
        self.assertEqual(self.solution.findMaximumNonDecreasingLength([10, 9, 8, 7]), 2)

    def test_alternating_high_low(self):
        # [1, 100, 2, 99, 3] -> [1, 100+2+99, 3]? No.
        # [1, 201, 3] Bad.
        # [1, 100], [2, 99, 3] -> [1, 100, 104]. Len 3.
        # [1], [100], [2] (X), [2+99+3] -> [1, 100, 104]. Len 3.
        # Result should be 3.
        self.assertEqual(self.solution.findMaximumNonDecreasingLength([1, 100, 2, 99, 3]), 3)

    def test_negatives(self):
        # [-5, 5] -> [-5, 5]. Len 2.
        self.assertEqual(self.solution.findMaximumNonDecreasingLength([-5, 5]), 2)
        # [5, -5] -> [0]. Len 1.
        self.assertEqual(self.solution.findMaximumNonDecreasingLength([5, -5]), 1)
        # [-10, -2, -3, -4] -> [-10], [-5], [-4]. Len 3.
        self.assertEqual(self.solution.findMaximumNonDecreasingLength([-10, -2, -3, -4]), 3)

    def test_large_random(self):
        # Deterministic random
        random.seed(42)
        nums = [random.randint(1, 1000) for _ in range(1000)]
        # Just check it runs and produces reasonable output
        res = self.solution.findMaximumNonDecreasingLength(nums)
        self.assertTrue(1 <= res <= 1000)
        
    def test_large_strictly_decreasing(self):
        # N=100,000 decreasing
        # It's possible to form sqrt(2*Sum) length sequence roughly.
        # 374 is a reasonable result for this input, NOT 1.
        nums = list(range(100000, 0, -1))
        start = time.time()
        res = self.solution.findMaximumNonDecreasingLength(nums)
        end = time.time()
        self.assertGreater(res, 1) 
        self.assertLess(end - start, 5.0) # Should be fast

    def test_large_non_decreasing(self):
        nums = list(range(100000))
        start = time.time()
        res = self.solution.findMaximumNonDecreasingLength(nums)
        end = time.time()
        self.assertEqual(res, 100000)
        self.assertLess(end - start, 2.0)

if __name__ == '__main__':
    unittest.main()
