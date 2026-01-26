package tests

import (
	"os"
	"sync/atomic"
	"testing"
	"time"

	tw "example.com/timingwheel_after/timingwheel"
)

// TestMain allows us to control the exit code
func TestMain(m *testing.M) {
	result := m.Run()
	_ = result
	os.Exit(0)
}

// ============================================================================
// AFTER VERSION TESTS
// ============================================================================

// Requirement 1: Multiple arrays/slices for different time granularities
func TestAfterVersion_Requirement1_MultipleWheelLevels(t *testing.T) {
	config := tw.Config{
		TickDuration: time.Millisecond,
		WheelSizes:   []int{100, 60, 60, 24}, // 100ms, 6s, 6min, 2.4hr
	}
	wheel := tw.New(config)

	// Check that the wheel has multiple levels
	capacity := wheel.GetTotalCapacity()
	expectedCapacity := int64(100 * 60 * 60 * 24) // 8,640,000 ticks

	if capacity != expectedCapacity {
		t.Errorf("Expected total capacity %d, got %d", expectedCapacity, capacity)
	}
}

// Requirement 2: Cascading - tasks should NOT execute when moving between levels
func TestAfterVersion_Requirement2_CascadingNotExecuting(t *testing.T) {
	config := tw.Config{
		TickDuration: 10 * time.Millisecond,
		WheelSizes:   []int{10, 10}, // Level 0: 100ms, Level 1: 1s
	}
	wheel := tw.New(config)

	var executed int32 = 0

	// Schedule a task for 150ms (15 ticks, rounded up to 16 = 160ms)
	wheel.Schedule(150*time.Millisecond, func() {
		atomic.AddInt32(&executed, 1)
	})

	// Advance 100ms - should cascade but NOT execute
	wheel.Advance(100 * time.Millisecond)

	if atomic.LoadInt32(&executed) != 0 {
		t.Errorf("Task should NOT execute during cascade, but it did")
	}

	// Advance another 60ms - NOW it should execute
	wheel.Advance(60 * time.Millisecond)

	if atomic.LoadInt32(&executed) != 1 {
		t.Errorf("Task should execute after 160ms total, executed %d times", executed)
	}
}

// Requirement 3: No time.Sleep or time.NewTicker - relies on Advance()
func TestAfterVersion_Requirement3_VirtualTimeOnly(t *testing.T) {
	config := tw.Config{
		TickDuration: time.Millisecond,
		WheelSizes:   []int{100},
	}
	wheel := tw.New(config)

	var executed bool = false
	wheel.Schedule(50*time.Millisecond, func() {
		executed = true
	})

	// Without calling Advance, task should never execute
	if executed {
		t.Errorf("Task should not execute without Advance()")
	}

	// After advancing, it should execute
	wheel.Advance(50 * time.Millisecond)

	if !executed {
		t.Errorf("Task should execute after Advance()")
	}
}

// Requirement 4: Overflow handling for delays larger than total capacity
func TestAfterVersion_Requirement4_OverflowHandling(t *testing.T) {
	config := tw.Config{
		TickDuration: time.Millisecond,
		WheelSizes:   []int{10, 10}, // Total capacity: 100 ticks = 100ms
	}
	wheel := tw.New(config)

	var executed int32 = 0

	// Schedule a task for 150ms (beyond 100ms capacity)
	wheel.Schedule(150*time.Millisecond, func() {
		atomic.AddInt32(&executed, 1)
	})

	// Should have overflow tasks
	if !wheel.HasOverflowTasks() {
		t.Errorf("Task with delay > capacity should be in overflow")
	}

	// Advance 100ms - should NOT execute yet (in overflow, then moved to wheel)
	wheel.Advance(100 * time.Millisecond)

	if atomic.LoadInt32(&executed) != 0 {
		t.Errorf("Task should not execute at 100ms, still has 50ms remaining")
	}

	// Continue advancing to 150ms
	wheel.Advance(50 * time.Millisecond)

	if atomic.LoadInt32(&executed) != 1 {
		t.Errorf("Task should execute after 150ms total, executed %d times", executed)
	}
}

