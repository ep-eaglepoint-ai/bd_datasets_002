# XACQJF - Modular, Auditable Symmetric Encryption Utility for Secure JSON

**Category:** sft

## Overview
- Task ID: XACQJF
- Title: Modular, Auditable Symmetric Encryption Utility for Secure JSON
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: xacqjf-modular-auditable-symmetric-encryption-utility-for-secure-json

## Requirements
- The encryption process must use a modern authenticated encryption scheme (AES-256-GCM) with a cryptographically secure random salt and nonce generated per message, and derive encryption keys using a memory-hard key derivation function (scrypt) with configurable but secure parameters.
- The implementation must define and enforce a clear internal “envelope” schema that encapsulates all cryptographic artifacts (salt, nonce, authentication tag, ciphertext, and version metadata), using explicit, self-documenting field names, versioning support, and strict parsing rules to prevent malformed or ambiguous inputs
- The codebase must be refactored to follow single-responsibility principles, separating configuration/constants, base64url encoding and decoding, key derivation, envelope serialization/deserialization, and cryptographic operations into distinct, well-scoped functions or modules with no hidden side effects.
- All inputs must be validated at runtime with explicit type and format checks, rejecting empty secrets, invalid payloads, malformed encoded data, and unsupported options, while ensuring error messages are consistent, actionable, and do not leak sensitive information.
- The decryption logic must reliably detect and reject tampered data, incorrect secrets, authentication tag mismatches, checksum failures, or AAD mismatches, and must fail closed with explicit errors rather than returning partial or corrupted data.
- The utility must include a minimal but comprehensive test harness that verifies successful encryption–decryption round trips, failure on incorrect secrets, detection of ciphertext tampering, and failure on mismatched AAD, ensuring the implementation remains correct during refactoring and future changes.
- The final result must be readable, auditable, and maintainable, suitable for security review and long-term use, while preserving the original cryptographic properties and external behavior of the encryption utility.

## Metadata
- Programming Languages: JavaScript
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
