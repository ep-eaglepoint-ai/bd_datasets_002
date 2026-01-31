# HBTCAB - API Key Management with Sliding Window Rate Limiting

**Category:** sft

## Overview
- Task ID: HBTCAB
- Title: API Key Management with Sliding Window Rate Limiting
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: hbtcab-api-key-management-with-sliding-window-rate-limiting

## Requirements
- API keys must be generated using cryptographically secure random bytes (minimum 32 bytes for the secret portion). The key format must include a recognizable prefix (e.g., dk_), environment indicator (live or test), and the secret: dk_{environment}_{secret}. Verify by checking that generated keys match this pattern and that two consecutive key generations produce different secrets.
- API key secrets must NEVER be stored in plaintext. Store only a cryptographic hash (bcrypt or SHA-256) of the secret. The plaintext key must be returned exactly once at creation time and never retrievable afterward. Verify by querying the api_keys table directly and confirming the secret_hash column contains a hash, not the original secret.
- When validating API keys, the secret comparison must use a constant-time algorithm to prevent timing attacks. If using bcrypt, this is handled internally. If using SHA-256, implement explicit constant-time comparison. Verify by reviewing the validation code path and confirming no early-return on mismatch character-by-character.
- API keys must have one of three scopes: read (GET only), write (GET, POST, PUT), or admin (all methods including DELETE). When a request's HTTP method exceeds the key's scope, return HTTP 403 with a clear error message. Verify by creating a read scope key and attempting POST—expect 403, not 401.
- Implement sliding window rate limiting using Redis sorted sets. Each request adds a timestamp entry; entries older than the window (1 hour) are removed before counting. The rate limit must be enforced atomically to prevent race conditions under concurrent requests. Verify by sending requests from multiple threads simultaneously and confirming the total never exceeds the limit by more than the concurrency factor.
- Rate limits must vary by user tier: free (100 requests/hour), pro (1000 requests/hour), enterprise (10000 requests/hour). The limit must be determined by the API key owner's tier at request time, not at key creation time. Verify by upgrading a user's tier and confirming subsequent requests use the new limit without key regeneration.
- Every API response must include three headers: X-RateLimit-Limit (max requests), X-RateLimit-Remaining (requests left), and X-RateLimit-Reset (Unix timestamp when window resets). When rate limited, return HTTP 429 with these headers. Verify by making requests and checking that Remaining decrements correctly and Reset is approximately 1 hour from the first request.
- When rotating an API key, the old key must remain valid for 24 hours while the new key is immediately active. Both keys must work simultaneously during the grace period. After 24 hours, the old key must automatically become invalid. Verify by rotating a key, confirming both work, then mocking time forward 25 hours and confirming only the new key works.
- Track API usage per key, per endpoint, per HTTP method, per day in PostgreSQL. Use an upsert pattern to increment counters rather than inserting individual request rows. Verify by making 10 requests to /api/resources GET and confirming the usage table has one row with request_count = 10, not 10 separate rows.
- When an API key reaches 80% of its rate limit within a window, trigger a webhook notification to the user's configured webhook URL. The webhook must include an HMAC signature header for authenticity verification. Send the webhook only once per window, not on every subsequent request. Verify by configuring a webhook endpoint, making requests to reach 80%, and confirming exactly one webhook is received with valid signature.
- The system must accept both Bearer {jwt} and ApiKey {key} authorization headers. Existing JWT-based authentication must continue working unchanged. API key management endpoints (/api/keys) must require JWT authentication only—users cannot create API keys using another API key. Verify by confirming all existing JWT-based tests pass without modification.
- When listing API keys via GET /api/keys, return only masked versions showing the prefix and last 4 characters (e.g., dk_live_****a1b2). Never return the full secret or hash in list responses. Include metadata: id, environment, scope, created_at, last_used_at. Verify by calling the list endpoint and confirming no response contains a secret longer than the masked format.

## Metadata
- Programming Languages: Javascript
- Frameworks: Express.js
- Libraries: (none)
- Databases: Postgress , Redis
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
