# BLHRKN - C++ Recursive Descent JSON Parser

**Category:** sft

## Overview
- Task ID: BLHRKN
- Title: C++ Recursive Descent JSON Parser
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: blhrkn-c-recursive-descent-json-parser

## Requirements
- The parser must handle JSON documents with nesting depths up to 1000 levels without crashing. The current implementation uses unbounded recursive descent that exhausts the call stack around 500 levels on typical systems. A depth tracking mechanism should reject documents exceeding a configurable limit with a descriptive error rather than crashing.
- Unicode escape sequences (\uXXXX) must be correctly converted to UTF-8 bytes. The current implementation only handles basic escapes and produces incorrect output for non-ASCII characters. This includes proper handling of UTF-16 surrogate pairs (\uD800-\uDFFF range) which encode codepoints above U+FFFF as two consecutive \uXXXX sequences.
- String parsing must avoid copying the entire input buffer. The current implementation creates a new std::string copy of the input on each parse call and copies substrings for every token. Using std::string_view for tokenization where possible should reduce memory allocations significantly, targeting less than 2x input size for total memory usage.
- The object container should use std::unordered_map instead of std::map. The current ordered map implementation adds O(log n) overhead per key lookup and insertion. Since JSON object key order is not semantically meaningful, a hash map provides O(1) average-case performance
- Number parsing should not create intermediate string copies. The current implementation extracts the number substring into a std::string, then passes it to std::stod. Using std::from_chars (C++17) or parsing directly from the input view eliminates this allocation.
- Array parsing must maintain O(n) time complexity. The current implementation exhibits quadratic slowdown on large arrays due to repeated container resizing. Pre-allocating or using reserve() with reasonable initial capacity prevents repeated reallocations.
- The lexer must not copy string content for tokens that contain no escape sequences. When a string literal has no backslash characters, the lexer can return a view into the original input rather than allocating a new string. Only strings requiring escape processing need allocation.
- All parse errors must include line and column numbers in the error message. The current implementation reports errors with byte offsets which are difficult for developers to locate in editors. Tracking newlines during lexing enables human-readable error positions.
- The parser must not crash on malformed input. Invalid JSON such as unterminated strings, trailing commas (in strict mode), or unexpected tokens should produce descriptive ParseError exceptions rather than undefined behavior, null pointer dereferences, or infinite loops.
- A 50KB JSON file with typical structure (mixed objects, arrays, strings, numbers) must parse in under 5 milliseconds on standard hardware. The current implementation takes 47ms due to excessive allocations and inefficient string handling. Memory usage during parsing should remain under 2x the input file size.

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
