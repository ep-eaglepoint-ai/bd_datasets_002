# V81BBO - Secure Password Validation Module

**Category:** sft

## Overview
- Task ID: V81BBO
- Title: Secure Password Validation Module
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: v81bbo-secure-password-validation-module

## Requirements
- Password Rules Enforcement: A valid password must meet all of the following criteria:  Minimum length of 12 characters.  Contains at least one uppercase letter.  Contains at least one lowercase letter.  Contains at least one numeric character.  Contains at least one special character.  Must not contain repeated sequences (e.g., "abcabc", "1111").
- Error Reporting: Passwords that fail validation should return clear, human-readable error messages. If a password violates multiple rules, all violations should be reported together.
- Edge Case Handling: The validation function must safely handle edge cases, such as empty strings, null values, or invalid input formats, without causing errors or crashes.
- Clear Feedback: The validation should give users specific, meaningful feedback indicating which password rules were violated and what actions can be taken to correct them.
- Performance Efficiency: Validation should be efficient and avoid unnecessary work. While clarity and correctness are prioritized, the implementation should also be reasonably performant, especially for handling large sets of passwords.
- Security: The validation module must not allow any malicious or malformed input to cause unexpected behavior or security vulnerabilities (e.g., injection attacks, buffer overflows).
- Modularity: The password validation logic should be modular and easy to understand, with clear separation of concerns. It should be maintainable and easily extensible for future rule additions or changes.
- Compliance with Modern Standards: The validation logic must comply with modern security standards for password strength, ensuring that it meets or exceeds typical security requirements for high-value or sensitive accounts.
- User-friendly Messaging: Error messages should be human-readable and easy for end-users to understand. For example, instead of technical jargon, messages should directly explain what part of the password is incorrect and why.
- Code Readability & Maintainability: The code must be clean, well-structured, and documented, making it easy for future developers to audit, test, and improve.

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
