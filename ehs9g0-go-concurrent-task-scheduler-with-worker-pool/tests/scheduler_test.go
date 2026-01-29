package tests

import (
	"context"
	"errors"
	"runtime"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"scheduler"
)

// Requirement 1: Worker pool spawns exactly N goroutines
func TestRequirement1_ExactWorkerCount(t *testing.T) {
	runtime.GC()
	time.Sleep(100 * time.Millisecond)

	before := runtime.NumGoroutine()

	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  10,
		MaxQueueSize: 100,
	})
	s.Start()
	time.Sleep(100 * time.Millisecond)

	after := runtime.NumGoroutine()
	diff := after - before

	if diff != 10 {
		t.Errorf("Expected exactly 10 goroutines, got %d (before=%d, after=%d)", diff, before, after)
	}

	s.Shutdown(5 * time.Second)
}

// Requirement 3: Exponential backoff 1s, 2s, 4s
func TestRequirement3_ExponentialBackoff(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  1,
		MaxQueueSize: 100,
	})
	s.Start()
	defer s.Shutdown(15 * time.Second)

	var timestamps []time.Time
	var mu sync.Mutex
	attempt := 0

	task := &scheduler.Task{
		ID:         "backoff-test",
		Type:       "test",
		Priority:   scheduler.PriorityNormal,
		MaxRetries: 3,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			mu.Lock()
			timestamps = append(timestamps, time.Now())
			attempt++
			current := attempt
			mu.Unlock()

			if current <= 3 {
				return errors.New("fail")
			}
			return nil
		},
	}

	resultCh, _, _ := s.Submit(task)

	select {
	case <-resultCh:
	case <-time.After(15 * time.Second):
		t.Fatal("Timeout")
	}

	mu.Lock()
	defer mu.Unlock()

	if len(timestamps) < 4 {
		t.Fatalf("Expected 4 attempts, got %d", len(timestamps))
	}

	expected := []time.Duration{1 * time.Second, 2 * time.Second, 4 * time.Second}
	tolerance := 100 * time.Millisecond // Changed from 150ms

	for i := 0; i < 3; i++ {
		actual := timestamps[i+1].Sub(timestamps[i])
		diff := actual - expected[i]
		if diff < 0 {
			diff = -diff
		}
		if diff > tolerance {
			t.Errorf("Retry %d: expected %v, got %v", i+1, expected[i], actual)
		}
	}
}

// Requirement 4: Task deduplication returns same channel
func TestRequirement4_TaskDeduplication(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  1,
		MaxQueueSize: 100,
	})
	s.Start()
	defer s.Shutdown(5 * time.Second)

	blocker := make(chan struct{})
	blockTask := &scheduler.Task{
		ID:       "blocker",
		Type:     "test",
		Priority: scheduler.PriorityNormal,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			<-blocker
			return nil
		},
	}
	s.Submit(blockTask)
	time.Sleep(50 * time.Millisecond)

	task1 := &scheduler.Task{
		ID:       "abc",
		Type:     "test",
		Priority: scheduler.PriorityNormal,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			return nil
		},
	}

	task2 := &scheduler.Task{
		ID:       "abc",
		Type:     "test",
		Priority: scheduler.PriorityNormal,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			return nil
		},
	}

	ch1, _, _ := s.Submit(task1)
	ch2, _, _ := s.Submit(task2)

	if ch1 != ch2 {
		t.Error("Expected identical channel reference for duplicate task ID")
	}

	close(blocker)
}

// Requirement 5: Progress channel buffered >= 10
func TestRequirement5_ProgressChannelBuffered(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  1,
		MaxQueueSize: 100,
	})
	s.Start()
	defer s.Shutdown(5 * time.Second)

	blocked := false
	task := &scheduler.Task{
		ID:       "progress-test",
		Type:     "test",
		Priority: scheduler.PriorityNormal,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			for i := 0; i < 10; i++ {
				select {
				case progress <- i * 10:
				default:
					blocked = true
					return errors.New("blocked")
				}
			}
			return nil
		},
	}

	resultCh, _, _ := s.Submit(task)

	select {
	case <-resultCh:
	case <-time.After(5 * time.Second):
		t.Fatal("Timeout")
	}

	if blocked {
		t.Error("Progress channel blocked - buffer too small")
	}
}

