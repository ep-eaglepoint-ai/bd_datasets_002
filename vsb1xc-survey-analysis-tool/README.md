# VSB1XC - survey analysis tool

**Category:** sft

## Overview
- Task ID: VSB1XC
- Title: survey analysis tool
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: vsb1xc-survey-analysis-tool

## Requirements
- The system must allow users to design surveys composed of multiple question types such as multiple-choice, rating scales, numeric input, free-text responses, ranking questions, and matrix-style questions, while enforcing structural validity through Zod to prevent malformed survey definitions, missing answer constraints, inconsistent scoring scales, or logically contradictory question flows.
- Users must be able to import survey responses via CSV or JSON, with the system validating row structure, mapping responses to corresponding questions, detecting missing or extra fields, handling encoding issues, malformed rows, duplicate submissions, and incomplete responses without crashing or corrupting the dataset.
- The application must support cleaning operations such as removing duplicates, trimming whitespace, normalizing text, standardizing categorical labels, correcting inconsistent encodings, handling missing values, flagging outliers, and transforming raw responses into analysis-ready structured datasets in a non-destructive and reproducible manner.
- The system must infer response data types such as numeric, categorical, ordinal, boolean, and free text, while tolerating mixed-type answers, malformed numeric entries, invalid dates, sparse responses, and contradictory formatting. Users must be able to override inferred types with safe re-coercion logic.
- The system must compute statistical summaries such as counts, proportions, means, medians, standard deviations, variance, confidence intervals, and frequency distributions while handling small sample sizes, skewed distributions, missing values, NaN values, and floating-point precision limits without producing misleading results.
- Users must be able to segment survey responses by demographic or categorical variables and compute cross-tabulated results, comparative distributions, and subgroup trends while ensuring statistical validity, correct normalization, and robust handling of sparse or imbalanced subgroups.
- The application must support aggregation of rating-scale questions by computing composite scores, distribution curves, response bias indicators, and internal consistency metrics while detecting invalid scale values, reversed scoring errors, and extreme-response bias.
- The system must analyze open-ended responses using lightweight local text processing to extract sentiment signals, keyword frequencies, topic clusters, and thematic patterns without relying on external APIs. The system must tolerate misspellings, slang, multilingual text, sarcasm, and noisy responses without producing misleading conclusions.
- Users must be able to manually tag qualitative responses with research codes, themes, or categories, track annotation history, and analyze frequency and co-occurrence of themes while ensuring that tagging operations remain reversible, auditable, and historically preserved.
- The application must detect potential bias patterns such as straight-lining, random answering, duplicate submissions, extreme response bias, inconsistent answers, and unusually fast completion times, providing researchers with response quality flags rather than silently discarding data.
- The system must compute metrics such as completion rates, dropout points, average response time per question, item non-response rates, and engagement curves while accounting for partial submissions and irregular completion flows.
- Users must be able to generate charts such as bar charts, stacked distributions, trend lines, heatmaps, response histograms, correlation matrices, sentiment timelines, and subgroup comparison dashboards using Chart.js, Recharts, Vega-Lite, D3.js, or ECharts. Visualizations must dynamically update when filters, segments, or cleaning rules change and must handle empty or sparse datasets gracefully.
- The system must allow filtering responses by demographic variables, answer values, timestamps, completion status, bias flags, or qualitative tags while ensuring fast, deterministic filtering even under large response datasets and chained query conditions.
- Users must be able to record research insights, hypotheses, interpretations, and caveats linked to specific survey questions, segments, or findings, preserving contextual knowledge alongside raw statistical outputs for later review or reporting.
- Every cleaning operation, segmentation change, annotation update, or analytical transformation must create an immutable dataset snapshot, allowing users to restore prior states, compare analytical outcomes, and reproduce research workflows over time.
- All survey definitions, response datasets, analytical outputs, visualizations, annotations, and research notes must persist locally using IndexedDB or equivalent storage, ensuring full functionality without internet connectivity and safe recovery from corrupted storage, interrupted writes, or browser crashes.
- All imported responses, transformation rules, survey schemas, and computed analytics must be validated using Zod to prevent invalid data propagation, silent corruption, or logically inconsistent research conclusions. Errors must be surfaced clearly without breaking application state.
- Application state must follow predictable and debuggable patterns using Zustand or Redux to ensure that dataset updates, filter changes, segmentation logic, analytics recomputation, and visualization rendering remain race-condition-free and reproducible across sessions.
- The system must remain performant when handling tens or hundreds of thousands of responses by using streaming ingestion, memoized analytics, incremental recomputation, batched processing, virtualized rendering, and optional Web Worker offloading for heavy statistical workloads.
- Users must be able to export cleaned datasets, segmented subsets, analytical summaries, visualizations, and research notes as CSV, JSON, or structured report files while preserving numeric precision, schema integrity, timestamp accuracy, and analysis traceability.
- The interface must be built with TailwindCSS, remain responsive and accessible, and clearly communicate statistical uncertainty, data quality warnings, bias flags, processing states, and interpretive limitations to avoid misleading or overstating findings.
- The system must be testable against extremely small sample sizes, massive datasets, contradictory responses, corrupted imports, multilingual text, biased sampling patterns, annotation conflicts, schema evolution, and long-term research usage to ensure professional-grade analytical reliability and correctness.

## Metadata
- Programming Languages: Typescript
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
