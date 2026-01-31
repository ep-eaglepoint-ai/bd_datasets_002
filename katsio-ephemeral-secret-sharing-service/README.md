# KATSIO - Ephemeral-Secret-Sharing-Service

**Category:** sft

## Overview
- Task ID: KATSIO
- Title: Ephemeral-Secret-Sharing-Service
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: katsio-ephemeral-secret-sharing-service

## Requirements
- Implement a FastAPI POST endpoint that accepts a secret and a TTL, encrypts the data using AES-256-GCM, and stores the ciphertext in Redis with an expiration time.
- Develop a GET endpoint that retrieves a secret by UUID, decrypts it, and performs a 'Delete-on-Read' operation to ensure the secret is immediately purged from Redis.
- Create a React frontend with a secure submission form that provides a generated unique link to the user upon a successful backend response.
- Design a 'Secret Viewer' component in React that handles the one-time display of the decrypted secret and shows a 'Secret Expired' message for invalid or previously read links.
- Implement server-side logic to prevent race conditions during the 'Burn-on-Read' process, ensuring only the first request successfully retrieves the secret.
- Integrate Redis TTL settings to automatically evict secrets from memory that have passed their expiration window without being accessed.
- Testing: Implement Pytest integration tests that verify a secret is correctly purged after one successful GET request and is unreachable via subsequent requests.
- Testing: Verify that the frontend correctly masks the secret in the UI until the user explicitly clicks a 'Reveal' button, preventing shoulder-surfing. write unit and integration tests no e2e tests needed
- tests for these (Read/Write Latency (<50ms), Redis Memory Footprint)

## Metadata
- Programming Languages: Python, JavaScript
- Frameworks: FastAPI, React
- Libraries: cryptography, redis-py, pydantic, axios
- Databases: Redis
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: Read/Write Latency (<50ms), Redis Memory Footprint
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
