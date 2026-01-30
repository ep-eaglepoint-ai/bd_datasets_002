# QKFITC - MISP Graph Topology & Idempotent Object Ingestion

**Category:** sft

## Overview
- Task ID: QKFITC
- Title: MISP Graph Topology & Idempotent Object Ingestion
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: qkfitc-misp-graph-topology-idempotent-object-ingestion

## Requirements
- Must use pymisp (PyMISP) library.
- Code must be organized into a class (e.g., PhishingFeedIngestor).
- Must retrieve or create a single Event named "Daily Phishing Feed" (Singleton pattern).
- Must use add_object with the file template for the malware artifact.
- Must correctly map sha256 and filename to the object properties.
- Must add the payload_delivery_url as a standalone Attribute (type: url).
- Must create a reference/relationship where the File Object is the Source, the URL is the Target, and the relationship type is downloaded-from.
- The script must verify if the Object/Attribute already exists before adding it (deduplication logic).
- Running the script twice with the same input list must result in zero new attributes/objects in MISP.
- Must handle API initialization errors (e.g., invalid URL/Key) gracefully.
- The Event must be published or tagged as per standard TIP ingestion flows (implied, but object creation is the primary test).

## Metadata
- Programming Languages: Python 3
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
