from typing import List
import bisect

class Solution:
    def findMaximumNonDecreasingLength(self, nums: List[int]) -> int:
        """
        Calculates the maximum length of a non-decreasing array obtained by merging subarrays.
        
        Args:
            nums: A list of integers.
            
        Returns:
            The maximum length of the resulting non-decreasing array.
        """
        n = len(nums)
        if n == 0:
            return 0
            
        # Candidates list stores tuples: (Key, Length, P_prev)
        # Key = 2 * S_current - P_prev. This represents the minimum S_next required to extend.
        # Condition for extensions: Key <= S_next (or Key <= current_S when we look back)
        # Invariant: Sorted by Key. Also, (Length, P_prev) is strictly increasing (Pareto frontier).
        # We perform coordinate compression/reduction by removing dominated entries.
        # Initial state: virtual start. Key=-inf allows starting anywhere.
        candidates = [(-float('inf'), 0, 0)]
        candidates_keys = [-float('inf')]
        
        current_S = 0
        overall_max_len = 0
        
        for x in nums:
            current_S += x
            
            # 1. Find the best previous state we can extend
            # Find largest Key <= current_S
            idx = bisect.bisect_right(candidates_keys, current_S) - 1
            
            # Since we have -inf, idx will always be >= 0
            best_key, best_L, best_P = candidates[idx]
            
            # Generate new candidate
            new_L = best_L + 1
            new_P = current_S
            # LastVal = current_S - best_P
            # New Key: S_next >= S_curr + LastVal => S_next >= 2*S_curr - best_P
            new_Key = 2 * current_S - best_P
            
            overall_max_len = max(overall_max_len, new_L)
            
            # 2. Insert (new_Key, new_L, new_P) maintaining invariants
            # We want to maintain that as Key increases, (Length, P_prev) strictly increases.
            
            # Check dominance by existing LEFT neighbor
            # Find closest Key <= new_Key
            # bisect_right returns insertion point after all equal keys.
            # We want to check if any entry with key <= new_key has val >= new_val.
            pos = bisect.bisect_right(candidates_keys, new_Key)
            
            # Check left neighbor
            if pos > 0:
                left_key, left_L, left_P = candidates[pos-1]
                # If left entry (smaller/equal key) has better/equal length/P, new is useless.
                # Use tuple comparison for (Length, P)
                if (left_L, left_P) >= (new_L, new_P):
                    continue
            
            # 3. Remove dominated RIGHT neighbors
            # Any entry to the right has Key >= new_Key.
            # If such an entry has Val <= new_Val, it is dominated (requires higher key for worse val).
            # Remove such entries.
            while pos < len(candidates):
                right_key, right_L, right_P = candidates[pos]
                if (right_L, right_P) <= (new_L, new_P):
                    # Right is dominated
                    candidates.pop(pos)
                    candidates_keys.pop(pos)
                else:
                    # Since invariants enforce increasing Val, if right_Val > new_Val,
                    # then subsequent rights will also be > new_Val (transitive?). 
                    # Wait. Invariant: K1 < K2 => V1 < V2.
                    # We found right_V > new_V. Since right_K >= new_K, this is consistent.
                    # We stop removing.
                    break
            
            # 4. Insert new candidate
            candidates.insert(pos, (new_Key, new_L, new_P))
            candidates_keys.insert(pos, new_Key)
            
        return overall_max_len
