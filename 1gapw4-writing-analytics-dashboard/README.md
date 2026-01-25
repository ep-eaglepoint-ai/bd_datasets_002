# 1GAPW4 - writing analytics dashboard

**Category:** sft

## Overview
- Task ID: 1GAPW4
- Title: writing analytics dashboard
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 1gapw4-writing-analytics-dashboard

## Requirements
- The system must allow users to write or import text documents, essays, journal entries, stories, or articles, organize them by project, category, tags, or timestamps, and ensure that all text is preserved in its original raw form without destructive preprocessing or silent modification.
- The application must tokenize text into words, sentences, and paragraphs using deterministic parsing logic that handles punctuation, abbreviations, contractions, emojis, special characters, multilingual content, and irregular formatting without corrupting semantic structure.
- The system must track word count, character count, sentence count, paragraph count, and writing frequency over time, generating historical trends such as daily writing output, productivity streaks, long-term volume growth, and consistency metrics while handling irregular writing schedules and missing activity periods.
- The application must compute sentiment scores and emotional tone distributions across documents, paragraphs, and sentences, detecting polarity shifts, mood patterns, emotional intensity, and sentiment volatility while tolerating sarcasm, slang, ambiguous tone, and stylistic nuance.
- The system must compute lexical richness metrics such as type-token ratio, moving average type-token ratio, hapax legomena frequency, repetition rates, rare-word usage, and vocabulary diversity trends while accounting for text length bias, genre differences, and topic-driven vocabulary changes.
- The application must compute readability scores such as Flesch Reading Ease, Flesch–Kincaid Grade Level, Gunning Fog Index, SMOG Index, and sentence complexity metrics, ensuring correct handling of punctuation, abbreviations, sentence fragments, and technical writing styles.
- The system must analyze sentence length distribution, clause depth, punctuation patterns, passive voice usage, coordination frequency, and syntactic variation, generating interpretable insights into structural complexity and writing sophistication.
- The application must compute stylistic fingerprints based on lexical choices, rhythm patterns, sentence cadence, function word usage, punctuation frequency, and phrasing tendencies, enabling users to observe stylistic evolution and consistency across time.
- The system must extract keywords, n-grams, and thematic signals from text to identify dominant topics, detect topic drift over time, and analyze shifts in thematic focus while tolerating noisy phrasing and overlapping subject matter.
- The application must detect repeated phrases, overused words, structural redundancy, and filler patterns, generating actionable feedback without misclassifying deliberate stylistic repetition or rhetorical emphasis.
- The system must track grammar-related patterns such as tense consistency, pronoun usage, verb form trends, modifier density, and common grammatical constructions while avoiding overconfident or incorrect prescriptive judgments.
- Users must be able to compare two or more writing samples to analyze differences in tone, vocabulary richness, readability, sentence complexity, sentiment distribution, and stylistic signature while ensuring fair normalization across different text lengths.
- The application must analyze how writing style evolves over time by tracking changes in tone, complexity, vocabulary diversity, pacing, sentiment stability, and thematic focus, generating interpretable long-term evolution graphs.
- Users must be able to annotate analytics results, log insights, track writing goals, and attach reflective notes to specific documents or time periods while preserving annotation history and analytical traceability.
- The system must render interactive charts such as sentiment timelines, readability trend curves, vocabulary growth graphs, sentence complexity histograms, stylistic fingerprint heatmaps, and topic evolution charts using Chart.js, Recharts, Vega-Lite, D3.js, or ECharts. Visualizations must dynamically update as text data changes and must handle sparse or extreme datasets gracefully.
- Users must be able to filter writing samples by date, project, genre, length, sentiment range, readability band, stylistic metrics, or topic clusters while ensuring fast, deterministic filtering under large text archives.
- Every edit, import, annotation, or analytics recalculation must create an immutable snapshot that allows users to restore prior versions, compare analytical states, and reproduce historical insights without corrupting original text data.
- All text documents, analytics results, visualization states, annotations, and metadata must persist locally using IndexedDB or equivalent storage, ensuring full functionality without internet connectivity and safe recovery from corrupted storage, partial writes, or browser crashes.
- All imported text, computed metrics, stored analytics, and transformation logic must be validated using Zod to prevent invalid states, corrupted datasets, or silent analytical errors. Errors must be surfaced clearly without breaking application stability.
- Application state must follow predictable and debuggable update patterns using Zustand or Redux to ensure that text updates, analytics recomputation, visualization rendering, and UI state transitions remain race-condition-free and reproducible.
- The system must remain performant when processing hundreds or thousands of writing samples by using memoized analytics computation, incremental recalculation, batching, virtualized lists, and optional Web Worker offloading for heavy text-processing workloads.
- Users must be able to export writing data, computed metrics, visualizations, and longitudinal analytics reports as JSON or CSV while preserving timestamp accuracy, metric precision, text integrity, and historical traceability.
- The interface must be built with TailwindCSS, remain responsive and accessible, and clearly communicate analytical meaning, uncertainty, trend direction, and metric interpretation to avoid misleading users about writing quality or skill.
- The system must be testable against extremely short or long texts, multilingual writing, stylistic experimentation, emotional extremes, corrupted imports, large writing archives, contradictory tone signals, and long-term writing evolution to ensure professional-grade analytical reliability and correctness.

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
