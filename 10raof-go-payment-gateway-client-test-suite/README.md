# 10RAOF - Go Payment Gateway Client Test Suite

**Category:** sft

## Overview
- Task ID: 10RAOF
- Title: Go Payment Gateway Client Test Suite
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 10raof-go-payment-gateway-client-test-suite

## Requirements
- Code coverage must reach 90% or higher on client.go. When running go test -coverprofile, the coverage report must show at least 90% of statements executed across all functions including Charge, Refund, VerifyWebhook, and all option functions
- All HTTP calls must be mocked using httptest.Server. No test should make real network requests to external APIs. Each test that exercises HTTP behavior must create a local test server that simulates the payment gateway responses.
- Idempotency key handling must prevent duplicate charges. When the same ChargeRequest with identical IdempotencyKey is submitted twice, the second call must return the cached response without making a second HTTP request to the server. Server request count must remain at 1 after both calls complete.
- Idempotency must work correctly under concurrent access. When 10 goroutines simultaneously submit ChargeRequest with the same IdempotencyKey, exactly one HTTP request must reach the server. All 10 goroutines must receive the same ChargeResponse with no errors. Tests must pass with go test -race flag.
- Refund errors must propagate to callers without being swallowed. When the payment server returns HTTP 500 for a refund request and all retries are exhausted, the Refund function must return a non-nil error containing details about the failure. The error must not be nil when the refund actually failed.
- Refund must return ErrChargeNotFound for HTTP 404 responses. When the server returns 404 indicating the charge doesn't exist, the error returned must be ErrChargeNotFound (testable via errors.Is), and no retries should be attempted for this non-retryable error.
- Webhook signature validation must reject invalid signatures. When VerifyWebhook is called with a payload and an incorrect signature string, the function must return false. This must work for signatures that are wrong values, wrong lengths, truncated, or extended with extra characters.
- Webhook validation must reject crafted payloads. When an attacker submits a modified payload with a signature that was valid for a different payload, VerifyWebhook must return false. The signature and payload must match exactly.
- Webhook validation must return false when webhook secret is empty. When the client is created without WithWebhookSecret option, any call to VerifyWebhook must return false regardless of payload and signature values.
- Timeout must return ErrTimeout error type. When the HTTP request exceeds the configured timeout duration, the error returned must satisfy errors.Is(err, ErrTimeout). The test must configure a short timeout (e.g., 50ms) and a server that sleeps longer than that.
- Retry logic must attempt the configured number of retries for transient errors. When the server returns HTTP 500 for the first N requests then succeeds, and the client is configured with WithRetries(N), the final result must be successful. Total server request count must equal N+1 (initial + retries).
- Non-retryable errors must not trigger retries. When the server returns HTTP 401 (Unauthorized), exactly one request must be made regardless of retry configuration. The error must be ErrInvalidAPIKey and server request count must be 1.
- Invalid API key must return ErrInvalidAPIKey immediately. When NewClient is called with empty string API key, any Charge or Refund call must return ErrInvalidAPIKey without making any HTTP request.
- Invalid amount must return ErrInvalidAmount immediately. When ChargeRequest.Amount is zero or negative, Charge must return ErrInvalidAmount without making any HTTP request. Same for Refund with zero or negative amount
- Empty chargeID in Refund must return ErrChargeNotFound immediately. When Refund is called with empty string chargeID, it must return ErrChargeNotFound without making any HTTP request.
- Table-driven tests must cover input validation edge cases. Amount values of 0, -1, -100, and valid positive values must be tested in a single table-driven test function using t.Run for each case.
- Fuzz testing must exercise webhook signature verification. A fuzz test function FuzzVerifyWebhook must be implemented that accepts arbitrary payload bytes and signature strings, computing whether the signature is valid and asserting the function returns the correct boolean.
- All tests must complete in under 10 seconds total. The entire test suite including fuzz corpus runs must execute within 10 seconds when run with go test -v ./...
- Only Go standard library and testify/assert are permitted. No other external testing libraries, mock frameworks, or HTTP client wrappers may be used. The testify package may only be used for assertions.
- The client.go file must not be modified. All tests must work against the existing implementation without any changes to the source code being tested.

## Metadata
- Programming Languages: Go
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: code under test (`payment/client.go`)
- tests/: test suite (`*_test.go`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start

 repository_before:
  ```bash
  docker compose run --rm -e TARGET_REPO=repository_before app go test -v ./tests/...
  ```
repository_after
 ```bash
  docker compose run --rm -e TARGET_REPO=repository_after app go test -v ./tests/... ```


Run the evaluation script:
```bash
docker compose run --rm app go run evaluation/evaluation.go
```

## Regenerate patch

From repo root:

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```

## Notes
- The test suite uses a binary-based target selection mechanism. 
- Setting `TEST_TARGET=before` exercises the pre-built baseline binary.
- By default, it tests the `repository_after` source directly for maximum performance and coverage.