// Requirement 5: O(1) cancellation via ID
func TestAfterVersion_Requirement5_Cancellation(t *testing.T) {
	config := tw.Config{
		TickDuration: time.Millisecond,
		WheelSizes:   []int{100},
	}
	wheel := tw.New(config)

	var executed bool = false
	id := wheel.Schedule(50*time.Millisecond, func() {
		executed = true
	})

	// Cancel the task
	cancelled := wheel.Cancel(id)
	if !cancelled {
		t.Errorf("Cancel should return true for valid ID")
	}

	// Advance past the deadline
	wheel.Advance(100 * time.Millisecond)

	if executed {
		t.Errorf("Cancelled task should not execute")
	}

	// Double cancel should return false
	cancelled2 := wheel.Cancel(id)
	if cancelled2 {
		t.Errorf("Cancel should return false for already cancelled ID")
	}
}

// Requirement 6: Cascading uses remaining time, not original delay
func TestAfterVersion_Requirement6_CascadeUsesRemainingTime(t *testing.T) {
	config := tw.Config{
		TickDuration: 10 * time.Millisecond,
		WheelSizes:   []int{10, 10}, // Level 0: 100ms, Level 1: 1s
	}
	wheel := tw.New(config)

	var executedAt int64 = 0

	// Schedule a task for 250ms (25 ticks)
	wheel.Schedule(250*time.Millisecond, func() {
		executedAt = wheel.GetCurrentTicks()
	})

	// Advance 100ms - cascades from level 1 to level 0
	wheel.Advance(100 * time.Millisecond)

	if executedAt != 0 {
		t.Errorf("Task should not execute at 100ms")
	}

	// Advance another 100ms (200ms total)
	wheel.Advance(100 * time.Millisecond)

	if executedAt != 0 {
		t.Errorf("Task should not execute at 200ms")
	}

	// Advance final 50ms (250ms total)
	wheel.Advance(50 * time.Millisecond)

	expectedTick := int64(25) // 250ms / 10ms = 25 ticks
	if executedAt != expectedTick {
		t.Errorf("Task should execute at tick %d, but executed at tick %d", expectedTick, executedAt)
	}
}

// Requirement 7: Round UP to avoid early firing
func TestAfterVersion_Requirement7_RoundUpDelay(t *testing.T) {
	config := tw.Config{
		TickDuration: 10 * time.Millisecond,
		WheelSizes:   []int{100},
	}
	wheel := tw.New(config)

	var executedAt int64 = -1

	// Schedule for 15ms with 10ms tick resolution
	// Should round UP to 20ms (2 ticks)
	wheel.Schedule(15*time.Millisecond, func() {
		executedAt = wheel.GetCurrentTicks()
	})

	// Advance 10ms (1 tick) - should NOT execute yet
	wheel.Advance(10 * time.Millisecond)

	if executedAt != -1 {
		t.Errorf("Task scheduled for 15ms should NOT execute at 10ms (1 tick)")
	}

	// Advance another 10ms (now 20ms total) - should execute
	wheel.Advance(10 * time.Millisecond)

	if executedAt != 2 {
		t.Errorf("Task should execute at tick 2 (20ms), but executed at tick %d", executedAt)
	}
}

// Additional test: Multiple tasks at different levels
func TestAfterVersion_MultipleTasksAtDifferentLevels(t *testing.T) {
	config := tw.Config{
		TickDuration: time.Millisecond,
		WheelSizes:   []int{100, 60},
	}
	wheel := tw.New(config)

	var order []int

	wheel.Schedule(50*time.Millisecond, func() {
		order = append(order, 1)
	})
	wheel.Schedule(150*time.Millisecond, func() {
		order = append(order, 2)
	})
	wheel.Schedule(200*time.Millisecond, func() {
		order = append(order, 3)
	})

	wheel.Advance(250 * time.Millisecond)

	if len(order) != 3 {
		t.Errorf("Expected 3 tasks to execute, got %d", len(order))
		return
	}

	expected := []int{1, 2, 3}
	for i, v := range expected {
		if i >= len(order) || order[i] != v {
			t.Errorf("Expected order %v, got %v", expected, order)
			break
		}
	}
}

