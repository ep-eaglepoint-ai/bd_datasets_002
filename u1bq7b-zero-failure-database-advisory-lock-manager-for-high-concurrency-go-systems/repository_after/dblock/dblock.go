package dblock

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"hash/fnv"
	"sync"
	"time"
)

// ErrLockNotHeld is returned when attempting to release a lock that is not held.
var ErrLockNotHeld = errors.New("lock not held")

// ErrAlreadyLocked is returned when attempting to acquire a lock that is already held.
var ErrAlreadyLocked = errors.New("lock already held")

// ErrConnectionClosed is returned when the connection has been closed unexpectedly.
var ErrConnectionClosed = errors.New("connection closed")

// DatabaseLockHelper provides a reusable PostgreSQL advisory lock manager
// for high-concurrency Go systems. It manages connection lifecycle, supports
// configurable retries with backoff, and respects context cancellation.
type DatabaseLockHelper struct {
	mu sync.Mutex

	db       *sql.DB
	lockName string
	lockID   int64 // Deterministic 64-bit lock identifier

	conn   *sql.Conn
	locked bool

	// Health monitoring
	healthCtx       context.Context
	healthCancel    context.CancelFunc
	healthInterval  time.Duration
	lastHealthCheck time.Time

	// Context cleanup registration
	cleanupRegistered bool
}

// NewDatabaseLockHelper creates a new advisory lock helper for the given
// database connection pool and lock name. The lock ID is computed
// deterministically using FNV-1a hashing to minimize collisions.
func NewDatabaseLockHelper(db *sql.DB, lockName string) *DatabaseLockHelper {
	return &DatabaseLockHelper{
		db:             db,
		lockName:       lockName,
		lockID:         computeLockID(lockName),
		healthInterval: 30 * time.Second, // Default health check interval
	}
}

// computeLockID generates a deterministic 64-bit lock identifier from a
// lock name using FNV-1a hashing. This ensures stable mapping across
// process restarts and deployments.
func computeLockID(name string) int64 {
	hasher := fnv.New64a()
	hasher.Write([]byte(name))
	// Convert to int64 for pg_advisory_lock which expects bigint
	return int64(hasher.Sum64())
}

// SetHealthCheckInterval configures the interval for background health checks.
// Must be called before AcquireLock. Zero disables health monitoring.
func (h *DatabaseLockHelper) SetHealthCheckInterval(interval time.Duration) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.healthInterval = interval
}

// AcquireLock attempts to acquire the PostgreSQL advisory lock with configurable
// retries and linear backoff. The lock is session-scoped and must be explicitly
// released via ReleaseLock or context cancellation.
//
// Parameters:
//   - ctx: Controls cancellation and timeout. Lock auto-releases on context done.
//   - maxRetries: Maximum retry attempts (0 means try once, no retries).
//
// Returns nil on success, or a joined error chain preserving all root causes.
func (h *DatabaseLockHelper) AcquireLock(ctx context.Context, maxRetries int) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Prevent double acquisition
	if h.locked {
		return ErrAlreadyLocked
	}

	// Check context before any work
	if err := ctx.Err(); err != nil {
		return err
	}

	// Verify database is available
	if h.db == nil {
		return fmt.Errorf("database connection pool is nil")
	}

	// Acquire a dedicated connection for this lock
	conn, err := h.db.Conn(ctx)
	if err != nil {
		return fmt.Errorf("failed to acquire connection: %w", err)
	}

	// Attempt to acquire the lock with retries
	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		// Check context before each attempt
		if err := ctx.Err(); err != nil {
			conn.Close()
			if lastErr != nil {
				return errors.Join(lastErr, err, fmt.Errorf("context cancelled after %d attempts", attempt))
			}
			return err
		}

		// Try to acquire the lock (non-blocking with pg_try_advisory_lock for retries,
		// or blocking with pg_advisory_lock on final attempt)
		if attempt < maxRetries {
			// Use try variant for non-final attempts
			acquired, tryErr := h.tryLock(ctx, conn)
			if tryErr != nil {
				lastErr = errors.Join(lastErr, fmt.Errorf("attempt %d: %w", attempt+1, tryErr))
			} else if acquired {
				h.conn = conn
				h.locked = true
				h.registerContextCleanup(ctx)
				h.startHealthMonitor(ctx)
				return nil
			}
		} else {
			// Final attempt: use blocking lock
			if lockErr := h.execLock(ctx, conn); lockErr != nil {
				lastErr = errors.Join(lastErr, fmt.Errorf("attempt %d: %w", attempt+1, lockErr))
			} else {
				h.conn = conn
				h.locked = true
				h.registerContextCleanup(ctx)
				h.startHealthMonitor(ctx)
				return nil
			}
		}

		// Backoff before next retry (linear: attempt * 100ms)
		if attempt < maxRetries {
			backoff := time.Duration((attempt+1)*100) * time.Millisecond
			select {
			case <-ctx.Done():
				conn.Close()
				return errors.Join(lastErr, ctx.Err(), fmt.Errorf("context cancelled during backoff after %d attempts", attempt+1))
			case <-time.After(backoff):
				// Continue to next attempt
			}
		}
	}

	// All attempts exhausted
	conn.Close()
	return errors.Join(lastErr, fmt.Errorf("exhausted %d retries for lock %q", maxRetries, h.lockName))
}

