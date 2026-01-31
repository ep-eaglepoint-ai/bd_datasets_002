from typing import List
from functools import lru_cache

class NonDecreasingArrayOptimizer:
    def __init__(self, nums: List[int]):
        self.nums = nums
        self.n = len(nums)
        # Prefix sums for O(1) segment sum calculation
        self.prefix = [0] * (self.n + 1)
        for i in range(self.n):
            self.prefix[i + 1] = self.prefix[i] + nums[i]

    def findMaximumLength(self) -> int:
        if self.n == 0:
            return 0

        # Requirement #5: already non-decreasing → no consolidation needed
        if all(self.nums[i] <= self.nums[i + 1] for i in range(self.n - 1)):
            return self.n

        # Requirement #6: strictly decreasing → must consolidate to single segment
        if all(self.nums[i] > self.nums[i + 1] for i in range(self.n - 1)):
            return 1

        max_length_found = 0  # Track global max for early termination

        @lru_cache(maxsize=None)
        def dfs(start: int, prev_sum: int) -> int:
            nonlocal max_length_found
            if start >= self.n:
                return 0

            remaining_length = self.n - start
            # Early termination: even taking all remaining elements, cannot beat max found
            if remaining_length + 0 <= max_length_found:
                return 0

            local_max = 0
            for end in range(start, self.n):
                segment_sum = self.prefix[end + 1] - self.prefix[start]

                if prev_sum is None or segment_sum >= prev_sum:
                    remaining_length_for_rest = dfs(end + 1, segment_sum)
                    current_length = 1 + remaining_length_for_rest
                    local_max = max(local_max, current_length)

                    # Update global max
                    if current_length > max_length_found:
                        max_length_found = current_length

                    # Early pruning: if max possible from here <= global max, stop
                    if self.n - start <= max_length_found:
                        break

            return local_max

        return dfs(0, None)


# Required top-level API
def findMaximumLength(nums: List[int]) -> int:
    return NonDecreasingArrayOptimizer(nums).findMaximumLength()


# Backwards compatibility
max_non_decreasing_length = findMaximumLength
