# HYIHE2 - password vault

**Category:** sft

## Overview
- Task ID: HYIHE2
- Title: password vault
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: hyihe2-password-vault

## Requirements
- The system must require users to create a master password that derives a cryptographic encryption key using a secure key derivation function such as PBKDF2, Argon2, or Web Crypto API primitives, incorporating salt and iteration parameters to resist brute-force attacks. The master password must never be stored in plaintext, and incorrect passwords must fail safely without leaking metadata or partial decrypted content.
- All stored credentials must be encrypted on the client before being persisted, ensuring that no plaintext passwords, usernames, or sensitive notes are ever written to IndexedDB or memory beyond necessary runtime usage. The encryption model must ensure that only users with the correct master password can decrypt vault contents, enforcing a zero-knowledge design where even the application cannot recover secrets without explicit user authorization.
- Users must be able to store credentials including site name, username, password, URL, security notes, tags, and optional metadata while ensuring that each entry is encrypted as part of a structured vault record. The system must validate credential input using Zod to prevent malformed records, missing required fields, or corrupted encrypted payloads.
- The system must include a secure password generator that allows users to configure password length, character sets, entropy targets, and complexity rules while ensuring cryptographically strong randomness. Generated passwords must avoid predictable patterns, low-entropy outputs, or biased randomness that could weaken security.
- The application must analyze stored passwords to compute strength scores based on entropy, length, dictionary resistance, repetition patterns, and known weakness heuristics. Strength evaluation must operate on decrypted values in-memory only and must avoid persisting sensitive intermediate data.
- The system must detect reused passwords across multiple entries and flag potential security risks, generating audit reports that summarize weak passwords, reused credentials, outdated entries, and high-risk records. Reuse detection must not expose plaintext passwords in logs, exports, or storage.
- Users must be able to assign tags, categories, and metadata to credentials, with fast client-side search and filtering based on site name, tags, URLs, and security risk indicators. Search operations must remain performant even when handling hundreds or thousands of encrypted entries.
- When users copy passwords or usernames to the clipboard, the system must minimize exposure by auto-clearing clipboard contents after a configurable timeout, warning users about clipboard risks, and preventing accidental long-term leakage of sensitive values.
- The vault must automatically lock after periods of inactivity, requiring the master password to decrypt data again, while ensuring that decrypted secrets are wiped from memory when sessions end. Auto-lock timing must be configurable and must handle edge cases such as browser refreshes or tab suspensions.
- Every credential addition, update, deletion, or metadata change must create an immutable encrypted snapshot that allows users to restore previous states in case of accidental deletion or corruption while ensuring historical snapshots remain encrypted and tamper-resistant.
- All encrypted vault data, encryption metadata, audit results, and user preferences must persist locally using IndexedDB or equivalent secure browser storage, ensuring full functionality without internet connectivity. The system must gracefully recover from corrupted storage, partial writes, browser crashes, and interrupted encryption workflows.
- All encryption inputs, decrypted outputs, credential schemas, and persistence operations must be validated using Zod, with cryptographic integrity checks to detect tampered or corrupted vault data. The system must surface meaningful errors without leaking sensitive internal state.
- Application state must follow predictable and debuggable patterns using Zustand or Redux to ensure that lock states, encryption status, decrypted memory handling, and UI visibility transitions remain deterministic and race-condition-free.
- The system must remain responsive when managing large vaults by using memoized computations, virtualized lists, batched encryption operations, and optional Web Worker offloading to avoid blocking the UI during heavy cryptographic workloads.
- The interface must be built with TailwindCSS, remain responsive and accessible, and clearly communicate security states such as locked vaults, encryption in progress, weak password warnings, reuse alerts, clipboard exposure, and potential breach risks without overwhelming or confusing the user.
- Users must be able to export encrypted vault backups and import them later while preserving encryption integrity, metadata consistency, and version compatibility. Exported backups must never contain plaintext secrets, and import workflows must safely validate file authenticity and schema compatibility.
- The system must simulate breach risk scenarios by estimating exposure impact based on password reuse, strength distribution, and credential sensitivity, presenting actionable insights while avoiding reliance on external breach databases.
- The system must be testable against forgotten master passwords, corrupted encrypted records, extremely large vaults, rapid lock/unlock cycles, repeated password generation, failed decryptions, and long-term usage patterns to ensure professional-grade reliability, security, and correctness.

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
