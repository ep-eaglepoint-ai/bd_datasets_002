# OHCBRE - React Random Dog Picture Generator Test Suite

**Category:** sft

## Overview
- Task ID: OHCBRE
- Title: React Random Dog Picture Generator Test Suite
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ohcbre-react-random-dog-picture-generator-test-suite

## Requirements
- The test suite must verify that clicking “Get Random Dog” triggers an API request and displays a loading state.
- The test suite must confirm that a successful API response displays the fetched dog image and clears the loading state.
- The test suite must validate that the image src is set correctly based on the API response URL.
- The test suite must verify that API failures display an appropriate error message and show a retry button.
- The test suite must ensure that the retry button initiates a new API request after a failure.
- The test suite must validate that the loading indicator appears during fetch and disappears on completion.
- The test suite must ensure that multiple rapid clicks do not trigger multiple simultaneous API requests.
- The test suite must verify that selecting a breed fetches a random image only from the selected breed endpoint.
- The test suite must confirm that selecting “All Breeds” fetches images from the general random endpoint.
- The test suite must validate that the breed dropdown is populated from the breeds API on component mount.
- The test suite must verify that clicking the heart icon adds the current image to the favorites list.
- The test suite must ensure that duplicate images cannot be added to favorites.
- The test suite must confirm that favorites are persisted to and loaded from localStorage.
- The test suite must validate that viewed images are added to the history list and capped at 10 items.
- The test suite must ensure that timers, pending requests, and side effects are properly cleaned up on component unmount.

## Metadata
- Programming Languages: JavaScript
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
