# AGJ03V - C Memory Pool Allocator - Free List Corruption and Memory Leak Fix

**Category:** sft

## Overview
- Task ID: AGJ03V
- Title: C Memory Pool Allocator - Free List Corruption and Memory Leak Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: agj03v-c-memory-pool-allocator-free-list-corruption-and-memory-leak-fix

## Requirements
- Allocated blocks must be removed from the free list. Currently when a block is allocated, only is_free is set to 0 but the block remains in the linked list. This causes the same memory address to be returned to multiple callers and corrupts the free list structure over time.
- Minimum allocation size must be enforced. Requests smaller than 16 bytes should be rounded up to MIN_ALLOC_SIZE. Without this, block splitting can create fragments too small to hold a header, causing corruption when they're later freed and added back to the list.
- Block headers must be aligned to 8 bytes. The current header struct is 12 bytes on 32-bit ARM, causing subsequent data pointers to be misaligned. Add padding to make the header exactly 16 bytes, ensuring all returned pointers are 8-byte aligned.
- Bounds checking must occur before accessing adjacent blocks. The coalescing logic accesses the next block without verifying it's within pool bounds. When the freed block is at the pool's end, this reads garbage memory and corrupts the free list.
- Double-free must be detected and rejected. Freeing an already-free block corrupts the list by adding duplicate entries. Check the is_free flag before processing and silently ignore or assert on double-free attempts.
- Pointer validation must reject out-of-bounds addresses. The pool_free() function blindly trusts the input pointer. Verify the pointer falls within the pool's memory region and points to a valid block boundary before proceeding.
- Coalescing must merge with both previous and next free blocks. Currently only the next adjacent block is checked for merging. Maintain the free list in address-sorted order and check both neighbors to fully eliminate fragmentation.
- Free space accounting must include reclaimed headers. When two blocks are coalesced, one header is reclaimed as usable space. The free_space counter must be incremented by both the data size and the absorbed header size.
- Block splitting must verify the remainder is usable. Only split a block if the leftover space can hold a header plus MIN_ALLOC_SIZE of data. Otherwise, allocate the entire block to avoid creating unusable fragments.
- Free list helpers must only count actual free blocks. The freelist_count() and freelist_total_free() functions iterate the list but don't verify is_free flag, causing incorrect counts when allocated blocks remain in the list.

## Metadata
- Programming Languages: C
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
