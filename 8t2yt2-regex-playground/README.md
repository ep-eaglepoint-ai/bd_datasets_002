# 8T2YT2 - regex playground

**Category:** sft

## Overview
- Task ID: 8T2YT2
- Title: regex playground
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8t2yt2-regex-playground

## Requirements
- The application must allow users to input a regular expression pattern and test text, re-evaluating matches in near real time while preventing UI freezes caused by expensive or malformed patterns.
- The system must support regex flags such as global, case-insensitive, multiline, dot-all, Unicode, and sticky mode, allowing users to toggle flags dynamically and instantly recompute results.
- The application must highlight matched text visually using TailwindCSS-based styling, ensuring correct rendering for overlapping matches, zero-length matches, repeated matches, and multiline content.
- The system must display capture group information, including group index, optional group name, matched substring, and nested group relationships, while handling missing, optional, or repeated groups correctly.
- The application must provide detailed match metadata, including total match count, match start and end indices, matched string previews, and execution time in milliseconds
- The system must gracefully handle invalid regex patterns, returning clear, human-readable error messages instead of throwing uncaught exceptions or breaking the UI.
- The application must implement execution safety mechanisms, such as Web Workers, timeouts, throttling, or debouncing, to prevent catastrophic backtracking from blocking the main thread.
- The system must support large text inputs, maintaining responsive typing, scrolling, and rendering behavior when processing multi-megabyte text content.
- The application must correctly handle Unicode and special character edge cases, including emojis, RTL text, accented characters, newline differences, escaped sequences, and surrogate pairs.
- The UI must provide a clean, developer-focused editing experience, including monospaced inputs, clear layout separation between pattern input, flags, test text, and results, and TailwindCSS-based responsive design across screen sizes.
- The system must support saving and restoring regex test cases locally, using browser storage such as localStorage or IndexedDB, without relying on external services.
- The application must maintain deterministic behavior, ensuring the same pattern, flags, and input always produce identical match results across sessions and reloads.
- The codebase must emphasize modularity and maintainability, separating regex execution logic, match parsing, rendering logic, and UI state management into clear, testable components within the Next.js project structure.

## Metadata
- Programming Languages: TypeScript
- Frameworks: Nextjs, Tailwindcss
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
