# Trajectory

1. Reproduce the Concurrency Bug (Detect Double Charges)
   I created a concurrent test case spawning multiple goroutines to simulate rapid fire requests with the same idempotency key. The logs confirmed that the check-then-act pattern was not atomic, allowing multiple charges to slip through before the key was marked as processed.
   Learn about detecting race conditions in Go: [https://go.dev/doc/articles/race_detector](https://go.dev/doc/articles/race_detector)

2. Fix Idempotency with Atomic Safe-Guards
   I refactored the client to use a proper locking mechanism (or a "pending" state map) that reserves the idempotency key immediately. This ensures that subsequent requests wait or fail fast while the first request is still in flight, preventing duplicate processing.
   Understanding mutexes and sync: [https://gobyexample.com/mutexes](https://gobyexample.com/mutexes)

3. Validate Refund Error Propagation
   I audited the retry logic and error handling in the refund flow. The original code could potentially mask API failures or return nil errors when the operation didn't actually succeed (e.g., on certain HTTP status codes or malformed responses). I added tests to ensure that every non-success response from the gateway is correctly translated into a returned implementation error.
   Effective error handling in Go: [https://go.dev/blog/error-handling-and-go](https://go.dev/blog/error-handling-and-go)

4. Harden Webhook Signature Verification
   I wrote a test suite for the webhook verifier with various crafted payloads/signatures. I ensured that the HMAC comparison uses `crypto/subtle` correctly to prevent timing attacks and that the implementation strictly validates the signature format.
   Preventing timing attacks: [https://codahale.com/a-lesson-in-timing-attacks/](https://codahale.com/a-lesson-in-timing-attacks/)

5. Result: Reliability and Trust
   The client library now has comprehensive test coverage guarding against double charges, verified error paths for refunds, and secure webhook validation. Production reliability is restored.
