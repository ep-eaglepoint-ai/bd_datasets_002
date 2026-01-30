# GK008N - AVL Tree - Header Only C++ Implementation for Database Indexing

**Category:** sft

## Overview
- Task ID: GK008N
- Title: AVL Tree - Header Only C++ Implementation for Database Indexing
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: gk008n-avl-tree-header-only-c-implementation-for-database-indexing

## Requirements
- The implementation must be entirely contained in a single header file with no external dependencies beyond the C++ standard library. This enables easy integration into existing database projects without build system modifications or additional linking steps.
- Node deletion with two children must correctly handle the case where node data contains a const-qualified key (as in std::pair<const Key, Value>). The standard approach of copying successor data fails because const members cannot be assigned. Solutions include node pointer manipulation, placement new reconstruction, or alternative data layouts
- Smart pointer rotation operations must maintain valid ownership throughout the transformation. When using std::unique_ptr, moving ownership from a reference parameter invalidates that reference - subsequent access through the original reference is undefined behavior.
- Iterator increment operations must not access uninitialized or null pointers. The iterator must store a valid reference to the tree or use an alternative design that doesn't require tree access for successor traversal (such as storing the full path or using parent pointers directly).
- Parent pointers must remain consistent after all tree modifications including insertions, deletions, and rotations. Each node's parent pointer must point to its actual parent in the tree structure, and the root's parent must be null.
- The size() operation should execute in O(1) time by maintaining a count during insertions and deletions rather than traversing the entire tree. This is critical for database statistics and query optimization.
- Range queries must return all key-value pairs where low <= key <= high in sorted order. The implementation should prune subtrees that cannot contain valid results rather than visiting every node.
- The balance factor of every node must remain in the range [-1, 0, 1] after every modification. The is_valid() or validate() method must verify this property along with BST ordering and height consistency.
- Duplicate key insertion must update the existing value rather than creating a new node or rejecting the operation. This matches the semantics of std::map::insert_or_assign.
- Move semantics must transfer ownership without copying node data. After a move operation, the source tree must be empty and valid (not in an undefined state). Copy operations must perform a deep copy with correct parent pointer initialization.
- The iterator's value_type typedef must follow STL conventions where it represents the actual stored type, not a reference type. Using std::pair<const Key&, Value&> as value_type breaks compatibility with algorithms that copy iterator values.
- Successor and predecessor operations must handle edge cases: successor of the maximum element returns end/null, predecessor of the minimum returns end/null, and queries for non-existent keys return appropriate sentinel values.
- All single-element operations (insert, delete, search, min, max, successor, predecessor) must execute in O(log n) time where n is the number of elements. This must be verified through the tree maintaining height balance.
- Memory management must prevent leaks under all operation sequences. Destructor must deallocate all nodes, and exception safety should prevent leaks if allocation fails mid-operation.
- Forward declaration syntax and template parameter declarations must be valid C++17. Constructs like variable declarations inside ternary operators ((Node* n = find(key)) ? ...) are syntax errors and must be rewritten as proper if-statements or separate declarations.

## Metadata
- Programming Languages: C++
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
