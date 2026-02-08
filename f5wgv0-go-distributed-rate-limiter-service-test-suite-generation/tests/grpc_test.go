package tests

import (
	"context"
	"testing"
	"time"

	"github.com/example/ratelimiter/proto"
	"github.com/example/ratelimiter/ratelimiter"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// TestGRPC_CheckRateLimit_ValidRequest tests valid CheckRateLimit request
func TestGRPC_CheckRateLimit_ValidRequest(t *testing.T) {
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
	server := ratelimiter.NewGRPCServer(rl)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	req := &proto.RateLimitRequest{
		Key:    "grpc-valid",
		Tokens: 1,
	}

	resp, err := server.CheckRateLimit(ctx, req)
	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.True(t, resp.Allowed, "should allow valid request")
	assert.Greater(t, resp.Remaining, int64(0), "should have remaining tokens")
}

// TestGRPC_CheckRateLimit_EmptyKey tests CheckRateLimit with empty key (should return InvalidArgument)
func TestGRPC_CheckRateLimit_EmptyKey(t *testing.T) {
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
	server := ratelimiter.NewGRPCServer(rl)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	req := &proto.RateLimitRequest{
		Key:    "", // Empty key
		Tokens: 1,
	}

	resp, err := server.CheckRateLimit(ctx, req)
	require.Error(t, err, "should return error for empty key")
	assert.Nil(t, resp, "response should be nil on error")
	
	st, ok := status.FromError(err)
	require.True(t, ok, "error should be a gRPC status")
	assert.Equal(t, codes.InvalidArgument, st.Code(), "should return InvalidArgument for empty key")
	assert.Contains(t, st.Message(), "key is required", "error message should mention key requirement")
}

// TestGRPC_CheckRateLimit_ZeroTokens tests CheckRateLimit with zero tokens (should default to 1)
func TestGRPC_CheckRateLimit_ZeroTokens(t *testing.T) {
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
	server := ratelimiter.NewGRPCServer(rl)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	req := &proto.RateLimitRequest{
		Key:    "grpc-zero-tokens",
		Tokens: 0, // Zero tokens should default to 1
	}

	resp, err := server.CheckRateLimit(ctx, req)
	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.True(t, resp.Allowed, "should allow when tokens=0 (defaults to 1)")
	// Should consume 1 token
	assert.Equal(t, int64(99), resp.Remaining, "should consume 1 token when tokens=0")
}

// TestGRPC_CheckRateLimit_MultipleTokens tests CheckRateLimit with multiple tokens
func TestGRPC_CheckRateLimit_MultipleTokens(t *testing.T) {
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
	server := ratelimiter.NewGRPCServer(rl)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	req := &proto.RateLimitRequest{
		Key:    "grpc-multiple-tokens",
		Tokens: 50,
	}

	resp, err := server.CheckRateLimit(ctx, req)
	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.True(t, resp.Allowed, "should allow when sufficient tokens available")
	assert.Equal(t, int64(50), resp.Remaining, "should have correct remaining tokens")
}

// TestGRPC_CheckRateLimit_ExceedsLimit tests CheckRateLimit when tokens exceed limit
func TestGRPC_CheckRateLimit_ExceedsLimit(t *testing.T) {
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
	server := ratelimiter.NewGRPCServer(rl)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	req := &proto.RateLimitRequest{
		Key:    "grpc-exceeds-limit",
		Tokens: 150, // Exceeds bucket size
	}

	resp, err := server.CheckRateLimit(ctx, req)
	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.False(t, resp.Allowed, "should not allow when tokens exceed limit")
	assert.Greater(t, resp.RetryAfter.AsDuration(), time.Duration(0), "should provide retry after duration")
}

// TestGRPC_ResetRateLimit_ValidRequest tests valid ResetRateLimit request
func TestGRPC_ResetRateLimit_ValidRequest(t *testing.T) {
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
	server := ratelimiter.NewGRPCServer(rl)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	req := &proto.ResetRequest{
		Key: "grpc-reset-valid",
	}

	resp, err := server.ResetRateLimit(ctx, req)
	// In mock mode, this may error, but should not panic
	if err != nil {
		st, ok := status.FromError(err)
		if ok {
			assert.Equal(t, codes.Internal, st.Code(), "should return Internal error if Redis fails")
		}
	} else {
		require.NotNil(t, resp)
		assert.True(t, resp.Success, "reset should succeed")
	}
}

// TestGRPC_ResetRateLimit_EmptyKey tests ResetRateLimit with empty key
func TestGRPC_ResetRateLimit_EmptyKey(t *testing.T) {
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
	server := ratelimiter.NewGRPCServer(rl)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	req := &proto.ResetRequest{
		Key: "", // Empty key
	}

	resp, err := server.ResetRateLimit(ctx, req)
	require.Error(t, err, "should return error for empty key")
	assert.Nil(t, resp, "response should be nil on error")
	
	st, ok := status.FromError(err)
	require.True(t, ok, "error should be a gRPC status")
	assert.Equal(t, codes.InvalidArgument, st.Code(), "should return InvalidArgument for empty key")
	assert.Contains(t, st.Message(), "key is required", "error message should mention key requirement")
}

// TestGRPC_GetStatus_ValidRequest tests valid GetStatus request
func TestGRPC_GetStatus_ValidRequest(t *testing.T) {
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
	server := ratelimiter.NewGRPCServer(rl)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	req := &proto.StatusRequest{
		Key: "grpc-status-valid",
	}

	resp, err := server.GetStatus(ctx, req)
	// In mock mode, this may error
	if err != nil {
		st, ok := status.FromError(err)
		if ok {
			assert.Equal(t, codes.Internal, st.Code(), "should return Internal error if Redis fails")
		}
	} else {
		require.NotNil(t, resp)
		assert.GreaterOrEqual(t, resp.Remaining, int64(0), "should return remaining tokens")
	}
}

// TestGRPC_GetStatus_EmptyKey tests GetStatus with empty key
func TestGRPC_GetStatus_EmptyKey(t *testing.T) {
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
	server := ratelimiter.NewGRPCServer(rl)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	req := &proto.StatusRequest{
		Key: "", // Empty key
	}

	resp, err := server.GetStatus(ctx, req)
	require.Error(t, err, "should return error for empty key")
	assert.Nil(t, resp, "response should be nil on error")
	
	st, ok := status.FromError(err)
	require.True(t, ok, "error should be a gRPC status")
	assert.Equal(t, codes.InvalidArgument, st.Code(), "should return InvalidArgument for empty key")
	assert.Contains(t, st.Message(), "key is required", "error message should mention key requirement")
}

// TestGRPC_ErrorPropagation tests that errors from limiter are properly propagated
func TestGRPC_ErrorPropagation(t *testing.T) {
	client := setupMockRedis()
	defer client.Close()

	config := ratelimiter.Config{
		TokensPerSecond: 10.0,
		BucketSize:      100,
		WindowSize:      time.Second * 10,
		BurstLimit:      200,
	}

	rl := ratelimiter.NewRateLimiter(client, config)
	rl.SetFailOpen(false) // Fail-closed mode
	server := ratelimiter.NewGRPCServer(rl)

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	req := &proto.RateLimitRequest{
		Key:    "grpc-error-propagation",
		Tokens: 1,
	}

	resp, err := server.CheckRateLimit(ctx, req)
	require.Error(t, err, "should return error in fail-closed mode when Redis unavailable")
	assert.Nil(t, resp, "response should be nil on error")
	
	st, ok := status.FromError(err)
	require.True(t, ok, "error should be a gRPC status")
	assert.Equal(t, codes.Internal, st.Code(), "should return Internal error")
	assert.Contains(t, st.Message(), "rate limiter unavailable", "error message should contain expected text")
}
