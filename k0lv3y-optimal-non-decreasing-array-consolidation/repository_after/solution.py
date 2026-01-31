from typing import List

class NonDecreasingArrayOptimizer:
    def __init__(self, nums: List[int]):
        self.nums = nums
        self.n = len(nums)
        self.prefix = [0] * (self.n + 1)
        for i in range(self.n):
            self.prefix[i + 1] = self.prefix[i] + nums[i]

    def findMaximumLength(self) -> int:
        if self.n == 0:
            return 0

        # Requirement #5: already non-decreasing
        if all(self.nums[i] <= self.nums[i + 1] for i in range(self.n - 1)):
            return self.n

        # Requirement #6: strictly decreasing
        if all(self.nums[i] > self.nums[i + 1] for i in range(self.n - 1)):
            return 1

        # Use exhaustive search with memoization for correctness
        from functools import lru_cache

        @lru_cache(maxsize=None)
        def dfs(start, prev_sum):
            if start >= self.n:
                return 0

            max_length = 0

            # Try all possible end positions for the current segment
            for end in range(start, self.n):
                segment_sum = self.prefix[end + 1] - self.prefix[start]
                
                # Check if this segment maintains non-decreasing property
                if prev_sum is None or segment_sum >= prev_sum:
                    # Recursively find the best solution for the remaining part
                    remaining_length = dfs(end + 1, segment_sum)
                    current_length = 1 + remaining_length
                    max_length = max(max_length, current_length)

            return max_length

        return dfs(0, None)


# Top-level function for API
def findMaximumLength(nums: List[int]) -> int:
    optimizer = NonDecreasingArrayOptimizer(nums)
    return optimizer.findMaximumLength()


# For backwards compatibility
max_non_decreasing_length = findMaximumLength
