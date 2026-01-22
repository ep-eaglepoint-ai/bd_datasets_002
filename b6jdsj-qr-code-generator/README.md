# B6JDSJ - QR code generator

**Category:** sft

## Overview
- Task ID: B6JDSJ
- Title: QR code generator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: b6jdsj-qr-code-generator

## Requirements
- Single-page application with input validation, rejecting empty strings, inputs over 500 characters, or non-string values.
- Text/URL input field displaying real-time character count with a maximum of 500 characters.
- "Generate QR" button showing loading state during API calls.
- Responsive display area for the generated QR code image, updating immediately upon API response.
- Error handling UI for network failures, invalid inputs, or backend errors, displaying clear, human-readable messages.
- Must use functional components with React hooks.
- Styling must use ONLY Tailwind utility classes, no custom CSS or UI libraries.
- Must handle network failures gracefully, showing error states without retries.
- REST endpoint POST /api/generate accepting JSON: {"text": "string"}.  Returns JSON: {"qrCode": "base64-encoded-image", "timestamp": "ISO-8601"}
- Input validation: reject empty strings, strings >500 characters, or non-string inputs with appropriate HTTP 400 status codes.
- Implement proper CORS configuration
- Structured error responses: {"error": "message", "code": "ERROR_TYPE"
- Backend must not use any database or file system storage.
- Do not add download, QR customization, or persistent storage features.

## Metadata
- Programming Languages: Javascript
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
