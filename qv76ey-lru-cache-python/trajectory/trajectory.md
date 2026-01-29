# LRU Cache Implementation

## Approach
Researched [LRU Cache problem on LeetCode](https://leetcode.com/problems/lru-cache/) - understood need for O(1) operations requires combining hash map with doubly linked list structure.

Studied [doubly linked list operations](https://www.youtube.com/watch?v=8VsllnROHng) - learned pointer manipulation for constant time insertion/deletion at any position.

Applied [dummy node pattern](https://en.wikipedia.org/wiki/Sentinel_node) - eliminated edge cases when list is empty or has single element.

## Implementation
Created Node class with key, value, prev, next attributes. Built LRUCache with dictionary mapping keys to nodes and doubly linked list maintaining access order. Used dummy head/tail to simplify boundary conditions.

Key insight: storing key in node enables O(1) eviction since we can delete from dictionary without additional lookup.

## Result
Achieved O(1) get and put operations. Dictionary provides instant lookup, linked list allows constant-time reordering. Cache correctly evicts LRU item when capacity exceeded.

