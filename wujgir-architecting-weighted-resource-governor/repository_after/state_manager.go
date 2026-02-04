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

// Consumne attempts to consume cost tokens using the GCRA algorithm.
// GCRA (Generic Cell Rate Algorithm) models the "theoretical arrival time" (TAT) of the next request.
// If TAT < Now, it means we have full capacity (bucket full).
// If TAT > Now + BurstTolerance, it means we are rejected.
//
// Burst-to-Sustain Model:
// - Tenants accumulate credit (time slack) when idle.
// - Max accumulated credit is bounded by burstCapacity.
// - Refill velocity is constant (1 token / (1/rate) seconds).
//
// Returns: allowed (bool), remaining_tokens (int64), wait (time.Duration), error
func (sm *StateManager) Consumne(ctx context.Context, key string, cost int64, now time.Time) (bool, int64, time.Duration, error) {
// Emission Interval: Time duration to accumulate 1 token.
// e.g., Rate 10/s -> 100ms per token.
emissionInterval := time.Duration(float64(time.Second) / sm.refillRate)

// Burst Tolerance: The maximum time we can borrow from the future.
// This represents the "capacity" of the bucket in time units.
// e.g., Capacity 100 -> 100 * 100ms = 10s of burst tolerance.
burstTolerance := time.Duration(sm.burstCapacity) * emissionInterval

// Increment: Cost in time units.
increment := emissionInterval * time.Duration(cost)

for {
// 1. Get current state (TAT)
// We use atomic persistence. Value stored is the TAT as Unix Nanoseconds.
val, valid, err := sm.storage.Get(ctx, key)
if err != nil {
return false, 0, 0, err
}

var tat time.Time
if !valid {
// If no state, TAT is effectively now (or even in the past, implying full bucket).
// We set it to now for calculation purposes, or more accurately:
// "Full bucket" corresponds to TAT = Now - BurstTolerance?
// Actually, in GCRA, if TAT < Now, we treat it as Now (loss of accumulated credit beyond max).
tat = now
val = 0 // For CAS
} else {
tat = time.Unix(0, val)
}

// 2. Adjust TAT for idle time
// If tat is in the past, it means we have refilled to max or partial.
// Effectively, if TAT < Now, the new TAT base is Now.
if tat.Before(now) {
tat = now
}

// 3. Calculate New TAT
newTat := tat.Add(increment)

// 4. Check against Limit
// The Limit is Now + BurstTolerance.
// If the new TAT exceeds this limit, the request is rejected because it would
// require borrowing more time than the burst capacity allows.
limit := now.Add(burstTolerance)

if newTat.After(limit) {
// Rejected.
// Cooldown (Wait) Calculation:
// The time we need to wait is the time until newTat would be <= limit.
// newTat - limit is exactly how much we are over the limit.
// Wait = newTat - limit.
wait := newTat.Sub(limit)

// Calculate remaining capacity for info (optional but required by interface)
// Remaining capacity = Limit - TAT (how much room we have left)
// Remaining Tokens = (Limit - TAT) / emissionInterval
remainingTime := limit.Sub(tat)
remainingTokens := int64(remainingTime / emissionInterval)

return false, remainingTokens, wait, nil
}

// 5. Update State
// We only update if successful.
// Storage stores TAT.
newVal := newTat.UnixNano()
if !valid {
val = 0
}

swapped, err := sm.storage.CompareAndSwap(ctx, key, val, newVal)
if err != nil {
return false, 0, 0, err
}

if swapped {
// Success
// Remaining tokens = (Limit - NewTAT) / emissionInterval
remainingTime := limit.Sub(newTat)
remainingTokens := int64(remainingTime / emissionInterval)
return true, remainingTokens, 0, nil
}

// 6. CAS Failed - Loop/Retry
if ctx.Err() != nil {
return false, 0, 0, ctx.Err()
}
// Minimal backoff for high contention?
// For Requirements "extreme concurrency", spinning is better than sleep if contention is short.
// Go runtime handles yield.
}
}
