package tests

import (
	"context"
	"testing"
	"time"

	"github.com/example/ratelimiter/proto"
	"github.com/example/ratelimiter/ratelimiter"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func setupRedisForGRPC(t *testing.T) (*redis.Client, func()) {
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

func TestGRPCCheckRateLimit(t *testing.T) {
	client, cleanup := setupRedisForGRPC(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	limiter := ratelimiter.NewRateLimiter(client, config)
	server := ratelimiter.NewGRPCServer(limiter)
	ctx := context.Background()

	// Valid request
	req := &proto.RateLimitRequest{
		Key:    "grpc-test",
		Tokens: 1,
	}

	resp, err := server.CheckRateLimit(ctx, req)
	require.NoError(t, err)
	assert.True(t, resp.Allowed)
	assert.Greater(t, resp.Remaining, int64(0))

	// Empty key should fail
	req2 := &proto.RateLimitRequest{
		Key:    "",
		Tokens: 1,
	}

	resp2, err2 := server.CheckRateLimit(ctx, req2)
	require.Error(t, err2)
	assert.Nil(t, resp2)
	st, ok := status.FromError(err2)
	require.True(t, ok)
	assert.Equal(t, codes.InvalidArgument, st.Code())
}

func TestGRPCResetRateLimit(t *testing.T) {
	client, cleanup := setupRedisForGRPC(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	limiter := ratelimiter.NewRateLimiter(client, config)
	server := ratelimiter.NewGRPCServer(limiter)
	ctx := context.Background()

	// Consume some tokens first
	req1 := &proto.RateLimitRequest{
		Key:    "grpc-reset-test",
		Tokens: 50,
	}
	server.CheckRateLimit(ctx, req1)

	// Reset
	resetReq := &proto.ResetRequest{
		Key: "grpc-reset-test",
	}

	resetResp, err := server.ResetRateLimit(ctx, resetReq)
	require.NoError(t, err)
	assert.True(t, resetResp.Success)

	// Should have full bucket after reset
	req2 := &proto.RateLimitRequest{
		Key:    "grpc-reset-test",
		Tokens: 1,
	}
	resp2, err2 := server.CheckRateLimit(ctx, req2)
	require.NoError(t, err2)
	assert.True(t, resp2.Allowed)
	assert.Equal(t, int64(99), resp2.Remaining)

	// Empty key should fail
	resetReq2 := &proto.ResetRequest{
		Key: "",
	}
	resetResp2, err3 := server.ResetRateLimit(ctx, resetReq2)
	require.Error(t, err3)
	assert.Nil(t, resetResp2)
}

func TestGRPCGetStatus(t *testing.T) {
	client, cleanup := setupRedisForGRPC(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	limiter := ratelimiter.NewRateLimiter(client, config)
	server := ratelimiter.NewGRPCServer(limiter)
	ctx := context.Background()

	// Get status for new key
	statusReq := &proto.StatusRequest{
		Key: "grpc-status-test",
	}

	statusResp, err := server.GetStatus(ctx, statusReq)
	require.NoError(t, err)
	assert.True(t, statusResp.Allowed)
	assert.Equal(t, int64(100), statusResp.Remaining)

	// Empty key should fail
	statusReq2 := &proto.StatusRequest{
		Key: "",
	}
	statusResp2, err2 := server.GetStatus(ctx, statusReq2)
	require.Error(t, err2)
	assert.Nil(t, statusResp2)
}

func TestGRPCTokensZeroDefaultsToOne(t *testing.T) {
	client, cleanup := setupRedisForGRPC(t)
	defer cleanup()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	limiter := ratelimiter.NewRateLimiter(client, config)
	server := ratelimiter.NewGRPCServer(limiter)
	ctx := context.Background()

	// Request with 0 tokens should default to 1
	req := &proto.RateLimitRequest{
		Key:    "grpc-zero-test",
		Tokens: 0,
	}

	resp, err := server.CheckRateLimit(ctx, req)
	require.NoError(t, err)
	assert.True(t, resp.Allowed)
	assert.Equal(t, int64(99), resp.Remaining, "should consume 1 token")
}
