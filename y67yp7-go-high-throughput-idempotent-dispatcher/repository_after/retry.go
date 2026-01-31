package dispatcher

import (
	"math"
	"math/rand"
	"time"
)

// RetryConfig holds the configuration for retry behavior
type RetryConfig struct {
	// InitialBackoff is the initial wait time before first retry
	InitialBackoff time.Duration
	// MaxBackoff is the maximum wait time between retries
	MaxBackoff time.Duration
	// MaxRetries is the maximum number of retry attempts before Dead Letter
	MaxRetries int
	// JitterPercent is the percentage of jitter to apply (0-100)
	JitterPercent float64
}

// DefaultRetryConfig returns the default retry configuration
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		InitialBackoff: 1 * time.Second,
		MaxBackoff:     60 * time.Second,
		MaxRetries:     5,
		JitterPercent:  10.0,
	}
}

// RetryPolicy implements exponential backoff with jitter
type RetryPolicy struct {
	config RetryConfig
	rng    *rand.Rand
}

// NewRetryPolicy creates a new retry policy with the given configuration
func NewRetryPolicy(config RetryConfig) *RetryPolicy {
	return &RetryPolicy{
		config: config,
		rng:    rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// CalculateNextRetry calculates the next retry time based on the current retry count
// Returns (nextRetryTime, shouldRetry)
func (r *RetryPolicy) CalculateNextRetry(retryCount int) (time.Time, bool) {
	if retryCount >= r.config.MaxRetries {
		return time.Time{}, false
	}

	// Exponential backoff: initialBackoff * 2^retryCount
	backoffSeconds := float64(r.config.InitialBackoff.Seconds()) * math.Pow(2, float64(retryCount))

	// Cap at maximum backoff
	maxBackoffSeconds := r.config.MaxBackoff.Seconds()
	if backoffSeconds > maxBackoffSeconds {
		backoffSeconds = maxBackoffSeconds
	}

	// Apply jitter: ±JitterPercent%
	jitterRange := backoffSeconds * (r.config.JitterPercent / 100.0)
	jitter := (r.rng.Float64()*2 - 1) * jitterRange // Random value between -jitterRange and +jitterRange
	backoffSeconds += jitter

	// Ensure we don't go negative
	if backoffSeconds < 0 {
		backoffSeconds = float64(r.config.InitialBackoff.Seconds())
	}

	return time.Now().Add(time.Duration(backoffSeconds * float64(time.Second))), true
}

// ShouldRetry returns true if the event should be retried based on its retry count
func (r *RetryPolicy) ShouldRetry(retryCount int) bool {
	return retryCount < r.config.MaxRetries
}

// GetMaxRetries returns the maximum number of retries configured
func (r *RetryPolicy) GetMaxRetries() int {
	return r.config.MaxRetries
}
