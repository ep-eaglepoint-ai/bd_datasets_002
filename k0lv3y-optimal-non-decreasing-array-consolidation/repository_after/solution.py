
from typing import List

def max_non_decreasing_length(nums: List[int]) -> int:
    """
    Returns the maximum possible length of a non-decreasing array 
    achievable through optimal consolidations.
    
    Uses iterative DP with O(n) space and O(n^2) time complexity.
    dp[i] stores the maximum length of a non-decreasing sequence ending at index i.
    last[i] stores the minimum ending sum for such a sequence of maximal length.
    """
    n = len(nums)
    if n == 0:
        return 0
    
    # Precompute prefix sums
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i+1] = prefix[i] + nums[i]
        
    # dp[i] = max length of non-decreasing chain ending at index i
    dp = [1] * n
    # last[i] = minimum value of the last segment (nums[j+1...i]) for chain of length dp[i]
    last = [0] * n
    
    for i in range(n):
        # Default: take whole prefix 0...i
        dp[i] = 1
        last[i] = prefix[i+1]
        
        # Try to extend a valid chain ending at j < i
        for j in range(i):
            if prefix[i+1] >= prefix[j+1] + last[j]:
                current_sum = prefix[i+1] - prefix[j+1]
                new_len = dp[j] + 1
                
                # We found a valid extension.
                # If it gives a longer chain, assume it is better.
                # If equal length, prefer smaller end sum to facilitate future extensions.
                if new_len > dp[i]:
                    dp[i] = new_len
                    last[i] = current_sum
                elif new_len == dp[i]:
                    last[i] = min(last[i], current_sum)
                    
    return max(dp) if n > 0 else 0

# For backwards compatibility/testing alias
max_non_decreasing_length_optimized = max_non_decreasing_length
