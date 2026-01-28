# XGPS0J - form generator

**Category:** sft

## Overview
- Task ID: XGPS0J
- Title: form generator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: xgps0j-form-generator

## Requirements
- The system must allow users to create and manage surveys, storing structured metadata such as survey title, description, creation date, version history, and publication state while validating all input using Zod to prevent malformed survey definitions.
- The application must support multiple question types, including short text, long text, single choice, multiple choice, rating scales, numeric input, and boolean questions, ensuring each question type enforces correct input constraints and response validation.
- The system must allow users to reorder questions and group them into sections, maintaining stable ordering and preserving logical structure even when questions are edited or removed.
- The application must provide a live survey preview mode, allowing creators to test surveys exactly as respondents will experience them while ensuring preview responses do not contaminate real survey data.
- The system must allow users to collect responses locally, storing answers in a structured and version-aware format that remains compatible even if the survey schema evolves over time
- The application must implement robust response validation, preventing invalid answer types, out-of-range numeric values, missing required answers, malformed free-text input, or corrupted submission payloads.
- The system must support partial and abandoned responses, tracking completion progress and ensuring incomplete submissions do not break analytics or corrupt aggregated metrics.
- The application must generate real-time response analytics, including per-question answer distribution, response frequency, average rating values, completion rate, time-to-completion metrics, and participation trends.
- The system must support interactive data visualization dashboards, rendering charts for answer breakdowns, choice popularity, rating distributions, numeric summaries, and temporal response patterns using client-side visualization libraries.
- The application must allow users to filter and segment responses, supporting time-based filtering, answer-based segmentation, keyword search in free-text responses, and compound filtering conditions.
- The system must compute aggregated survey metrics deterministically, ensuring consistent counts, averages, medians, and percentage breakdowns even when responses are added, removed, or reprocessed.
- The application must support exporting survey data, allowing users to export raw responses, aggregated summaries, and analytics reports in structured formats such as JSON or CSV.
- The system must support survey versioning, ensuring that edits to surveys do not invalidate or corrupt historical responses and that analytics remain interpretable across schema changes.
- The application must provide response review tools, allowing users to inspect individual submissions, detect anomalies, identify spam-like responses, and flag or exclude outliers from analytics calculations.
- The system must handle edge cases such as empty surveys, surveys with no responses, extremely large response volumes, malformed stored data, deleted questions, reordered sections, and schema mismatches without crashing or producing misleading analytics.
- The application must implement performance optimizations, including memoized aggregations, incremental recomputation, list virtualization for large response tables, batched state updates, and optional Web Worker processing for heavy analytics.
- The system must ensure deterministic state updates and reproducibility, preventing silent drift in response counts, guaranteeing consistent analytics across reloads, and maintaining long-term data reliability.
- The application must provide clear and explainable analytics logic, allowing users to understand how metrics such as averages, completion rates, response trends, and participation breakdowns are computed rather than relying on opaque heuristics.

## Metadata
- Programming Languages: TypeScript
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
