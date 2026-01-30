# SGEF9A - Webhook Delivery System 

**Category:** sft

## Overview
- Task ID: SGEF9A
- Title: Webhook Delivery System 
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: sgef9a-webhook-delivery-system

## Requirements
- HMAC-SHA256 signature generation must combine the webhook's secret key with a Unix timestamp and the raw JSON payload bytes in the format {timestamp}.{payload}. The signature header must follow t={timestamp},v1={hex_signature} format to support future signature versioning. Using the payload string without timestamp allows replay attacks where captured requests are re-sent indefinitely.
- Secret keys for webhook signatures must be generated using secrets.token_urlsafe(32) or equivalent cryptographically secure random generator producing at least 32 bytes of entropy. Using UUIDs (uuid.uuid4()) is insufficient because UUIDs are designed for uniqueness, not unpredictability, and their structure reduces effective entropy to approximately 122 bits with predictable formatting.
- Signature comparison must use hmac.compare_digest() for constant-time comparison. Direct string equality (==) leaks timing information proportional to the matching prefix length, allowing attackers to incrementally discover valid signatures through repeated requests measuring response times.
- Exponential backoff delays must follow base_delay * (2 ^ (attempt - 1)) producing the sequence 1s, 2s, 4s, 8s, 16s for attempts 1-5. The fifth retry should wait approximately 16 seconds, not 32 seconds (off-by-one in exponent) or 5 seconds (linear instead of exponential).
- Random jitter must add variation in both directions (±30%) not just subtract. Implementing jitter as delay * (1 - random(0, 0.3)) always reduces the delay, causing retries to cluster earlier than intended. Correct jitter uses delay + random(-0.3*delay, +0.3*delay) to spread retries across a time window.
- Scheduled retry tasks must create their own database sessions rather than receiving a session from the scheduling context. Async SQLAlchemy sessions are not thread-safe and close when their parent context exits. A retry scheduled for 16 seconds later will crash with "session is closed" if it references the original request's session.
- Async SQLAlchemy queries must use the 2.0 style with select() statements and await session.execute(). The legacy pattern await session.query(Model).filter(...).one() raises AttributeError because async sessions don't have a .query() method. The correct pattern is result = await session.execute(select(Model).where(...)) followed by result.scalar_one().
- Idempotency keys must be scoped to the webhook endpoint using a composite unique constraint on (webhook_id, idempotency_key). A constraint on idempotency_key alone prevents the same key from being used across different webhooks, which is overly restrictive. The same external event ID should be usable when delivering to multiple webhook subscribers.
- Payload size validation must reject oversized requests before the full body is read into memory. Checking len(json.dumps(payload)) after Pydantic deserialization means a 500MB payload has already been loaded, parsed, and validated before rejection. Use streaming body reads with size accumulator or check Content-Length header first.
- Health score calculation must weight recent results more heavily than historical ones. A simple ratio success_count / total_count means an endpoint that failed 1000 times last month but succeeded 10 times today shows 1% health. Exponential moving average with alpha=0.2 gives each new result 20% weight, allowing recovery within ~15 successful deliveries.
- Graceful shutdown must complete in-flight HTTP requests and persist pending retry records before the process terminates. A shutdown handler that only calls scheduler.shutdown() loses any retries that were scheduled but not yet persisted. The shutdown sequence should: stop accepting new work, wait for active deliveries, ensure all RETRYING status records have valid next_retry_at timestamps, then exit.
- Manual retry endpoint must validate the original delivery status before allowing retry. Retrying a SUCCESS delivery causes duplicate processing at the webhook consumer. The endpoint should return HTTP 409 Conflict with message "Cannot retry successful delivery" when status == SUCCESS, and only proceed for FAILED or RETRYING statuses.

## Metadata
- Programming Languages: Python
- Frameworks: Fast API
- Libraries: (none)
- Databases: PostgreSQL with SQLAlchemy
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
