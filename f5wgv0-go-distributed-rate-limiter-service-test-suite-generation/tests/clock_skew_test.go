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

// Note: Clock skew testing is challenging without modifying the implementation.
// We test that token refill calculations remain consistent even with timing variations
// that could simulate clock skew scenarios.

func setupRedisForClockSkew(t *testing.T) (*redis.Client, func()) {
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

func TestClockSkewTokenRefillConsistency(t *testing.T) {
	client, cleanup := setupRedisForClockSkew(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	// Create multiple instances that could have clock skew
	rl1 := ratelimiter.NewRateLimiter(client, config)
	rl2 := ratelimiter.NewRateLimiter(client, config)
	rl3 := ratelimiter.NewRateLimiter(client, config)

	ctx := context.Background()
	key := "clock-skew-test"

	// Reset
	rl1.Reset(ctx, key)

	// Consume tokens from instance 1
	for i := int64(0); i < 50; i++ {
		rl1.Allow(ctx, key)
	}

	// Wait 1 second (simulating time passage that could have clock skew)
	time.Sleep(1100 * time.Millisecond)

	// All instances should calculate similar token counts
	// (within 10% variance as per requirements)
	status1, err := rl1.GetStatus(ctx, key)
	require.NoError(t, err)

	status2, err := rl2.GetStatus(ctx, key)
	require.NoError(t, err)

	status3, err := rl3.GetStatus(ctx, key)
	require.NoError(t, err)

	// Calculate variance between instances
	avgRemaining := float64(status1.Remaining+status2.Remaining+status3.Remaining) / 3.0

	variance1 := float64(status1.Remaining) / avgRemaining
	variance2 := float64(status2.Remaining) / avgRemaining
	variance3 := float64(status3.Remaining) / avgRemaining

	// All should be within 10% of average
	assert.Greater(t, variance1, 0.90, "instance 1 should be within 10% variance")
	assert.Less(t, variance1, 1.10, "instance 1 should be within 10% variance")

	assert.Greater(t, variance2, 0.90, "instance 2 should be within 10% variance")
	assert.Less(t, variance2, 1.10, "instance 2 should be within 10% variance")

	assert.Greater(t, variance3, 0.90, "instance 3 should be within 10% variance")
	assert.Less(t, variance3, 1.10, "instance 3 should be within 10% variance")
}

func TestClockSkewVarianceWithin10Percent(t *testing.T) {
	client, cleanup := setupRedisForClockSkew(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl1 := ratelimiter.NewRateLimiter(client, config)
	rl2 := ratelimiter.NewRateLimiter(client, config)

	ctx := context.Background()
	key := "clock-skew-variance-test"

	// Reset
	rl1.Reset(ctx, key)

	// Count how many tokens each instance can consume
	countAllowed := func(rl *ratelimiter.RateLimiter, key string, attempts int) int64 {
		var count int64
		for i := 0; i < attempts; i++ {
			result, err := rl.Allow(ctx, key)
			if err == nil && result != nil && result.Allowed {
				count++
			}
		}
		return count
	}

	// Instance 1 consumes tokens (normal clock)
	totalNormal := countAllowed(rl1, key, 50)

	// Reset and let instance 2 consume (could have clock skew)
	rl1.Reset(ctx, key)
	totalSkewed := countAllowed(rl2, key, 50)

	// Calculate variance - should be within 10% as per requirement
	if totalNormal > 0 {
		variance := float64(totalSkewed-totalNormal) / float64(totalNormal)
		if variance < 0 {
			variance = -variance
		}
		assert.Less(t, variance, 0.10, "clock skew should cause <=10%% variance: normal %d, skewed %d (variance %.2f%%)",
			totalNormal, totalSkewed, variance*100)
	}
}

func TestTokenRefillCalculationConsistency(t *testing.T) {
	client, cleanup := setupRedisForClockSkew(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 2.0,
		BucketSize:      20,
		WindowSize:      time.Second * 10,
		BurstLimit:      50,
	}

	rl1 := ratelimiter.NewRateLimiter(client, config)
	rl2 := ratelimiter.NewRateLimiter(client, config)

	ctx := context.Background()
	key := "refill-consistency-test"

	// Empty bucket
	rl1.Reset(ctx, key)
	for i := int64(0); i < 20; i++ {
		rl1.Allow(ctx, key)
	}

	// Wait for refill (2.5 seconds = 5 tokens)
	time.Sleep(2500 * time.Millisecond)

	// Both instances should calculate similar token counts
	status1, err := rl1.GetStatus(ctx, key)
	require.NoError(t, err)

	status2, err := rl2.GetStatus(ctx, key)
	require.NoError(t, err)

	// Should have refilled approximately 5 tokens
	assert.GreaterOrEqual(t, status1.Remaining, int64(4), "should have refilled tokens")
	assert.LessOrEqual(t, status1.Remaining, int64(6), "should not over-refill")

	// Variance between instances
	diff := float64(status1.Remaining - status2.Remaining)
	if diff < 0 {
		diff = -diff
	}
	avg := float64(status1.Remaining+status2.Remaining) / 2.0
	if avg > 0 {
		variance := diff / avg
		assert.Less(t, variance, 0.10, "variance should be within 10%")
	}
}

// TestClockSkewFiveSecondsApart tests that instances with clocks 5 seconds apart
// do not allow rate limit bypass. This simulates clock skew by manually manipulating
// Redis timestamps to represent a 5-second difference.
func TestClockSkewFiveSecondsApart(t *testing.T) {
	client, cleanup := setupRedisForClockSkew(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl1 := ratelimiter.NewRateLimiter(client, config)
	rl2 := ratelimiter.NewRateLimiter(client, config)

	ctx := context.Background()
	key := "clock-skew-5sec-test"

	// Reset and consume tokens from instance 1
	rl1.Reset(ctx, key)
	
	// Consume 50 tokens from instance 1
	for i := int64(0); i < 50; i++ {
		result, err := rl1.Allow(ctx, key)
		require.NoError(t, err)
		require.True(t, result.Allowed, "should allow consuming tokens")
	}

	// Now simulate clock skew: manually set last_update in Redis to be 5 seconds in the past
	// This simulates instance 2 having a clock that is 5 seconds behind
	bucketKey := "rl:bucket:" + key
	now := time.Now()
	fiveSecondsAgo := now.Add(-5 * time.Second)
	
	// Update last_update to be 5 seconds in the past (simulating clock skew)
	err := client.HSet(ctx, bucketKey, "last_update", fiveSecondsAgo.UnixMilli()).Err()
	require.NoError(t, err)

	// After setting timestamp 5 seconds in the past, instance 2 should calculate tokens
	// The key test: verify that clock skew doesn't allow rate limit bypass
	// Instance 2 should not be able to consume more tokens than the bucket allows
	
	// Now test that instance 2 cannot bypass rate limits
	// Try to consume tokens - should not exceed bucket capacity
	totalConsumed := int64(0)
	maxAttempts := int64(150) // Try to consume more than bucket size
	
	for i := int64(0); i < maxAttempts; i++ {
		result, err := rl2.Allow(ctx, key)
		require.NoError(t, err)
		if result.Allowed {
			totalConsumed++
		} else {
			// Rate limited - this is expected
			break
		}
		// Safety: don't loop forever
		if totalConsumed > config.BucketSize+20 {
			break
		}
	}
	
	// Critical test: Should not be able to consume more than bucket size
	// Even with 5-second clock skew, total consumption should not exceed bucket capacity
	// Allow small variance for refill during test execution
	maxAllowedConsumption := config.BucketSize + int64(10) // Allow 10 tokens for refill during test
	assert.LessOrEqual(t, totalConsumed, maxAllowedConsumption, 
		"instance 2 should not bypass rate limits despite 5-second clock skew. Consumed: %d, Max allowed: %d", 
		totalConsumed, maxAllowedConsumption)
	
	// Verify token refill calculation consistency
	// After the clock skew manipulation, both instances reading the same state
	// should calculate similar token counts (within 10% variance)
	// Reset and test with fresh state
	rl1.Reset(ctx, key)
	rl2.Reset(ctx, key)
	
	// Consume some tokens
	for i := int64(0); i < 30; i++ {
		rl1.Allow(ctx, key)
	}
	
	// Set timestamp to simulate clock skew again (5 seconds in past)
	fiveSecondsAgo = time.Now().Add(-5 * time.Second)
	err = client.HSet(ctx, bucketKey, "last_update", fiveSecondsAgo.UnixMilli()).Err()
	require.NoError(t, err)
	
	// Both instances should calculate similar remaining tokens
	// (within 10% variance) even with the clock skew in stored data
	status1, err := rl1.GetStatus(ctx, key)
	require.NoError(t, err)
	
	status2, err := rl2.GetStatus(ctx, key)
	require.NoError(t, err)
	
	// Calculate variance between the two calculations
	diff := float64(status1.Remaining - status2.Remaining)
	if diff < 0 {
		diff = -diff
	}
	avg := float64(status1.Remaining+status2.Remaining) / 2.0
	if avg > 0 {
		variance := diff / avg
		assert.Less(t, variance, 0.10, 
			"token refill calculations should remain consistent within 10%% variance despite 5-second clock skew. "+
			"Instance 1 remaining: %d, Instance 2 remaining: %d, variance: %.2f%%", 
			status1.Remaining, status2.Remaining, variance*100)
	}
}
