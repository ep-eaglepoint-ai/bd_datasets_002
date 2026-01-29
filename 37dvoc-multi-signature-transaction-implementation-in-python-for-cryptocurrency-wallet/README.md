# 37DVOC - Multi-Signature Transaction Implementation in Python for Cryptocurrency Wallet

**Category:** sft

## Overview
- Task ID: 37DVOC
- Title: Multi-Signature Transaction Implementation in Python for Cryptocurrency Wallet
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 37dvoc-multi-signature-transaction-implementation-in-python-for-cryptocurrency-wallet

## Requirements
- The system must generate secure private/public keys using secp256k1 curve and cryptographically strong randomness.
- Partial signatures must be produced correctly for each signer on the same transaction payload hash.
- The implementation must enforce nonce uniqueness to prevent replay attacks on transactions.
- Comparisons involving secrets must minimize timing differences where possible.
- Secrets (private keys, nonces) must be handled securely and not logged or exposed in errors.
- Signatures must be normalized to prevent malleability issues.
- The coordinator must verify each partial signature individually before aggregation.
- he code must use proper exception hierarchy and clear error messages for failures
- The system must reject invalid or insufficient signatures without proceeding to broadcast.

## Metadata
- Programming Languages: python 3.10
- Frameworks: (none)
- Libraries: ecdsa library (for secp256k1)
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
