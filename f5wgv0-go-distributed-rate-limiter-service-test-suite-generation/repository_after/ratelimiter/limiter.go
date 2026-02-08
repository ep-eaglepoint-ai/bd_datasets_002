package ratelimiter

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type Config struct {
	TokensPerSecond float64
	BucketSize      int64
	WindowSize      time.Duration
	BurstLimit      int64
}

type RateLimiter struct {
	redis      *redis.Client
	config     Config
	localCache sync.Map
	mu         sync.RWMutex
	failOpen   bool
}

type Result struct {
	Allowed    bool
	Remaining  int64
	RetryAfter time.Duration
	ResetAt    time.Time
}

func NewRateLimiter(redisClient *redis.Client, config Config) *RateLimiter {
	return &RateLimiter{
		redis:    redisClient,
		config:   config,
		failOpen: true,
	}
}

func (rl *RateLimiter) SetFailOpen(failOpen bool) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	rl.failOpen = failOpen
}

func (rl *RateLimiter) Allow(ctx context.Context, key string) (*Result, error) {
	return rl.AllowN(ctx, key, 1)
}

func (rl *RateLimiter) AllowN(ctx context.Context, key string, n int64) (*Result, error) {
	now := time.Now()

	result, err := rl.checkRedis(ctx, key, n, now)
	if err != nil {
		if rl.isFailOpen() {
			return rl.checkLocal(key, n, now), nil
		}
		return nil, fmt.Errorf("rate limiter unavailable: %w", err)
	}

	return result, nil
}

func (rl *RateLimiter) checkRedis(ctx context.Context, key string, n int64, now time.Time) (*Result, error) {
	pipe := rl.redis.Pipeline()

	bucketKey := fmt.Sprintf("rl:bucket:%s", key)
	windowKey := fmt.Sprintf("rl:window:%s", key)

	tokensCmd := pipe.HGetAll(ctx, bucketKey)

	windowStart := now.Add(-rl.config.WindowSize).UnixMilli()
	windowCmd := pipe.ZCount(ctx, windowKey, fmt.Sprintf("%d", windowStart), "+inf")

	_, err := pipe.Exec(ctx)
	if err != nil && err != redis.Nil {
		return nil, err
	}

	bucketData, _ := tokensCmd.Result()
	tokens, lastUpdate := rl.parseBucketData(bucketData, now)

	elapsed := now.Sub(lastUpdate).Seconds()
	tokens = min(float64(rl.config.BucketSize), tokens+elapsed*rl.config.TokensPerSecond)

	windowCount, _ := windowCmd.Result()
	if windowCount >= rl.config.BurstLimit {
		return &Result{
			Allowed:    false,
			Remaining:  0,
			RetryAfter: rl.config.WindowSize / 2,
			ResetAt:    now.Add(rl.config.WindowSize),
		}, nil
	}

	if tokens < float64(n) {
		waitTime := time.Duration((float64(n) - tokens) / rl.config.TokensPerSecond * float64(time.Second))
		return &Result{
			Allowed:    false,
			Remaining:  int64(tokens),
			RetryAfter: waitTime,
			ResetAt:    now.Add(waitTime),
		}, nil
	}

	tokens -= float64(n)

	updatePipe := rl.redis.Pipeline()
	updatePipe.HSet(ctx, bucketKey, map[string]interface{}{
		"tokens":      tokens,
		"last_update": now.UnixMilli(),
	})
	updatePipe.Expire(ctx, bucketKey, rl.config.WindowSize*2)

	updatePipe.ZAdd(ctx, windowKey, redis.Z{
		Score:  float64(now.UnixMilli()),
		Member: fmt.Sprintf("%d", now.UnixNano()),
	})
	updatePipe.ZRemRangeByScore(ctx, windowKey, "-inf", fmt.Sprintf("%d", windowStart))
	updatePipe.Expire(ctx, windowKey, rl.config.WindowSize*2)

	_, err = updatePipe.Exec(ctx)
	if err != nil {
		return nil, err
	}

	return &Result{
		Allowed:   true,
		Remaining: int64(tokens),
		ResetAt:   now.Add(time.Duration(float64(rl.config.BucketSize-int64(tokens)) / rl.config.TokensPerSecond * float64(time.Second))),
	}, nil
}

func (rl *RateLimiter) parseBucketData(data map[string]string, now time.Time) (float64, time.Time) {
	if len(data) == 0 {
		return float64(rl.config.BucketSize), now
	}

	tokens := float64(rl.config.BucketSize)
	lastUpdate := now

	if t, ok := data["tokens"]; ok {
		fmt.Sscanf(t, "%f", &tokens)
	}
	if lu, ok := data["last_update"]; ok {
		var ms int64
		fmt.Sscanf(lu, "%d", &ms)
		lastUpdate = time.UnixMilli(ms)
	}

	return tokens, lastUpdate
}

func (rl *RateLimiter) checkLocal(key string, n int64, now time.Time) *Result {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	type localBucket struct {
		tokens     float64
		lastUpdate time.Time
	}

	val, _ := rl.localCache.LoadOrStore(key, &localBucket{
		tokens:     float64(rl.config.BucketSize),
		lastUpdate: now,
	})

	bucket := val.(*localBucket)

	elapsed := now.Sub(bucket.lastUpdate).Seconds()
	bucket.tokens = min(float64(rl.config.BucketSize), bucket.tokens+elapsed*rl.config.TokensPerSecond)
	bucket.lastUpdate = now

	if bucket.tokens < float64(n) {
		return &Result{
			Allowed:    false,
			Remaining:  int64(bucket.tokens),
			RetryAfter: time.Duration((float64(n) - bucket.tokens) / rl.config.TokensPerSecond * float64(time.Second)),
		}
	}

	bucket.tokens -= float64(n)
	return &Result{
		Allowed:   true,
		Remaining: int64(bucket.tokens),
	}
}

func (rl *RateLimiter) isFailOpen() bool {
	rl.mu.RLock()
	defer rl.mu.RUnlock()
	return rl.failOpen
}

func (rl *RateLimiter) Reset(ctx context.Context, key string) error {
	pipe := rl.redis.Pipeline()
	pipe.Del(ctx, fmt.Sprintf("rl:bucket:%s", key))
	pipe.Del(ctx, fmt.Sprintf("rl:window:%s", key))
	_, err := pipe.Exec(ctx)

	rl.localCache.Delete(key)
	return err
}

func (rl *RateLimiter) GetStatus(ctx context.Context, key string) (*Result, error) {
	now := time.Now()
	bucketKey := fmt.Sprintf("rl:bucket:%s", key)

	data, err := rl.redis.HGetAll(ctx, bucketKey).Result()
	if err != nil {
		return nil, err
	}

	tokens, lastUpdate := rl.parseBucketData(data, now)
	elapsed := now.Sub(lastUpdate).Seconds()
	tokens = min(float64(rl.config.BucketSize), tokens+elapsed*rl.config.TokensPerSecond)

	return &Result{
		Allowed:   tokens >= 1,
		Remaining: int64(tokens),
		ResetAt:   now.Add(time.Duration(float64(rl.config.BucketSize-int64(tokens)) / rl.config.TokensPerSecond * float64(time.Second))),
	}, nil
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

