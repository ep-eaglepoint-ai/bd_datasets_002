# EL7X5F - ml feature store system

**Category:** sft

## Overview
- Task ID: EL7X5F
- Title: ml feature store system
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: el7x5f-ml-feature-store-system

## Requirements
- Design a declarative Python DSL for defining features with transformation logic, data source bindings, entity keys, and metadata including descriptions, owners, and tags, supporting both SQL-based and Python-based transformations with automatic dependency tracking
- Implement a batch processing pipeline using Spark that computes features from source tables, handles incremental processing with watermarks, supports backfilling historical features, and writes to both offline store (for training) and materializes to online store (for serving)
- Build a stream processing layer that computes features from Kafka events with configurable windows (tumbling, sliding, session), aggregation functions (count, sum, avg, percentiles), and automatic handling of late-arriving data with watermark-based eviction
- Create a low-latency serving layer using Redis that retrieves features by entity key, supports batch feature retrieval for multiple entities, implements feature freshness monitoring with staleness alerts, and provides fallback values for missing features
- Develop a temporal join mechanism for training data generation that correctly aligns features with labels based on event timestamps, preventing data leakage by only using features available at prediction time, with efficient execution using Spark's window functions
- Build a centralized registry storing feature definitions, schemas, statistics, and lineage graphs, with a REST API for feature discovery, a web UI for browsing and documentation, and integration hooks for data catalog systems
- Implement feature validation using Great Expectations with automatic profile generation, statistical drift detection comparing training and serving distributions, schema enforcement, and alerting when features fall outside expected bounds
- Create Python SDK providing seamless integration with training workflows, including pandas DataFrame construction from feature sets, PyTorch Dataset implementation with automatic feature fetching, and scikit-learn transformer compatibility

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
