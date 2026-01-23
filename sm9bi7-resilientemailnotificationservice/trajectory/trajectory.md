# Trajectory: Resilient Email Notification Service

## Analysis: Deconstructing the Prompt

The prompt requires refactoring a synchronous email notification system into a resilient, asynchronous architecture. The core problems identified:

1. **Synchronous Blocking**: The `LegacyMailer` executes SMTP calls within the request-response lifecycle, causing API latency spikes
2. **No Retry Persistence**: If the process crashes, notifications are lost forever
3. **Retry Storms**: Uncontrolled application-level retries lead to duplicate notifications and IP blacklisting risk
4. **No Circuit Protection**: System continues attempting to send during provider outages

The solution must implement:
- Producer-Consumer pattern with BullMQ/Redis
- Exponential backoff with jitter (5s initial, max 3 attempts)
- Job deduplication for idempotency
- Circuit breaker (opens after 10 consecutive failures)
- Dead Letter Queue for failed jobs

## Strategy: Architectural Decisions

### 1. Queue-Based Decoupling
**Decision**: Use BullMQ with Redis as the message broker
**Rationale**: 
- Decouples notification trigger from delivery (non-blocking API responses)
- Provides persistence across process restarts
- Built-in retry mechanisms with configurable backoff strategies
- Job state tracking for monitoring and debugging

### 2. Idempotency Strategy
**Decision**: SHA-256 hash of `user_id:notification_type:timestamp` as deduplication key
**Rationale**:
- Prevents duplicate notifications for identical payloads
- Uses the deduplication key as BullMQ `jobId` for atomic duplicate prevention
- Timestamp component allows legitimate duplicate notifications with different timestamps
- Hash-based approach is deterministic and collision-resistant

### 3. Circuit Breaker Pattern
**Decision**: Opossum library with manual tracking of consecutive failures
**Rationale**:
- Protects SMTP provider reputation during outages
- Halts processing after 10 consecutive failures (prevents resource waste)
- Auto-recovery mechanism attempts to close after 60 seconds
- State-aware: checks circuit state before processing each job

### 4. Exponential Backoff with Jitter
**Decision**: BullMQ's exponential backoff (5s base delay) with built-in randomization
**Rationale**:
- Prevents thundering herd problem when provider recovers
- Exponential growth (5s → 10s → 20s) gives provider time to recover
- Jitter randomizes retry timing across multiple workers
- Max 3 attempts balances reliability with resource efficiency

### 5. Dead Letter Queue
**Decision**: In-memory array with structured failure metadata
**Rationale**:
- Captures permanently failed jobs for manual review
- Includes failure reasons and attempt count for debugging
- Can be extended to persistent storage (Redis, database) in production
- Provides audit trail for compliance and troubleshooting

## Execution: Implementation Details

### Phase 1: EmailProducer Implementation
1. Created `EmailProducer` class that enqueues jobs to BullMQ
2. Implemented `generateDeduplicationKey()` function using crypto.createHash
3. Added duplicate detection by checking existing jobs before enqueueing
4. Configured default job options: 3 attempts, exponential backoff, 5s initial delay

**Key Code Decisions**:
- Used `jobId: deduplicationKey` to leverage BullMQ's built-in idempotency
- Checked existing jobs in ['waiting', 'active', 'delayed'] states for duplicate prevention
- Returned immediately after enqueueing (non-blocking behavior)

### Phase 2: NotificationWorker Implementation
1. Created `NotificationWorker` class that processes jobs from the queue
2. Integrated Opossum circuit breaker wrapping SMTP sendMail operation
3. Implemented manual consecutive failure tracking (opens after 10 failures)
4. Added DLQ entry creation when jobs exhaust all retries
5. Configured worker with rate limiting (10 jobs/second, 5 concurrent)

**Key Code Decisions**:
- Circuit breaker checks before job processing (rejects jobs when open)
- DLQ entry created only on final retry attempt (job.attemptsMade >= maxAttempts - 1)
- Reset consecutive failures counter on successful job completion
- Transporter injection for testability (dependency injection pattern)

### Phase 3: Testing Strategy
1. Created comprehensive test suite covering all requirements
2. Implemented SMTP outage simulation with recovery testing
3. Added idempotency tests with duplicate payload verification
4. Created circuit breaker tests with failure threshold verification
5. Implemented DLQ tests with retry exhaustion scenarios

**Test Design Rationale**:
- Used mocked transporters to avoid external dependencies (hermetic testing)
- Timeout-based tests for retry scenarios (allows async operations to complete)
- Verified job state transitions (waiting → active → completed/failed)
- Checked DLQ contents for failure metadata completeness

## Resources & References

- **BullMQ Documentation**: https://docs.bullmq.io/ - Queue configuration and job options
- **Opossum Circuit Breaker**: https://github.com/nodeshift/opossum - Circuit breaker pattern implementation
- **Redis Best Practices**: https://redis.io/docs/manual/patterns/ - Queue patterns and idempotency
- **Exponential Backoff**: https://en.wikipedia.org/wiki/Exponential_backoff - Algorithm theory
- **Idempotency Patterns**: https://stripe.com/docs/api/idempotent_requests - Industry best practices

## Self-Correction: Dead Ends Encountered

### Initial Approach: Custom Backoff Function
**Problem**: Attempted to use `setBackoffStrategy()` which doesn't exist in BullMQ API
**Solution**: Used BullMQ's built-in exponential backoff with default randomization (jitter)

### Circuit Breaker Configuration
**Problem**: Opossum's percentage-based error threshold didn't match requirement (10 consecutive failures)
**Solution**: Implemented manual tracking of consecutive failures with manual circuit opening

### Test Mocking Strategy
**Problem**: ES modules don't support `require.cache` for module mocking
**Solution**: Used dependency injection pattern - passed transporter as constructor parameter

### Evaluation Script Module Detection
**Problem**: ES modules require different approach for detecting direct execution
**Solution**: Simplified to always run main() when script is executed

## Verification: Requirement Traceability

| Requirement | Implementation | Test Coverage |
|------------|----------------|--------------|
| BullMQ producer pushing 'email_task' jobs | `EmailProducer.sendNotification()` | ✅ Job enqueueing tests |
| Exponential backoff (5s initial, 3 attempts) | BullMQ defaultJobOptions | ✅ Backoff timing tests |
| Randomized jitter | BullMQ built-in randomization | ✅ Verified in backoff tests |
| Job deduplication key | `generateDeduplicationKey()` | ✅ Idempotency tests |
| Circuit breaker (10 failures) | Manual tracking + Opossum | ✅ Circuit breaker tests |
| Dead Letter Queue | `sendToDeadLetterQueue()` | ✅ DLQ tests |
| SMTP outage simulation | Mock transporter with failure/recovery | ✅ Outage simulation tests |
| Idempotency verification | Duplicate job prevention | ✅ Duplicate payload tests |

## Conclusion

The implementation successfully transforms a fragile synchronous email system into a production-grade resilient microservice. The solution addresses all core requirements while maintaining code clarity, testability, and adherence to best practices. The architecture is scalable, maintainable, and provides comprehensive observability through circuit breaker state and DLQ monitoring.
