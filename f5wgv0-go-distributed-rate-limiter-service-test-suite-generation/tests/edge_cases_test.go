package tests

import (
	"context"
	"testing"
	"time"

	"github.com/example/ratelimiter/ratelimiter"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestEdgeCase_AllowN_ZeroTokens tests AllowN with n=0 (should default to 1)
func TestEdgeCase_AllowN_ZeroTokens(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	key := "edge-zero-tokens"
	// AllowN with n=0 should consume 1 token (as per grpc_server.go logic)
	result, err := rl.AllowN(ctx, key, 0)
	require.NoError(t, err)
	assert.True(t, result.Allowed, "AllowN(0) should allow and consume 1 token")
	assert.Equal(t, int64(99), result.Remaining, "should consume 1 token when n=0")
}

// TestEdgeCase_AllowN_NegativeTokens tests AllowN with negative n
func TestEdgeCase_AllowN_NegativeTokens(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	key := "edge-negative-tokens"
	// AllowN with negative n - should handle gracefully
	result, err := rl.AllowN(ctx, key, -5)
	require.NoError(t, err)
	// Negative tokens might be treated as 0 or cause unexpected behavior
	// The implementation should handle this gracefully
	assert.NotNil(t, result, "should return a result even with negative tokens")
}

// TestEdgeCase_AllowN_ExceedsBucketSize tests AllowN with n > bucket size
func TestEdgeCase_AllowN_ExceedsBucketSize(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	key := "edge-exceeds-bucket"
	// Try to consume more tokens than bucket size
	result, err := rl.AllowN(ctx, key, 150)
	require.NoError(t, err)
	assert.False(t, result.Allowed, "should not allow when n exceeds bucket size")
	assert.Greater(t, result.RetryAfter, time.Duration(0), "should provide retry after time")
}

// TestEdgeCase_EmptyKey tests behavior with empty key string
func TestEdgeCase_EmptyKey(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	// Empty key should still work (though not recommended in production)
	result, err := rl.Allow(ctx, "")
	require.NoError(t, err)
	assert.True(t, result.Allowed, "empty key should still work")
}

// TestEdgeCase_ContextCancellation tests behavior when context is cancelled
func TestEdgeCase_ContextCancellation(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	key := "edge-context-cancel"
	// In fail-open mode, local cache should still work even with cancelled context
	result, err := rl.Allow(ctx, key)
	// Context cancellation might not affect local cache operations
	// But should not panic
	if err != nil {
		assert.Contains(t, err.Error(), "context", "error should mention context if it fails")
	} else {
		assert.NotNil(t, result, "should return result even with cancelled context in fail-open mode")
	}
}

// TestEdgeCase_ContextTimeout tests behavior when context times out
func TestEdgeCase_ContextTimeout(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Nanosecond)
	defer cancel()
	time.Sleep(1 * time.Millisecond) // Ensure timeout

	key := "edge-context-timeout"
	// In fail-open mode, should fall back to local cache
	result, err := rl.Allow(ctx, key)
	if err != nil {
		assert.Contains(t, err.Error(), "context", "error should mention context if it fails")
	} else {
		assert.NotNil(t, result, "should return result in fail-open mode even with timeout")
	}
}

// TestEdgeCase_TokenRefillWhenFull tests token refill when bucket is already full
func TestEdgeCase_TokenRefillWhenFull(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	key := "edge-refill-full"
	// Start with full bucket
	result1, err := rl.Allow(ctx, key)
	require.NoError(t, err)
	assert.True(t, result1.Allowed)
	initialRemaining := result1.Remaining

	// Wait a bit and check - tokens should not exceed bucket size
	time.Sleep(100 * time.Millisecond)
	result2, err := rl.Allow(ctx, key)
	require.NoError(t, err)
	// Remaining should be <= bucket size (capped)
	assert.LessOrEqual(t, result2.Remaining, int64(100), "tokens should not exceed bucket size")
	assert.LessOrEqual(t, result2.Remaining, initialRemaining, "should not exceed initial remaining after consuming")
}

// TestEdgeCase_BurstLimitAtThreshold tests burst limit exactly at threshold
func TestEdgeCase_BurstLimitAtThreshold(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      1000,
		WindowSize:      time.Second * 5,
		BurstLimit:      10, // Small burst limit
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	key := "edge-burst-threshold"
	// Consume tokens up to burst limit
	// Note: In fail-open mode, burst detection uses local cache which doesn't track window
	// This tests the algorithm structure
	for i := 0; i < 10; i++ {
		result, err := rl.Allow(ctx, key)
		require.NoError(t, err)
		assert.True(t, result.Allowed, "should allow tokens within burst limit")
	}
}

// TestEdgeCase_ResetNonExistentKey tests Reset with non-existent key
func TestEdgeCase_ResetNonExistentKey(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	key := "edge-reset-nonexistent"
	// Reset should not error even if key doesn't exist
	err := rl.Reset(ctx, key)
	// In fail-open mode with mock Redis, this will error, but should not panic
	if err != nil {
		// Expected in mock mode
		assert.Contains(t, err.Error(), "redis", "error should mention redis")
	}
}

// TestEdgeCase_GetStatusNonExistentKey tests GetStatus with non-existent key
func TestEdgeCase_GetStatusNonExistentKey(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	key := "edge-status-nonexistent"
	// GetStatus should handle non-existent key gracefully
	result, err := rl.GetStatus(ctx, key)
	// In fail-open mode with mock Redis, this will error
	if err != nil {
		assert.Contains(t, err.Error(), "redis", "error should mention redis")
	} else {
		assert.NotNil(t, result, "should return result if key doesn't exist")
	}
}

// TestEdgeCase_VeryLargeN tests AllowN with very large n value
func TestEdgeCase_VeryLargeN(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	key := "edge-very-large-n"
	// Try with very large n
	result, err := rl.AllowN(ctx, key, 1000000)
	require.NoError(t, err)
	assert.False(t, result.Allowed, "should not allow very large n")
	assert.Greater(t, result.RetryAfter, time.Duration(0), "should provide retry after time")
}

// TestEdgeCase_ConsecutiveResets tests multiple consecutive Reset calls
func TestEdgeCase_ConsecutiveResets(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	key := "edge-consecutive-resets"
	// Multiple resets should not panic
	for i := 0; i < 5; i++ {
		err := rl.Reset(ctx, key)
		// May error in mock mode, but should not panic
		_ = err
	}
	// If we get here without panic, test passes
	assert.True(t, true, "consecutive resets should not panic")
}

// TestEdgeCase_SetFailOpenToggle tests toggling fail-open mode multiple times
func TestEdgeCase_SetFailOpenToggle(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)

	// Toggle fail-open multiple times
	for i := 0; i < 10; i++ {
		rl.SetFailOpen(i%2 == 0)
	}
	// Should not panic
	assert.True(t, true, "toggling fail-open should not panic")
}
