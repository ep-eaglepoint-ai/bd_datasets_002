# SFKZPA - resume builder

**Category:** sft

## Overview
- Task ID: SFKZPA
- Title: resume builder
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: sfkzpa-resume-builder

## Requirements
- Users must be able to enter and edit structured data including name, contact details, summary, experience, education, skills, projects, and optional sections.
- Users should be able to add, remove, reorder, enable, or disable resume sections without breaking layout formatting.
- Any changes made in the input form must instantly update the resume preview without page refresh.
- The app must support at least one clean, modern, ATS-friendly resume template, with room to expand into multiple themes later.
- Required fields should be validated, empty sections handled gracefully, and users warned about missing critical information.
- Users must be able to export resumes as high-quality PDFs with consistent margins, spacing, fonts, and layout.
- Resume data should persist via local storage or a lightweight database, without requiring complex authentication.
- The UI should load fast, work smoothly across screen sizes, and prioritize usability, readability, and low cognitive load.

## Metadata
- Programming Languages: TypeScript
- Frameworks: React, TailwindCSS
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
