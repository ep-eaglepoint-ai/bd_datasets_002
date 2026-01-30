# G3ZG38 - poll creation

**Category:** sft

## Overview
- Task ID: G3ZG38
- Title: poll creation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: g3zg38-poll-creation

## Requirements
- Build a form where users can enter a poll question, add 2-10 answer options with the ability to add/remove options dynamically, set an optional expiration date, and choose whether to show results before voting or only after
- Generate a short, unique URL for each poll using nanoid, create a dedicated voting page accessible without authentication, and provide copy-to-clipboard functionality for easy sharing
- Display the poll question and options on the voting page, allow users to select one option and submit their vote, prevent duplicate votes from the same browser using localStorage tracking, and show a confirmation message after voting
- Show vote counts and percentages for each option using horizontal bar charts, update results in real-time using Socket.IO when new votes come in, and highlight the leading option visually
- Allow poll creators to view all their created polls on a dashboard (using localStorage to track ownership), see detailed results with total vote counts, and optionally close polls early to stop accepting votes
- Display results with animated progress bars showing percentage of total votes, show the total number of participants, and provide a clean summary view suitable for sharing or presenting

## Metadata
- Programming Languages: Typescript
- Frameworks: React
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
