package tests

import (
	"context"
	"testing"
	"time"

	"github.com/example/ratelimiter/ratelimiter"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestFailOpenRedisUnavailable(t *testing.T) {
	// Create client pointing to non-existent Redis
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:9999", // Non-existent port
	})
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      50,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true) // Default, but explicit

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	key := "fail-open-test"

	// Should fall back to local cache
	result, err := rl.Allow(ctx, key)
	require.NoError(t, err, "fail-open should not return error")
	assert.True(t, result.Allowed, "should allow via local cache")
	assert.Greater(t, result.Remaining, int64(0), "should have remaining tokens in local cache")
}



func TestFailClosedRedisUnavailable(t *testing.T) {
	// Create client pointing to non-existent Redis
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:9999", // Non-existent port
	})
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      50,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(false) // Fail closed

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	key := "fail-closed-test"

	// Should return error
	result, err := rl.Allow(ctx, key)
	require.Error(t, err, "fail-closed should return error")
	assert.Nil(t, result, "result should be nil on error")
	assert.Contains(t, err.Error(), "rate limiter unavailable", "error should contain expected message")
}

func TestFailOpenLocalCacheIsolation(t *testing.T) {
	// Create client pointing to non-existent Redis
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:9999",
	})
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      50,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	key1 := "key1"
	key2 := "key2"

	// Each key should have independent local cache
	result1, err := rl.Allow(ctx, key1)
	require.NoError(t, err)
	assert.True(t, result1.Allowed)

	result2, err := rl.Allow(ctx, key2)
	require.NoError(t, err)
	assert.True(t, result2.Allowed)

	// Both should start with full bucket
	assert.Equal(t, int64(99), result1.Remaining)
	assert.Equal(t, int64(99), result2.Remaining)
}

func TestFailOpenConsumesFromLocalCache(t *testing.T) {
	// Create client pointing to non-existent Redis
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:9999",
	})
	defer client.Close()

	config := ratelimiter.Config{
		// FIX: Reduce refill rate to 1.0 to prevent race condition during test execution.
		// At 10.0, a 100ms delay in the test runner allows 1 token to refill, causing the test to flake.
		TokensPerSecond: 1.0, 
		BucketSize:      10,
		WindowSize:      time.Second * 10,
		BurstLimit:      50,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(true)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	key := "local-consume-test"

	// Consume all tokens exactly - use AllowN to consume exactly BucketSize tokens
	result, err := rl.AllowN(ctx, key, int64(config.BucketSize))
	require.NoError(t, err)
	assert.True(t, result.Allowed, "should allow consuming all bucket tokens")
	assert.Equal(t, int64(0), result.Remaining, "bucket should be empty after consuming all tokens")

	// Now bucket should be empty, verify denial
	result, err = rl.Allow(ctx, key)
	require.NoError(t, err)
	assert.False(t, result.Allowed, "should deny when local cache empty")
	assert.Equal(t, int64(0), result.Remaining)
}

func TestNetworkPartitionSimulation(t *testing.T) {
	// Use a valid address but simulate partition by using wrong port
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:9998",
	})
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      50,
	}

	rl := ratelimiter.NewRateLimiter(client, config)

	// Test fail-open behavior
	rl.SetFailOpen(true)
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	key := "partition-test"
	result, err := rl.Allow(ctx, key)
	require.NoError(t, err, "should handle partition gracefully in fail-open mode")
	assert.True(t, result.Allowed, "should allow via local cache during partition")

	// Test fail-closed behavior
	rl.SetFailOpen(false)
	ctx2, cancel2 := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel2()

	result2, err2 := rl.Allow(ctx2, key)
	require.Error(t, err2, "should return error in fail-closed mode")
	assert.Nil(t, result2)
}
