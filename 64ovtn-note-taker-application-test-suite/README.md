# 64OVTN - Note Taker Application Test Suite

**Category:** sft

## Overview
- Task ID: 64OVTN
- Title: Note Taker Application Test Suite
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 64ovtn-note-taker-application-test-suite

## Requirements
- Test that creating a note with title and content adds it to the notes list
- Test that "All Notes (X)" count increments when notes are created
- Test that created note displays correct title and content
- Test that creating a note with tags updates tag counts in TagFilter after async loadTags completes
- Test that submitting with empty title triggers alert('Please fill in both title and content') (mock window.alert)
- Test that typing a tag and pressing Enter adds a tag chip and clears input
- Test that duplicate tags are not added
- Test that creating notes with different tags shows those tags in TagFilter with correct counts
- Test that clicking ✏️ on a note enters edit mode and pre-fills form fields
- Test that submitting in edit mode updates the note in the list
- Test that after deletion, tag counts update correctly
- Test that deleting last note shows empty state again
- Test that clicking 🗑️ with window.confirm returning false does not delete the note
- Test that clicking 🗑️ with window.confirm returning true deletes the note
- Use Jest as the testing framework

## Metadata
- Programming Languages: JavaScript, TypeScript
- Frameworks: Jest
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