// tryLock attempts a non-blocking lock acquisition.
// Returns (true, nil) if lock acquired, (false, nil) if lock unavailable,
// or (false, error) on database error.
func (h *DatabaseLockHelper) tryLock(ctx context.Context, conn *sql.Conn) (bool, error) {
	var acquired bool
	err := conn.QueryRowContext(ctx, "SELECT pg_try_advisory_lock($1)", h.lockID).Scan(&acquired)
	if err != nil {
		return false, fmt.Errorf("pg_try_advisory_lock: %w", err)
	}
	return acquired, nil
}

// execLock executes a blocking lock acquisition.
func (h *DatabaseLockHelper) execLock(ctx context.Context, conn *sql.Conn) error {
	_, err := conn.ExecContext(ctx, "SELECT pg_advisory_lock($1)", h.lockID)
	if err != nil {
		return fmt.Errorf("pg_advisory_lock: %w", err)
	}
	return nil
}

// registerContextCleanup schedules automatic lock release when context is done.
// Only registered once per lock acquisition to prevent goroutine leaks.
func (h *DatabaseLockHelper) registerContextCleanup(ctx context.Context) {
	if h.cleanupRegistered {
		return
	}
	h.cleanupRegistered = true

	context.AfterFunc(ctx, func() {
		h.ReleaseLock(context.Background()) // Use background context for cleanup
	})
}

// startHealthMonitor begins background health monitoring if interval > 0.
// Health checks validate connection liveness without interfering with normal operation.
func (h *DatabaseLockHelper) startHealthMonitor(ctx context.Context) {
	if h.healthInterval <= 0 {
		return
	}

	h.healthCtx, h.healthCancel = context.WithCancel(ctx)
	h.lastHealthCheck = time.Now()

	go h.healthLoop()
}

// healthLoop runs periodic health checks on the lock connection.
func (h *DatabaseLockHelper) healthLoop() {
	ticker := time.NewTicker(h.healthInterval)
	defer ticker.Stop()

	for {
		select {
		case <-h.healthCtx.Done():
			return
		case <-ticker.C:
			h.checkHealth()
		}
	}
}

// checkHealth validates connection liveness with a lightweight query.
func (h *DatabaseLockHelper) checkHealth() {
	h.mu.Lock()
	defer h.mu.Unlock()

	if !h.locked || h.conn == nil {
		return
	}

	// Use a short timeout for health checks to avoid blocking
	ctx, cancel := context.WithTimeout(h.healthCtx, 5*time.Second)
	defer cancel()

	var result int
	err := h.conn.QueryRowContext(ctx, "SELECT 1").Scan(&result)
	if err != nil {
		// Connection is unhealthy - mark lock as potentially invalid
		// Note: We don't auto-release here as it could cause issues;
		// the caller should handle this via context cancellation
		return
	}

	h.lastHealthCheck = time.Now()
}

// IsHealthy returns true if the lock is held and the connection is healthy.
// A connection is considered healthy if the last health check was within
// 2x the health interval.
func (h *DatabaseLockHelper) IsHealthy() bool {
	h.mu.Lock()
	defer h.mu.Unlock()

	if !h.locked || h.conn == nil {
		return false
	}

	if h.healthInterval <= 0 {
		// No health monitoring configured, assume healthy if locked
		return true
	}

	return time.Since(h.lastHealthCheck) < 2*h.healthInterval
}

// IsLocked returns whether the lock is currently held.
func (h *DatabaseLockHelper) IsLocked() bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.locked
}

// LockID returns the computed lock identifier for debugging purposes.
func (h *DatabaseLockHelper) LockID() int64 {
	return h.lockID
}

// ReleaseLock explicitly releases the PostgreSQL advisory lock and closes
// the dedicated connection. This is idempotent - calling on an already
// released lock returns ErrLockNotHeld.
//
// The provided context controls the timeout for the unlock operation.
func (h *DatabaseLockHelper) ReleaseLock(ctx context.Context) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	return h.releaseLockedUnsafe(ctx)
}

// releaseLockedUnsafe releases the lock without acquiring the mutex.
// Caller must hold h.mu.
func (h *DatabaseLockHelper) releaseLockedUnsafe(ctx context.Context) error {
	if !h.locked {
		return ErrLockNotHeld
	}

	// Stop health monitoring
	if h.healthCancel != nil {
		h.healthCancel()
		h.healthCancel = nil
	}

	var errs error

	// Release the advisory lock
	if h.conn != nil {
		_, err := h.conn.ExecContext(ctx, "SELECT pg_advisory_unlock($1)", h.lockID)
		if err != nil {
			errs = errors.Join(errs, fmt.Errorf("pg_advisory_unlock: %w", err))
		}

		// Always close the connection
		if closeErr := h.conn.Close(); closeErr != nil {
			errs = errors.Join(errs, fmt.Errorf("connection close: %w", closeErr))
		}
		h.conn = nil
	}

	// Reset state
	h.locked = false
	h.cleanupRegistered = false

	return errs
}

// Close releases the lock if held and cleans up resources.
// This is a convenience method for defer patterns.
func (h *DatabaseLockHelper) Close() error {
	return h.ReleaseLock(context.Background())
}
