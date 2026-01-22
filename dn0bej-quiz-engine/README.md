# DN0BEJ - quiz-engine

**Category:** sft

## Overview
- Task ID: DN0BEJ
- Title: quiz-engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: dn0bej-quiz-engine

## Requirements
- The program must load quiz questions from a JSON file with at least the following fields per question: prompt, choices (list of strings), answer_index (integer).
- Users must answer questions interactively in the terminal by entering a number corresponding to their chosen option.
- The program must validate user input, reprompting when input is invalid (non-integer, out-of-range, empty).
- After completing the quiz, the program must display a score summary, including total correct, percentage, and optionally missed questions with correct answers.
- The system must handle JSON errors gracefully, including malformed files, missing keys, empty question lists, or duplicate questions.
- The program must be implemented in a single Python file with modular functions for loading, displaying, validating, scoring, and reporting.
- The program must allow multiple quizzes by passing a different JSON file at runtime.
- The program should not depend on any external libraries beyond the Python standard library.
- The code should be written clearly, with functions separated logically for easy testing of each component.

## Metadata
- Programming Languages: Python
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