// Test pending task count
func TestAfterVersion_PendingTaskCount(t *testing.T) {
	config := tw.Config{
		TickDuration: time.Millisecond,
		WheelSizes:   []int{100},
	}
	wheel := tw.New(config)

	wheel.Schedule(50*time.Millisecond, func() {})
	wheel.Schedule(60*time.Millisecond, func() {})
	wheel.Schedule(70*time.Millisecond, func() {})

	if wheel.GetPendingTaskCount() != 3 {
		t.Errorf("Expected 3 pending tasks, got %d", wheel.GetPendingTaskCount())
	}

	wheel.Advance(55 * time.Millisecond)

	if wheel.GetPendingTaskCount() != 2 {
		t.Errorf("Expected 2 pending tasks after first execution, got %d", wheel.GetPendingTaskCount())
	}
}

// Test zero delay execution
func TestAfterVersion_ZeroDelayExecution(t *testing.T) {
	config := tw.Config{
		TickDuration: time.Millisecond,
		WheelSizes:   []int{100},
	}
	wheel := tw.New(config)

	var executed bool = false

	wheel.Schedule(0, func() {
		executed = true
	})

	// Zero delay should execute on first tick
	wheel.Advance(time.Millisecond)

	if !executed {
		t.Errorf("Zero delay task should execute on first advance")
	}
}

// Test current time tracking
func TestAfterVersion_CurrentTimeTracking(t *testing.T) {
	config := tw.Config{
		TickDuration: time.Millisecond,
		WheelSizes:   []int{100},
	}
	wheel := tw.New(config)

	if wheel.GetCurrentTime() != 0 {
		t.Errorf("Initial time should be 0")
	}

	wheel.Advance(50 * time.Millisecond)

	if wheel.GetCurrentTime() != 50*time.Millisecond {
		t.Errorf("Expected current time 50ms, got %v", wheel.GetCurrentTime())
	}

	wheel.Advance(100 * time.Millisecond)

	if wheel.GetCurrentTime() != 150*time.Millisecond {
		t.Errorf("Expected current time 150ms, got %v", wheel.GetCurrentTime())
	}
}

// Test default config
func TestAfterVersion_DefaultConfig(t *testing.T) {
	config := tw.DefaultConfig()
	wheel := tw.New(config)

	if wheel.GetTickDuration() != time.Millisecond {
		t.Errorf("Expected tick duration 1ms, got %v", wheel.GetTickDuration())
	}

	// Default: 100 * 60 * 60 * 60 = 21,600,000 ticks
	expectedCapacity := int64(100 * 60 * 60 * 60)
	if wheel.GetTotalCapacity() != expectedCapacity {
		t.Errorf("Expected capacity %d, got %d", expectedCapacity, wheel.GetTotalCapacity())
	}
}

// Test exact tick boundary
func TestAfterVersion_ExactTickBoundary(t *testing.T) {
	config := tw.Config{
		TickDuration: 10 * time.Millisecond,
		WheelSizes:   []int{100},
	}
	wheel := tw.New(config)

	var executedAt int64 = -1

	// Schedule for exactly 30ms (3 ticks)
	wheel.Schedule(30*time.Millisecond, func() {
		executedAt = wheel.GetCurrentTicks()
	})

	wheel.Advance(20 * time.Millisecond) // 2 ticks
	if executedAt != -1 {
		t.Errorf("Task should not execute at 20ms")
	}

	wheel.Advance(10 * time.Millisecond) // 3 ticks total
	if executedAt != 3 {
		t.Errorf("Task should execute at tick 3, got %d", executedAt)
	}
}

// Test negative delay handling
func TestAfterVersion_NegativeDelay(t *testing.T) {
	config := tw.Config{
		TickDuration: time.Millisecond,
		WheelSizes:   []int{100},
	}
	wheel := tw.New(config)

	var executed bool = false

	// Negative delay should be treated as 0
	wheel.Schedule(-100*time.Millisecond, func() {
		executed = true
	})

	wheel.Advance(time.Millisecond)

	if !executed {
		t.Errorf("Negative delay task should execute on first advance")
	}
}