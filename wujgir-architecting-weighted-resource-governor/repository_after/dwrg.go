package dwrg

import (
	"context"
	"fmt"
	"time"
)

// ResourceGovernor is the main entry point for the distributed rate limiter.
type ResourceGovernor struct {
	storage    AtomicStorage
	costEngine *CostResolutionEngine
	
	// Configurable parameters
	refillRate   float64 // tokens per second
	burstCapacity int64   // max tokens allowed in the bucket
}

// NewResourceGovernor creates a new instance of the governor.
func NewResourceGovernor(storage AtomicStorage, refillRate float64, burstCapacity int64) *ResourceGovernor {
	return &ResourceGovernor{
		storage:       storage,
		costEngine:    NewCostResolutionEngine(),
		refillRate:    refillRate,
		burstCapacity: burstCapacity,
	}
}

// RegisterRoute registers a path pattern and method with a specific cost and optional headers.
// To use headers, pass them as a map[string]string.
// Example: RegisterRoute("GET", "/api", 10, map[string]string{"X-Priority": "high"})
func (rg *ResourceGovernor) RegisterRoute(method, path string, cost int64, headers map[string]string) {
	rg.costEngine.Register(method, path, headers, cost)
}

// Allow checks if a request should be allowed based on the tenant's quota.
// Returns allowed (bool), remaining tokens (int64), and wait duration if denied (time.Duration).
func (rg *ResourceGovernor) Allow(ctx context.Context, tenantID string, method, path string, headers map[string]string) (bool, int64, time.Duration, error) {
	cost := rg.costEngine.Resolve(method, path, headers)
	if cost == 0 {
		// Default safety
		cost = 1
	}

	key := fmt.Sprintf("quota:%s", tenantID)
	now := time.Now()

	stateMgr := NewStateManager(rg.storage, rg.refillRate, rg.burstCapacity)
	return stateMgr.Consumne(ctx, key, cost, now)
}
