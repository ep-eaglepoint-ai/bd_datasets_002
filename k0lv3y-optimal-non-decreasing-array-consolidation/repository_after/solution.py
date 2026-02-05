from typing import List


class NonDecreasingArrayOptimizer:
    def __init__(self, nums: List[int]):
        self.nums = nums
        self.n = len(nums)

    def findMaximumLength(self) -> int:
        if self.n == 0:
            return 0

        if all(self.nums[i] <= self.nums[i + 1] for i in range(self.n - 1)):
            return self.n

        if all(self.nums[i] > self.nums[i + 1] for i in range(self.n - 1)):
            return 1

        prefix = [0] * (self.n + 1)
        for i in range(self.n):
            prefix[i + 1] = prefix[i] + self.nums[i]

        dp = [1] * self.n
        last_sum = [0] * self.n

        for i in range(self.n):
            last_sum[i] = prefix[i + 1]
            for j in range(i):
                segment_sum = prefix[i + 1] - prefix[j + 1]
                if segment_sum >= last_sum[j]:
                    candidate = dp[j] + 1
                    if candidate > dp[i]:
                        dp[i] = candidate
                        last_sum[i] = segment_sum
                    elif candidate == dp[i] and segment_sum < last_sum[i]:
                        last_sum[i] = segment_sum
                    if dp[i] == i + 1:
                        break

        return dp[-1]


# Required top-level API
def findMaximumLength(nums: List[int]) -> int:
    return NonDecreasingArrayOptimizer(nums).findMaximumLength()


# Backwards compatibility
max_non_decreasing_length = findMaximumLength
