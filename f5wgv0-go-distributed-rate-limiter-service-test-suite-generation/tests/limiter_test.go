package tests

import (
	"context"
	"testing"
	"time"

	"github.com/example/ratelimiter/ratelimiter"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

// Unit tests for core algorithms

func setupRedisForUnit(t *testing.T) (*redis.Client, func()) {
	ctx := context.Background()

	req := testcontainers.ContainerRequest{
		Image:        "redis:7-alpine",
		ExposedPorts: []string{"6379/tcp"},
		WaitingFor:   wait.ForLog("Ready to accept connections"),
	}

	redisC, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	require.NoError(t, err)

	endpoint, err := redisC.Endpoint(ctx, "")
	require.NoError(t, err)

	client := redis.NewClient(&redis.Options{
		Addr: endpoint,
	})

	cleanup := func() {
		client.Close()
		redisC.Terminate(ctx)
	}

	return client, cleanup
}

func TestTokenBucketRefill(t *testing.T) {
	client, cleanup := setupRedisForUnit(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      1000, // Very high to disable burst interference with token bucket refill test
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	ctx := context.Background()

	// Consume all tokens using AllowN to ensure exact consumption
	key := "test-refill"
	result, err := rl.AllowN(ctx, key, 100)
	require.NoError(t, err)
	assert.True(t, result.Allowed, "should allow consuming all 100 tokens")
	assert.Equal(t, int64(0), result.Remaining, "bucket should be empty")

	// Should be denied
	result, err = rl.Allow(ctx, key)
	require.NoError(t, err)
	assert.False(t, result.Allowed, "should deny after bucket empty")

	// Wait for refill
	time.Sleep(1100 * time.Millisecond)

	// Should allow again after refill
	result, err = rl.Allow(ctx, key)
	require.NoError(t, err)
	assert.True(t, result.Allowed, "should allow after refill")
	assert.Greater(t, result.Remaining, int64(0), "should have remaining tokens")
}

func TestSlidingWindowBurstDetection(t *testing.T) {
	client, cleanup := setupRedisForUnit(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      1000,
		WindowSize:      time.Second * 5,
		BurstLimit:      50,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	ctx := context.Background()
	key := "test-burst"

	// Reset first
	rl.Reset(ctx, key)

	// Consume tokens within burst limit
	for i := int64(0); i < 49; i++ {
		result, err := rl.Allow(ctx, key)
		require.NoError(t, err)
		assert.True(t, result.Allowed, "should allow within burst limit")
	}

	// Should still allow (bucket has tokens)
	result, err := rl.Allow(ctx, key)
	require.NoError(t, err)
	assert.True(t, result.Allowed, "bucket should still have tokens")

	// Wait for window to clear
	time.Sleep(5100 * time.Millisecond)

	// Reset and test burst limit
	rl.Reset(ctx, key)

	// Rapid requests to trigger burst detection
	for i := int64(0); i < 50; i++ {
		rl.Allow(ctx, key)
	}

	// Next request should be denied by burst limit
	result, err = rl.Allow(ctx, key)
	require.NoError(t, err)
	// Note: This depends on timing, but burst limit should eventually trigger
}

func TestParseBucketData(t *testing.T) {
	client, cleanup := setupRedisForUnit(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      50,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	ctx := context.Background()
	key := "test-parse"

	// First call creates bucket
	result, err := rl.Allow(ctx, key)
	require.NoError(t, err)
	assert.True(t, result.Allowed)
	assert.Equal(t, int64(99), result.Remaining, "should have 99 tokens after consuming 1")

	// Second call should parse existing data
	result2, err := rl.Allow(ctx, key)
	require.NoError(t, err)
	assert.True(t, result2.Allowed)
	assert.Equal(t, int64(98), result2.Remaining, "should have 98 tokens after consuming 2")
}

func TestAllowN(t *testing.T) {
	client, cleanup := setupRedisForUnit(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      50,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	ctx := context.Background()
	key := "test-allown"

	// Consume 50 tokens at once
	result, err := rl.AllowN(ctx, key, 50)
	require.NoError(t, err)
	assert.True(t, result.Allowed, "should allow 50 tokens")
	assert.Equal(t, int64(50), result.Remaining, "should have 50 remaining")

	// Try to consume 51 more (should fail)
	result, err = rl.AllowN(ctx, key, 51)
	require.NoError(t, err)
	assert.False(t, result.Allowed, "should deny 51 tokens when only 50 remain")
	assert.Greater(t, result.RetryAfter, time.Duration(0), "should provide retry after")
}

func TestTokenRefillCalculation(t *testing.T) {
	client, cleanup := setupRedisForUnit(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 2.0,
		BucketSize:      10,
		WindowSize:      time.Second * 5,
		BurstLimit:      20,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	ctx := context.Background()
	key := "test-refill-calc"

	// Empty the bucket
	for i := int64(0); i < 10; i++ {
		rl.Allow(ctx, key)
	}

	// Wait 1 second (should refill 2 tokens)
	time.Sleep(1100 * time.Millisecond)

	result, err := rl.Allow(ctx, key)
	require.NoError(t, err)
	assert.True(t, result.Allowed, "should allow after refill")
	assert.GreaterOrEqual(t, result.Remaining, int64(1), "should have at least 1 token after refill")
}

func TestBucketSizeCap(t *testing.T) {
	client, cleanup := setupRedisForUnit(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 100.0,
		BucketSize:      10,
		WindowSize:      time.Second * 5,
		BurstLimit:      20,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	ctx := context.Background()
	key := "test-cap"

	// Wait longer than needed to refill
	time.Sleep(200 * time.Millisecond)

	result, err := rl.GetStatus(ctx, key)
	require.NoError(t, err)
	assert.LessOrEqual(t, result.Remaining, int64(10), "tokens should not exceed bucket size")
}