// Requirement 8: Panic recovery
func TestRequirement8_PanicRecovery(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  1,
		MaxQueueSize: 100,
	})
	s.Start()
	defer s.Shutdown(5 * time.Second)

	panicTask := &scheduler.Task{
		ID:       "panic-task",
		Type:     "test",
		Priority: scheduler.PriorityNormal,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			panic("test")
		},
	}

	panicCh, _, _ := s.Submit(panicTask)

	select {
	case result := <-panicCh:
		if result.State != scheduler.TaskStateFailed {
			t.Errorf("Expected failed, got %v", result.State)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Timeout waiting for panic task")
	}

	normalTask := &scheduler.Task{
		ID:       "normal-task",
		Type:     "test",
		Priority: scheduler.PriorityNormal,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			return nil
		},
	}

	normalCh, _, _ := s.Submit(normalTask)

	select {
	case result := <-normalCh:
		if result.State != scheduler.TaskStateCompleted {
			t.Errorf("Expected completed, got %v", result.State)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Worker died from panic")
	}
}

// Requirement 9: Graceful shutdown completes in-flight tasks
func TestRequirement9_GracefulShutdown(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  5,
		MaxQueueSize: 100,
	})
	s.Start()

	var completed int32

	for i := 0; i < 10; i++ {
		id := string(rune('a' + i))
		task := &scheduler.Task{
			ID:       id,
			Type:     "test",
			Priority: scheduler.PriorityNormal,
			ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
				time.Sleep(200 * time.Millisecond)
				atomic.AddInt32(&completed, 1)
				return nil
			},
		}
		s.Submit(task)
	}

	time.Sleep(50 * time.Millisecond)
	s.Shutdown(5 * time.Second)

	if atomic.LoadInt32(&completed) != 10 {
		t.Errorf("Expected 10 completed, got %d", completed)
	}
}

// Requirement 10: No goroutine leak
func TestRequirement10_NoGoroutineLeak(t *testing.T) {
	runtime.GC()
	time.Sleep(100 * time.Millisecond)

	before := runtime.NumGoroutine()

	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  10,
		MaxQueueSize: 100,
	})
	s.Start()

	for i := 0; i < 5; i++ {
		task := &scheduler.Task{
			ID:       string(rune('a' + i)),
			Type:     "test",
			Priority: scheduler.PriorityNormal,
			ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
				time.Sleep(50 * time.Millisecond)
				return nil
			},
		}
		s.Submit(task)
	}

	time.Sleep(300 * time.Millisecond)
	s.Shutdown(5 * time.Second)
	time.Sleep(100 * time.Millisecond)
	runtime.GC()
	time.Sleep(100 * time.Millisecond)

	after := runtime.NumGoroutine()
	diff := after - before

	if diff > 2 {
		t.Errorf("Goroutine leak: before=%d, after=%d, diff=%d", before, after, diff)
	}
}

// Requirement 11: Rate limiting with token bucket
func TestRequirement11_RateLimiting(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  10,
		MaxQueueSize: 100,
	})
	s.Start()
	defer s.Shutdown(10 * time.Second)

	s.SetRateLimit("email", 5)

	var completed int32
	start := time.Now()

	for i := 0; i < 15; i++ {
		task := &scheduler.Task{
			ID:       string(rune('a' + i)),
			Type:     "email",
			Priority: scheduler.PriorityNormal,
			ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
				atomic.AddInt32(&completed, 1)
				return nil
			},
		}
		s.Submit(task)
	}

	for atomic.LoadInt32(&completed) < 15 {
		if time.Since(start) > 10*time.Second {
			t.Fatal("Timeout")
		}
		time.Sleep(100 * time.Millisecond)
	}

	elapsed := time.Since(start)
	if elapsed < 2500*time.Millisecond {
		t.Errorf("Rate limiting too fast: %v", elapsed)
	}
}

// Requirement 12: Race-free stats
func TestRequirement12_RaceFreeStats(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  10,
		MaxQueueSize: 1000,
	})
	s.Start()
	defer s.Shutdown(5 * time.Second)

	var wg sync.WaitGroup

	for i := 0; i < 500; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			task := &scheduler.Task{
				ID:       string(rune(id)),
				Type:     "test",
				Priority: scheduler.PriorityNormal,
				ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
					return nil
				},
			}
			s.Submit(task)
		}(i)
	}

	for i := 0; i < 500; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			stats := s.Stats()
			if stats.Running > stats.Submitted {
				t.Errorf("Running > Submitted")
			}
		}()
	}

	wg.Wait()
}

// Requirement 13: Task timeout via context
func TestRequirement13_TaskTimeout(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  1,
		MaxQueueSize: 100,
	})
	s.Start()
	defer s.Shutdown(5 * time.Second)

	start := time.Now()
	task := &scheduler.Task{
		ID:       "timeout-task",
		Type:     "test",
		Priority: scheduler.PriorityNormal,
		Timeout:  100 * time.Millisecond,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(1 * time.Second):
				return nil
			}
		},
	}

	resultCh, _, _ := s.Submit(task)

	select {
	case result := <-resultCh:
		elapsed := time.Since(start)
		if elapsed > 200*time.Millisecond {
			t.Errorf("Timeout too slow: %v", elapsed)
		}
		if result.State != scheduler.TaskStateFailed {
			t.Errorf("Expected failed, got %v", result.State)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Test timeout")
	}
}

