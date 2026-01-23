# RPQG4F - TypeScript Language Detection Utility Performance Optimization

**Category:** sft

## Overview
- Task ID: RPQG4F
- Title: TypeScript Language Detection Utility Performance Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: rpqg4f-typescript-language-detection-utility-performance-optimization

## Requirements
- Batch processing of 10,000 messages must complete in under 1 second. When checkLanguage is called 10,000 times with varied message inputs, total execution time must be under 1000ms. Current implementation takes 1300ms+ due to redundant regex compilation and unnecessary function calls.
- Single message p99 latency must be under 5ms. When measuring latency across 1,000 individual checkLanguage calls, the 99th percentile response time must be under 5ms to ensure consistent user experience during peak load.
- Large input processing must complete in under 100ms. When checkLanguage receives a 100,000 character input string, processing must complete in under 100ms without causing memory spikes or blocking the event loop.
- Memory usage must remain bounded during batch processing. When processing 10,000 messages sequentially, heap memory growth must stay under 100MB. No unbounded memory allocation patterns are permitted.
- Regex patterns must be compiled once at module load time. The NON_LATIN_REGEX pattern and all COMMON_NON_ENGLISH_WORDS patterns must not be recompiled on each function call. Pattern objects must be created once and reused.
- The franc language detection library must be called exactly once per checkLanguage invocation. The current implementation calls franc 2-3 times for the same input text. This redundancy must be eliminated while preserving the same detection result.
- String operations must use O(n) algorithms. The current custom toLowerCaseSlow function uses string concatenation in a loop, resulting in O(n²) complexity. This must be replaced with the native toLowerCase method or equivalent O(n) implementation.
- Word counting must use a single-pass algorithm. The current implementation chains split().filter().map().filter() creating multiple intermediate arrays. This must be reduced to a single operation that counts non-whitespace sequences.
- Non-English word checking must exit early on first match. The current implementation continues checking all 29 patterns even after finding a match. The loop must return immediately when a match is found.
- Results must be identical to the current implementation. Every input that currently returns a specific LanguageCheckResult must return the exact same result after optimization. All existing behavior must be preserved.
- Function signatures must not change. The exported functions checkLanguage, isEnglish, and detectLanguage must maintain their current parameter types and return types with no breaking changes.
- Only franc-min is permitted as external dependency. No additional npm packages may be added for caching, memoization, string processing, or performance optimization.

## Metadata
- Programming Languages: Typescript
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
