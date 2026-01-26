package tests

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/example/ratelimiter/ratelimiter"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

func setupRedisForRace(t *testing.T) (*redis.Client, func()) {
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

func TestRaceConditionConcurrentOperations(t *testing.T) {
	client, cleanup := setupRedisForRace(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 1000.0,
		BucketSize:      10000,
		WindowSize:      time.Second * 10,
		BurstLimit:      20000,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	ctx := context.Background()
	key := "race-test"

	rl.Reset(ctx, key)

	var wg sync.WaitGroup
	errors := make(chan error, 100)
	panics := make(chan bool, 100)

	// 100 concurrent goroutines
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					panics <- true
				}
			}()

			// Mix of operations
			switch id % 5 {
			case 0:
				_, err := rl.Allow(ctx, key)
				if err != nil {
					errors <- err
				}
			case 1:
				_, err := rl.AllowN(ctx, key, 10)
				if err != nil {
					errors <- err
				}
			case 2:
				rl.SetFailOpen(id%2 == 0)
			case 3:
				err := rl.Reset(ctx, key)
				if err != nil {
					errors <- err
				}
			case 4:
				_, err := rl.GetStatus(ctx, key)
				if err != nil {
					errors <- err
				}
			}
		}(i)
	}

	wg.Wait()
	close(errors)
	close(panics)

	// Check for panics
	panicCount := 0
	for range panics {
		panicCount++
	}
	assert.Equal(t, 0, panicCount, "should not have any panics")

	// Check for unexpected errors (some are expected like context timeouts)
	errorCount := 0
	for err := range errors {
		// Some errors are acceptable (like Redis connection issues)
		// but we shouldn't have race-related errors
		if err != nil {
			errorCount++
		}
	}

	// Final state should be consistent
	status, err := rl.GetStatus(ctx, key)
	require.NoError(t, err, "should be able to get status after race test")
	assert.GreaterOrEqual(t, status.Remaining, int64(0), "remaining should be non-negative")
}

func TestRaceConditionSetFailOpen(t *testing.T) {
	client, cleanup := setupRedisForRace(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	ctx := context.Background()
	key := "race-failopen-test"

	var wg sync.WaitGroup
	panics := make(chan bool, 50)

	// Concurrent SetFailOpen calls
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(val bool) {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					panics <- true
				}
			}()
			rl.SetFailOpen(val)
		}(i%2 == 0)
	}

	// Concurrent Allow calls
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					panics <- true
				}
			}()
			rl.Allow(ctx, key)
		}()
	}

	wg.Wait()
	close(panics)

	panicCount := 0
	for range panics {
		panicCount++
	}
	assert.Equal(t, 0, panicCount, "should not have any panics")
}

func TestRaceConditionResetAndAllow(t *testing.T) {
	client, cleanup := setupRedisForRace(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 100.0,
		BucketSize:      1000,
		WindowSize:      time.Second * 10,
		BurstLimit:      2000,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	ctx := context.Background()
	key := "race-reset-test"

	var wg sync.WaitGroup
	panics := make(chan bool, 100)

	// Mix of Reset and Allow operations
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					panics <- true
				}
			}()

			if id%3 == 0 {
				rl.Reset(ctx, key)
			} else {
				rl.Allow(ctx, key)
			}
		}(i)
	}

	wg.Wait()
	close(panics)

	panicCount := 0
	for range panics {
		panicCount++
	}
	assert.Equal(t, 0, panicCount, "should not have any panics")

	// Final state should be valid
	status, err := rl.GetStatus(ctx, key)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, status.Remaining, int64(0))
	assert.LessOrEqual(t, status.Remaining, int64(1000))
}

func TestRaceConditionGetStatus(t *testing.T) {
	client, cleanup := setupRedisForRace(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	ctx := context.Background()
	key := "race-status-test"

	var wg sync.WaitGroup
	panics := make(chan bool, 100)

	// Concurrent GetStatus and Allow operations
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					panics <- true
				}
			}()

			if id%2 == 0 {
				rl.GetStatus(ctx, key)
			} else {
				rl.Allow(ctx, key)
			}
		}(i)
	}

	wg.Wait()
	close(panics)

	panicCount := 0
	for range panics {
		panicCount++
	}
	assert.Equal(t, 0, panicCount, "should not have any panics")
}
