# M4M6AB - high-throughput-symbol-lookup-optimizer

**Category:** sft

## Overview
- Task ID: M4M6AB
- Title: high-throughput-symbol-lookup-optimizer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: m4m6ab-high-throughput-symbol-lookup-optimizer

## Requirements
- Algorithmic Optimization: Refactor getTickerById to ensure  O ( 1 ) O(1)  lookup performance. The implementation must replace the current for-loop iteration with a hash-based or direct-mapping structure.
- Thread-Safe Queries: The registry must support concurrent read access from multiple threads. Use a thread-safe collection (e.g., ConcurrentHashMap) or appropriate synchronization to prevent data corruption during query execution.
- Memory Efficiency: While optimizing for speed, the solution must not exceed a 128MB heap footprint for a registry containing 100,000 symbols. Avoid storing redundant copies of the symbol strings.
- Interface Integrity: The public methods loadSymbols and getTickerById must maintain their original signatures and behavior to ensure compatibility with the rest of the trading platform.
- Initialization Performance: The loadSymbols method should be optimized to populate the new lookup structure efficiently, ensuring the system can be updated with new symbols in under 500ms.
- Testing Requirement (Performance): Provide a JMH (Java Microbenchmark Harness) or a standard main-method benchmark that demonstrates the performance difference between the  O ( N ) O(N)  and  O ( 1 ) O(1)  implementations with a 100,000-item dataset.
- Testing Requirement (Correctness): Verify that the system correctly returns null for non-existent IDs and handles cases where multiple internal IDs might map to the same market ticker (though internal IDs themselves are unique).

## Metadata
- Programming Languages: Java
- Frameworks: (none)
- Libraries: java.util.concurrent
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
