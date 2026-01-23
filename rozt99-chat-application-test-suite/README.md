# ROZT99 - Chat Application Test Suite

**Category:** sft

## Overview
- Task ID: ROZT99
- Title: Chat Application Test Suite
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: rozt99-chat-application-test-suite

## Requirements
- Test that sending a message adds it to the messages array with correct role ('user')
- Test that message content is trimmed before sending
- Test that empty messages (whitespace only) cannot be sent
- Test that sending a message clears the input field
- Test that message IDs are unique (use timestamp-based generation)
- Test that messages are added in correct order (user message appears after previous messages)
- Test that sending is disabled when isTyping is true
- Test that "hello" or "hi" triggers appropriate greeting response
- Test that pressing Enter sends the message
- Test that pressing Shift+Enter creates a new line (does not send)
- Test that typing indicator only shows when isTyping is true
- Test that send button is disabled when input is empty or whitespace
- Test that rapid consecutive message sends are prevented (typing state blocks)
- Test that very long messages are handled correctly
- Test complete conversation flow: send message → typing indicator → receive response → typing indicator disappears
- Test multiple message exchange: send several messages and verify all responses are received
- Use Jest as the testing framework

## Metadata
- Programming Languages: JavaScript, Typescript
- Frameworks: Jest
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
