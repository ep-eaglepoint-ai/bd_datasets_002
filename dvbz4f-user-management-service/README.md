# DVBZ4F - user-management-service

**Category:** rl

## Overview
- Task ID: DVBZ4F
- Title: user-management-service
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: dvbz4f-user-management-service

## Requirements
- The monolithic `UserManager` class must be refactored into: `User` (data model with attributes only), `UserRepository` (handles storage operations: save, find, delete), `UserValidator` (validates email format, password strength, username rules), `PasswordHasher` (handles hashing and verification), and `UserService` (orchestrates the workflow). Each class should have one reason to change and do one thing well.
- The `UserService` must receive its dependencies (`UserRepository`, `UserValidator`, `PasswordHasher`) through its constructor rather than creating them internally. This enables easy testing with mock objects and swapping implementations. The constructor signature should be: `__init__(self, repository, validator, hasher)`.
- All hardcoded values must become named constants: minimum password length, maximum username length, email regex pattern, hash algorithm parameters, error messages. Group related constants in a `Constants` or `Config` class. This improves readability and makes changes easier.
- The refactored code must provide the same public methods with the same signatures: `register_user(username, email, password)`, `authenticate(email, password)`, `update_profile(user_id, **kwargs)`, `delete_user(user_id)`. Tests written against the original implementation must pass without modification against the refactored version.
- The service must raise appropriate, specific error messages for invalid usernames, passwords, emails, duplicate emails, and non-existent users. These messages should match those in the original code and should also be available in the extracted constants for testability.
- Once registered, a user's `id` and creation timestamp (`created_at`) must not change with profile updates. Only mutable fields such as username or email may be updated as allowed.
- Passwords must be hashed using the same algorithm and salting approach as the original code. `authenticate` must validate against the hash. Tests should verify that the same input produces identical password hashes between original and refactored implementations.
- The repository must behave like an in-memory data store supporting CRUD operations. Repositories in tests must allow inspection of saved users to assert side effects of operations.
- If the code supports account deactivation or deletion, accounts must become inaccessible via authentication but still remain in storage for deactivation, and be removed for deletion. Attempting to operate on deleted users must raise the same errors as in the original.
- The refactored code must be tested for corner cases such as registration with usernames at length limits, passwords at minimum complexity, authentication with incorrect credentials, updating profiles with invalid data, and operations on nonexistent user_ids.
- The service and repository must be designed to allow tests to run in isolation (e.g., fresh repository instance per test), without cross-test data bleed.
- For any given input sequence, the refactored service must yield results and errors identical to the original.

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
