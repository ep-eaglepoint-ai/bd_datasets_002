# Trajectory (Thinking Process for Binary String Trade Optimization)

1. I analyzed the problem requirements. The task is to process multiple independent range queries on a binary string, where each query allows at most one trade: deactivate a '1' block surrounded by '0's, then activate a '0' block surrounded by '1's. The virtual augmentation rule ('1' + substring + '1') is critical for boundary validation.

2. I identified the complexity constraints upfront. The solution must achieve O(q × n) time and O(n) space per query. This ruled out brute force approaches that would try all possible trade combinations, which would be O(n²) per query.

3. I designed a block-based single-pass algorithm. Instead of nested loops, I would identify all contiguous blocks of '0's and '1's in one pass, then evaluate trade opportunities by checking block neighbors. This maintains O(n) complexity per query.

4. I implemented block detection with virtual augmentation. The algorithm builds a block representation where virtual '1's at boundaries are represented with length 0. This allows boundary condition checks without actually modifying the string, and virtual '1's don't count toward the final answer.

5. I realized that a '1' block at substring boundaries cannot be valid for deactivation. If a '1' block is at the start, it has a virtual '1' on its left (from augmentation), so it cannot be surrounded by '0's. The same logic applies to '1' blocks at the end. This naturally handles edge cases without special conditionals.

6. I implemented Step 1 validation: a '1' block is valid for deactivation only if it has '0' blocks on both sides. The check `blocks[i-1][0] == '0' and blocks[i+1][0] == '0'` automatically fails for boundary blocks because they have virtual '1's as neighbors.

7. I discovered that after deactivating a '1' block, the adjacent '0' blocks merge into one large '0' block. This merged block spans from `blocks[i-1]` to `blocks[i+1]`, and we need to check if this merged block is surrounded by '1's for Step 2 validation.

8. I implemented Step 2 validation by checking the neighbors of the merged '0' block. If the merged block is at a boundary, it uses virtual '1's as neighbors. Otherwise, I check `blocks[i-2][0] == '1'` and `blocks[i+2][0] == '1'` to ensure the merged block is surrounded by '1's.

9. I calculated the net gain correctly. When we deactivate a '1' block of length L and activate the merged '0' block, we're actually activating `left_len + L + right_len` positions (including the deactivated positions). Net gain = `(left_len + L + right_len) - L = left_len + right_len`. This simplifies the calculation.

10. I initially misunderstood the gain calculation. I thought we only activated the '0' blocks, but after deactivation, those blocks merge with the deactivated positions. The merged block is what gets activated, so the gain includes all three segments.

11. I added explicit validation for Step 2 even though it's mathematically guaranteed when Step 1 passes. This makes the code self-documenting and easier to verify. The explicit checks help future readers understand the logic.

12. I handled edge cases early. Empty substrings return 0 immediately. Single-character queries cannot have "surrounded" conditions, so they return the original count. If no valid '1' blocks exist, the algorithm returns the original count without further processing.

13. I ensured determinism throughout. The solution uses only integer operations, processes blocks in left-to-right order, and has no randomness or external dependencies. This guarantees consistent results across all executions.

14. I optimized the gain tracking. Instead of storing all valid trade pairs, I track only the maximum gain during iteration. This keeps space complexity at O(n) and avoids unnecessary memory allocation.

15. I verified the algorithm handles all constraint requirements. The block detection uses iteration and state tracking (no regex), correctly computes net gain, and efficiently iterates through blocks without nested brute-force searches.

16. The solution is built around verifiable correctness. It processes each query independently with no state pollution, correctly interprets virtual augmentation, and maintains O(q × n) time complexity with O(n) space per query.
