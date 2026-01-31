from typing import List


def maxActiveAfterTrades(s: str, queries: List[List[int]]) -> List[int]:
    """
    Find maximum active segments achievable after optimal trades for each query.
    
    For each query [li, ri], performs at most one trade:
    - Step 1: Deactivate a '1' block surrounded by '0's
    - Step 2: Activate a '0' block surrounded by '1's (after Step 1)
    
    The substring is virtually augmented as '1' + s[li:ri+1] + '1' for validation.
    Virtual '1's don't count toward final count.
    
    Args:
        s: Binary string where '1' = active, '0' = inactive
        queries: List of [li, ri] range queries
        
    Returns:
        List of maximum active counts, one per query
    """
    answers = []

    for l, r in queries:
        sub = s[l:r+1]
        n = len(sub)

        # Count original '1's as baseline
        # This represents the count if no beneficial trade is found
        base_ones = sub.count('1')

        # Edge case: Single character or empty substring
        # Cannot have "surrounded" condition with < 2 characters
        if n <= 1:
            answers.append(base_ones)
            continue

        # Build block representation of augmented string
        # Virtual augmentation: '1' + substring + '1'
        # Blocks stored as (character, length) tuples
        # Virtual '1's have length 0 to indicate they don't count toward final answer
        blocks = [('1', 0)]  # virtual left '1'

        # Single-pass block detection maintains O(n) complexity
        # Identify all contiguous blocks of '0's and '1's
        i = 0
        while i < n:
            ch = sub[i]
            j = i
            # Extend block while characters match
            while j < n and sub[j] == ch:
                j += 1
            blocks.append((ch, j - i))
            i = j

        blocks.append(('1', 0))  # virtual right '1'

        # Find optimal trade by evaluating all valid trade pairs
        # Track maximum gain to avoid storing all trade combinations (O(n) space)
        max_gain = 0

        # Iterate through all blocks (excluding virtual boundaries)
        for i in range(1, len(blocks) - 1):
            ch, length = blocks[i]

            # Step 1 Validation: Check if '1' block is valid for deactivation
            # A '1' block is valid if surrounded by '0's on both sides
            if ch == '1' and length > 0:
                left_ch, left_len = blocks[i - 1]
                right_ch, right_len = blocks[i + 1]

                # Must have '0' blocks on both sides (not at boundaries)
                if left_ch == '0' and right_ch == '0':
                    # Step 2 Validation: After deactivation, check if merged '0' block is valid
                    # When we deactivate the '1' block, adjacent '0' blocks merge
                    # The merged block spans from blocks[i-1] to blocks[i+1]
                    # We need to verify this merged block is surrounded by '1's
                    
                    # Check left neighbor of merged block
                    # If blocks[i-1] is the first real block (index 1), 
                    # its left neighbor is the virtual '1' at start
                    if i - 1 == 1:
                        left_neighbor_ch = '1'  # virtual '1' at start
                    else:
                        # Otherwise, check the block before the left '0' block
                        left_neighbor_ch = blocks[i - 2][0]
                    
                    # Check right neighbor of merged block
                    # If blocks[i+1] is the last real block (index len(blocks)-2),
                    # its right neighbor is the virtual '1' at end
                    if i + 1 == len(blocks) - 2:
                        right_neighbor_ch = '1'  # virtual '1' at end
                    else:
                        # Otherwise, check the block after the right '0' block
                        right_neighbor_ch = blocks[i + 2][0]
                    
                    # Merged '0' block is valid if surrounded by '1's on both sides
                    # This ensures Step 2 can be performed after Step 1
                    if left_neighbor_ch == '1' and right_neighbor_ch == '1':
                        # Calculate net gain: activated_count - deactivated_count
                        # When we activate the merged '0' block, we activate:
                        #   left_len + deactivated_length + right_len positions
                        # But we deactivate: deactivated_length positions
                        # Net gain = (left_len + right_len + deactivated_length) - deactivated_length
                        #         = left_len + right_len
                        gain = left_len + right_len
                        if gain > max_gain:
                            max_gain = gain

        # Return original count plus maximum gain
        # If max_gain is 0, no beneficial trade exists, return original count
        answers.append(base_ones + max_gain)

    return answers
