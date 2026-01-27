# YRTVSD - Linear-Time Regex Engine via Thompson's NFA Construction

**Category:** sft

## Overview
- Task ID: YRTVSD
- Title: Linear-Time Regex Engine via Thompson's NFA Construction
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: yrtvsd-linear-time-regex-engine-via-thompson-s-nfa-construction

## Requirements
- The match function must be implemented as a loop iterating over the input string characters. Any use of recursive function calls to consume characters is an automatic failure.
- The code must include a specific helper function to find all reachable states via None (           ϵϵ          ) transitions. This function must handle "state splitting" instantly without consuming input characters.
- The parser must correctly prioritize operators. ab* must be parsed as "a" followed by "zero or more b's", whereas (ab)* matches "zero or more ab's". Failing to differentiate binding strength is a failure.
- The parser must automatically detect where concatenation is required (e.g., between a and b in the string ab) and insert the appropriate logic, as concatenation is not explicitly denoted by a symbol
- During the lockstep simulation, the engine must use a Set data structure to store active states. If the engine uses a List and processes the same state multiple times for the same character index, it fails the efficiency constraint
- The solution must define an explicit State or Node class containing pointers for transition (character match) and epsilon (list of next states).
- The Epsilon Closure logic must maintain a visited set. If the graph contains a cycle (e.g., (a*)*), the compiler/walker must not enter an infinite recursion loop/stack overflow.
- The match() method must return True only if the entire input string is consumed and the resulting active state set contains the terminal (Accept) state. Partial matching is a failure.
- The code must not import re. Using re for parsing or matching results in a score of 0.
- The NFA for a|b must split into two epsilon paths. The simulation must follow both paths concurrently.
- The intermediate representation (if visible) or the final graph must reflect correct Shunting-yard logic (e.g., a|b* -> a, b, *, |).

## Metadata
- Programming Languages: python 3.10+
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
