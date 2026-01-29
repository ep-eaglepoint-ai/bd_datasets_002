# 8QJI0F - Secure 2-of-3 Multi-Signature Transaction Implementation in Python for Cryptocurrency Wallet

**Category:** sft

## Overview
- Task ID: 8QJI0F
- Title: Secure 2-of-3 Multi-Signature Transaction Implementation in Python for Cryptocurrency Wallet
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8qji0f-secure-2-of-3-multi-signature-transaction-implementation-in-python-for-cryptocurrency-wallet

## Requirements
- The system must generate secure private/public keys using secp256k1 curve and cryptographically strong randomness
- Partial signatures must be produced correctly for each signer on the same transaction payload hash.
- The aggregation must combine exactly 2 valid partial signatures into a single valid secp256k1 signature.
- The implementation must enforce nonce uniqueness to prevent replay attacks on transactions.
- All inputs (amount, address, nonce) must be strictly validated before processing.
- Comparisons involving secrets must minimize timing differences where possible.
- Secrets (private keys, nonces) must be handled securely and not logged or exposed in errors.
- Signatures must be normalized to prevent malleability issues.
- Transaction payloads must be serialized deterministically for consistent hashing.
- The coordinator must verify each partial signature individually before aggregation.
- The system must reject invalid or insufficient signatures without proceeding to broadcast
- The code must use proper exception hierarchy and clear error messages for failures.

## Metadata
- Programming Languages: Python 3.10+
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
