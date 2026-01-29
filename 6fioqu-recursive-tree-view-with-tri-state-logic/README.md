# 6FIOQU - Recursive Tree View with Tri-State Logic

**Category:** sft

## Overview
- Task ID: 6FIOQU
- Title: Recursive Tree View with Tri-State Logic
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 6fioqu-recursive-tree-view-with-tri-state-logic

## Requirements
- File must be named RecursiveTree.vue.
- Must not mutate props.node directly.
- Component must import itself (or use name: 'RecursiveTree') to handle recursion.
- Checking a parent must strictly result in all descendants becoming checked: true.
- If all children are checked, parent is Checked. If all are unchecked, parent is Unchecked.
- If children are mixed (some checked, some not), the parent must be calculated as Indeterminate (often partial: true or similar state).
- Must emit an event (e.g., update:node or change) with the new state; strictly no in-place mutation of the input prop.
- The template must conditionally render the checkbox state (Checked vs Indeterminate/Dash).
- Must handle leaf nodes (files) vs branch nodes (folders) correctly; empty folders should be selectable.

## Metadata
- Programming Languages: Vue3
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
