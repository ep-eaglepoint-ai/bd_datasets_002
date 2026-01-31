# PVSU4X - Multi-Field Form Validator Test Module

**Category:** sft

## Overview
- Task ID: PVSU4X
- Title: Multi-Field Form Validator Test Module
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: pvsu4x-multi-field-form-validator-test-module

## Requirements
- Username Validation Tests:  Test that the username is alphanumeric and between 3 to 15 characters long.  Test that the username does not contain spaces.  Test that the username cannot be purely numeric.  Test for valid usernames that include letters and numbers.
- Email Validation Tests:  Test that the email contains exactly one @ symbol.  Test that the email contains a valid domain (e.g., @example.com).  Test that the email does not contain consecutive dots (..).  Test for invalid emails, including malformed addresses (e.g., missing @, multiple @ symbols, missing domain part).
- Password Validation Tests:  Test that the password has a minimum length of 8 characters.  Test that the password contains both uppercase and lowercase letters.  Test that the password contains at least one numeric character.  Test that the password contains at least one special character (non-alphanumeric).  Test that the password does not contain spaces.  Test that the password does not contain repeated sequences (e.g., "aaaa", "abab").  Test that the password passes the case-sensitive check (i.e., not all lowercase or all uppercase).
- Confirm Password Validation Tests:  Test that the password matches the confirm_password field if provided.
- Edge Case Testing:  Test empty strings for username, email, and password.  Test extremely long strings for username, email, and password.  Test username and password containing Unicode characters.  Test email containing special characters in the local part (before @).  Test passwords with very long consecutive numeric sequences (e.g., "123456").
- Invalid Input Handling:  Ensure that all invalid inputs (e.g., empty, too short, or invalid characters) are correctly rejected.  Ensure that the validate_form function returns False for any invalid input and True for valid input.
- Country Code Validation Tests (if applicable):  Test that the country_code field accepts valid two-letter ISO codes.  Test that invalid country codes (non-alphabetic or wrong length) return False.
- Test Execution:  The test suite should be runnable as a standalone script.  It should produce clear results for valid and invalid inputs without requiring external dependencies.
- Comprehensive Coverage:  Ensure that the test suite covers all fields (username, email, password, confirm_password, and country_code).  Edge cases such as very short, very long inputs, and unusual characters should be covered.

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
