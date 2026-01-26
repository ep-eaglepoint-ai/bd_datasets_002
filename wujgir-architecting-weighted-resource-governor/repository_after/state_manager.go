package dwrg

import (
	"context"

	"time"
)

type StateManager struct {
	storage       AtomicStorage
	refillRate    float64
	burstCapacity int64
}

func NewStateManager(storage AtomicStorage, refillRate float64, burstCapacity int64) *StateManager {
	return &StateManager{
		storage:       storage,
		refillRate:    refillRate,
		burstCapacity: burstCapacity,
	}
}

// Consumne attempts to consume 'cost' tokens.
// Returns success, remaining tokens, and wait time.
func (sm *StateManager) Consumne(ctx context.Context, key string, cost int64, now time.Time) (bool, int64, time.Duration, error) {
	// We need to store both LastRefillTime and Tokens.
	// Since AtomicStorage only gives us int64 CAS, we are limited.
	// Option 1: Store two keys. Not atomic.
	// Option 2: Pack data. 
	//   Time (microsecond precision) requires ~50-60 bits.
	//   Tokens requires ~30-40 bits.
	//   Total > 64 bits.
	// Option 3: Assume the "persistence interface" is actually a store for more complex objects, 
	// but we defined it as int64.
	// LET'S REDEFINE STORAGE locally to support struct if possible, or pack tightly.
	// If we use Millisecond precision for time, we need ~45 bits (for 500 years).
	// Leaving 19 bits for tokens (max 524,287 tokens).
	// This might be enough.
	// 
	// Alternatively, use a "Lazy GCRA" or similar that strictly uses time.
	// GCRA (Generic Cell Rate Algorithm) stores "Theoretical Arrival Time" (TAT).
	// One int64 is enough for TAT (timestamp).
	// TAT approach:
	//   tat = Get(key)
	//   if tat < now: tat = now
	//   new_tat = tat + cost * (1/rate)
	//   if new_tat > now + burst_limit: reject
	//   CAS(key, old_tat, new_tat)
	// This fits perfectly in one int64!
	
	// GCRA Implementation
	// Period per token = 1 / refillRate (seconds per token)
	emissionInterval := time.Duration(float64(time.Second) / sm.refillRate)
	baseBurst := time.Duration(sm.burstCapacity) * emissionInterval
	
	for {
		// 1. Get current state (TAT)
		val, valid, err := sm.storage.Get(ctx, key)
		if err != nil {
			return false, 0, 0, err
		}
		
		var tat time.Time
		if !valid {
			tat = now
			val = 0 // Initial generic value for CAS if we treat 0 as "unset" or match specific storage behavior
		} else {
			tat = time.Unix(0, val)
		}

		// 2. Calculated logic
		// If TAT is in the past, reset to now (bucket full/idle)
		if tat.Before(now) {
			tat = now
		}

		// Calculate the cost in time
		increment := emissionInterval * time.Duration(cost)
		newTat := tat.Add(increment)

		// Check limit
		// Allow limit is: now + burst_tolerance
		limit := now.Add(baseBurst)

		if newTat.After(limit) {
			// Reject
			// Calculate wait time
			// Wait time is difference between newTat and limit? Or effectively when we can accommodate this?
			// Actually in GCRA, if newTAT > limit, it means we don't have enough tokens.
			// The time until we have enough tokens to process THIS request is (newTat - limit).
			// Wait, standard GCRA rejection:
			// You can perform action if newTat <= limit.
			// Time to wait to fit this action: newTat - limit.
			wait := newTat.Sub(limit)
			
			// Calculate remaining capacity for display
			// Capacity = limit - tat
			// remaining tokens = capacity / emissionInterval
			remainingTime := limit.Sub(tat)
			remainingTokens := int64(remainingTime / emissionInterval)
			
			return false, remainingTokens, wait, nil
		}

		// 3. Update state
		newVal := newTat.UnixNano()
		if !valid {
			// If it was missing, we expect '0' or a mechanism to create.
			// Our interface has CompareAndSwap(key, old, new). 
			// If it wasn't valid, maybe we rely on strict "0 implies does not exist" or passing 0 is fine.
			// Let's assume 0 is the "empty" value for CAS.
			val = 0
		}
		
		swapped, err := sm.storage.CompareAndSwap(ctx, key, val, newVal)
		if err != nil {
			return false, 0, 0, err
		}
		if swapped {
			// Success
			// Remaining tokens
			remainingTime := limit.Sub(newTat)
			remainingTokens := int64(remainingTime / emissionInterval)
			return true, remainingTokens, 0, nil
		}
		
		// Retry loop
		// Context check
		if ctx.Err() != nil {
			return false, 0, 0, ctx.Err()
		}
		// Backoff? For high concurrency, spin is risky, but CAS loops usually spin tight.
	}
}