// Requirement 14: Queue size limit
func TestRequirement14_QueueSizeLimit(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  1,
		MaxQueueSize: 5,
		BlockOnFull:  false,
	})
	s.Start()
	defer s.Shutdown(5 * time.Second)

	blocker := make(chan struct{})
	blockTask := &scheduler.Task{
		ID:       "blocker",
		Type:     "test",
		Priority: scheduler.PriorityNormal,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			<-blocker
			return nil
		},
	}
	s.Submit(blockTask)
	time.Sleep(50 * time.Millisecond)

	for i := 0; i < 5; i++ {
		task := &scheduler.Task{
			ID:       string(rune('a' + i)),
			Type:     "test",
			Priority: scheduler.PriorityNormal,
			ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
				return nil
			},
		}
		_, _, err := s.Submit(task)
		if err != nil {
			t.Fatalf("Submit %d failed: %v", i, err)
		}
	}

	overflowTask := &scheduler.Task{
		ID:       "overflow",
		Type:     "test",
		Priority: scheduler.PriorityNormal,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			return nil
		},
	}
	_, _, err := s.Submit(overflowTask)
	if err != scheduler.ErrQueueFull {
		t.Errorf("Expected ErrQueueFull, got %v", err)
	}

	close(blocker)
}

// Requirement 15: Hard deadline shutdown
func TestRequirement15_HardDeadlineShutdown(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  2,
		MaxQueueSize: 100,
	})
	s.Start()

	for i := 0; i < 5; i++ {
		task := &scheduler.Task{
			ID:       string(rune('a' + i)),
			Type:     "test",
			Priority: scheduler.PriorityNormal,
			ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-time.After(1 * time.Second):
					return nil
				}
			},
		}
		s.Submit(task)
	}

	time.Sleep(50 * time.Millisecond)

	start := time.Now()
	s.Shutdown(100 * time.Millisecond)
	elapsed := time.Since(start)

	if elapsed > 200*time.Millisecond {
		t.Errorf("Hard deadline too slow: %v", elapsed)
	}
}

// Requirement 16: Priority ordering
func TestRequirement16_PriorityOrdering(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  1,
		MaxQueueSize: 100,
	})
	s.Start()
	defer s.Shutdown(5 * time.Second)

	blocker := make(chan struct{})
	blockTask := &scheduler.Task{
		ID:       "blocker",
		Type:     "test",
		Priority: scheduler.PriorityNormal,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			<-blocker
			return nil
		},
	}
	s.Submit(blockTask)
	time.Sleep(50 * time.Millisecond)

	var order []string
	var mu sync.Mutex

	for i := 0; i < 3; i++ {
		id := "low-" + string(rune('a'+i))
		localID := id
		task := &scheduler.Task{
			ID:       id,
			Type:     "test",
			Priority: scheduler.PriorityLow,
			ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
				mu.Lock()
				order = append(order, localID)
				mu.Unlock()
				return nil
			},
		}
		s.Submit(task)
	}

	for i := 0; i < 3; i++ {
		id := "high-" + string(rune('a'+i))
		localID := id
		task := &scheduler.Task{
			ID:       id,
			Type:     "test",
			Priority: scheduler.PriorityHigh,
			ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
				mu.Lock()
				order = append(order, localID)
				mu.Unlock()
				return nil
			},
		}
		s.Submit(task)
	}

	close(blocker)
	time.Sleep(500 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()

	if len(order) < 6 {
		t.Fatalf("Expected 6, got %d", len(order))
	}

	for i := 0; i < 3; i++ {
		if len(order[i]) < 4 || order[i][:4] != "high" {
			t.Errorf("Position %d: expected high, got %s", i, order[i])
		}
	}
}

// Requirement 18: Concurrent safety
func TestRequirement18_ConcurrentSafety(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  10,
		MaxQueueSize: 1000,
	})

	var wg sync.WaitGroup

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s.Start()
		}()
	}
	wg.Wait()

	for i := 0; i < 100; i++ {
		wg.Add(3)
		go func(id int) {
			defer wg.Done()
			task := &scheduler.Task{
				ID:       string(rune(id)),
				Type:     "test",
				Priority: scheduler.PriorityNormal,
				ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
					return nil
				},
			}
			s.Submit(task)
		}(i)

		go func() {
			defer wg.Done()
			s.Stats()
		}()

		go func(id int) {
			defer wg.Done()
			s.SetRateLimit("type"+string(rune(id)), float64(id+1))
		}(i)
	}
	wg.Wait()

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s.Shutdown(1 * time.Second)
		}()
	}
	wg.Wait()
}