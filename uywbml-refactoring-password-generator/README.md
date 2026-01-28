# UYWBML - Refactoring Password Generator

**Category:** sft

## Overview
- Task ID: UYWBML
- Title: Refactoring Password Generator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: uywbml-refactoring-password-generator

## Requirements
- Generate passwords deterministically based on selected character sets and length
- Ensure passwords are displayed immediately and in correct order
- Support letters, digits, and symbols with proper validation
- Disable password generation when no character type is selected
- Allow users to copy the generated password to the clipboard reliably
- Update UI elements (password display, buttons, labels) accurately and consistently
- Handle rapid user interactions (e.g., repeated clicks) without incorrect behavior
- Memory usage must remain stable during extended operation
- Password generation must complete without perceptible delay
- No performance degradation after generating thousands of passwords
- All UI updates must occur safely on the Tkinter main thread
- Eliminate race conditions and timing-dependent bugs
- Python 3.x
- Tkinter must be used for the GUI
- Application must behave consistently regardless of interaction speed

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
