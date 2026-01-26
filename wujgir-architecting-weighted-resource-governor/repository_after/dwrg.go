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

// RegisterRoute registers a path pattern and method with a specific cost.
func (rg *ResourceGovernor) RegisterRoute(method, path string, cost int64) {
	rg.costEngine.Register(method, path, cost)
}

// Allow checks if a request should be allowed based on the tenant's quota.
// Returns allowed (bool), remaining tokens (int64), and wait duration if denied (time.Duration).
func (rg *ResourceGovernor) Allow(ctx context.Context, tenantID string, method, path string) (bool, int64, time.Duration, error) {
	cost := rg.costEngine.Resolve(method, path)
	if cost == 0 {
		// If no cost is defined or matches, we might default to 1 or 0 (pass-through).
		// For a strict governor, maybe we block? Let's assume default cost 1 if not matched, or non-regulated.
		// Requirement says: "maps incoming request attributes ... to a numeric cost weight".
		// Let's assume valid requests should match. If no match, let's treat as cost 1 for safety.
		cost = 1
	}

	key := fmt.Sprintf("quota:%s", tenantID)
	now := time.Now()

	// Distributed Token Bucket Logic with CAS
	// We sort of need to store 2 values: tokens and last_refill_timestamp.
	// But the AtomicStorage interface is simple int64.
	// We can pack them or use two keys. Packing is better for atomicity if we only have single-key CAS.
	// Or we can rely on just "tokens" if we have a background refinisher, but "Variable Refill" implies lazy refill on access.
	// Let's assume we store a struct serialized or packed into int64? Packing timestamp and tokens into int64 is tricky (timestamp is large).
	// Maybe we assume the storage can handle []byte (but interface says int64).
	// NOTE: The interface provided in the plan was int64. 
	// If we are restricted to int64, we might need a separate key for timestamp, but that races.
	// Let's refine the usage. Maybe the prompt implied a "provided persistence interface" which usually has more capabilities, 
	// but I defined it as int64.
	// Let's change the Storage strategy to "State Management" component. 
	// Actually, standard "CompareAndSwap" often implies simply values.
	// 
	// "Implement a 'Variable Refill' algorithm... tenants must accumulate 'Resource Units'..."
	//
	// Strategy:
	// Use the StateManager to handle the complex logic of fetching state, calculating refill, and trying to CAS.
	// I will delegate the CAS loop to state_manager.go.
	
	stateMgr := NewStateManager(rg.storage, rg.refillRate, rg.burstCapacity)
	return stateMgr.Consumne(ctx, key, cost, now)
}
