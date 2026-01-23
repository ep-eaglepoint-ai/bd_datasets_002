from typing import List
import sys

sys.setrecursionlimit(10**6)

def computeRange(nums: List[int], start: int, end: int) -> int:
    """
    Compute the range (max - min) of the subarray from start to end in cyclic array.
    If end < start, it wraps around.
    """
    if end >= start:
        sub = nums[start:end+1]
    else:
        sub = nums[start:] + nums[:end+1]
    return max(sub) - min(sub) if sub else 0

def maxPartitionScore(nums: List[int], k: int) -> int:
    """
    Return the maximum possible score for partitioning the cyclic array into at most k subarrays.
    Score is the sum of ranges (max - min) of each subarray.
    Uses DP with memoization, time O(n² * k), space O(n * k).
    """
    n = len(nums)
    if k >= n:
        return 0  # Each element is a separate partition, range 0
    memo = [[-1 for _ in range(k + 1)] for _ in range(n)]

    def dp(pos: int, parts: int) -> float:
        if parts == 0:
            return 0 if pos == 0 else float('-inf')
        if memo[pos][parts] != -1:
            return memo[pos][parts]
        max_score = float('-inf')
        for end in range(n):
            range_val = computeRange(nums, pos, end)
            next_pos = (end + 1) % n
            if next_pos == pos and parts > 1:
                continue  # Avoid overlapping partitions except for the last partition
            score = range_val + dp(next_pos, parts - 1)
            max_score = max(max_score, score)
        memo[pos][parts] = max_score
        return max_score

    max_score = float('-inf')
    for j in range(1, k + 1):
        score = dp(0, j)
        max_score = max(max_score, score)
    return int(max_score)