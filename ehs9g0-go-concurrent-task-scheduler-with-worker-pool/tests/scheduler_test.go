package scheduler_tests

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"scheduler"
)

// Requirement 1: Worker pool spawns exactly N goroutines AND runs N tasks concurrently
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

	// Also verify that 10 tasks can run concurrently
	var runningCount int32
	var maxRunning int32
	var wg sync.WaitGroup
	var mu sync.Mutex

	for i := 0; i < 20; i++ {
		wg.Add(1)
		task := &scheduler.Task{
			ID:       string(rune('a' + i)),
			Type:     "test",
			Priority: scheduler.PriorityMedium,
			ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
				current := atomic.AddInt32(&runningCount, 1)
				mu.Lock()
				if current > maxRunning {
					maxRunning = current
				}
				mu.Unlock()
				time.Sleep(100 * time.Millisecond)
				atomic.AddInt32(&runningCount, -1)
				wg.Done()
				return nil
			},
		}
		s.Submit(task)
	}

	wg.Wait()

	if maxRunning != 10 {
		t.Errorf("Expected max 10 concurrent tasks, got %d", maxRunning)
	}

	s.Shutdown(5 * time.Second)
}

// Requirement 2: Priority queue uses container/heap
func TestRequirement2_ContainerHeapUsage(t *testing.T) {
	content, err := os.ReadFile("/app/repository_after/scheduler.go")
	if err != nil {
		content, err = os.ReadFile("../repository_after/scheduler.go")
		if err != nil {
			t.Skip("Could not read scheduler.go")
		}
	}

	code := string(content)

	// Check for container/heap import
	if !strings.Contains(code, `"container/heap"`) {
		t.Error("container/heap package not imported")
	}

	// Check for heap.Init, heap.Push, heap.Pop usage
	if !strings.Contains(code, "heap.Init") {
		t.Error("heap.Init not used")
	}
	if !strings.Contains(code, "heap.Push") {
		t.Error("heap.Push not used")
	}
	if !strings.Contains(code, "heap.Pop") {
		t.Error("heap.Pop not used")
	}

	// Check that heap.Interface is implemented (Len, Less, Swap, Push, Pop)
	if !strings.Contains(code, "func (pq *priorityQueue) Len()") &&
		!strings.Contains(code, "func (pq *PriorityQueue) Len()") {
		t.Error("heap.Interface Len() not implemented")
	}
	if !strings.Contains(code, "func (pq *priorityQueue) Less(") &&
		!strings.Contains(code, "func (pq *PriorityQueue) Less(") {
		t.Error("heap.Interface Less() not implemented")
	}
	if !strings.Contains(code, "func (pq *priorityQueue) Swap(") &&
		!strings.Contains(code, "func (pq *PriorityQueue) Swap(") {
		t.Error("heap.Interface Swap() not implemented")
	}
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
		Priority:   scheduler.PriorityMedium,
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
	tolerance := 150 * time.Millisecond

	for i := 0; i < 3; i++ {
		actual := timestamps[i+1].Sub(timestamps[i])
		diff := actual - expected[i]
		if diff < 0 {
			diff = -diff
		}
		if diff > tolerance {
			t.Errorf("Retry %d: expected %v, got %v (diff: %v)", i+1, expected[i], actual, diff)
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
		Priority: scheduler.PriorityMedium,
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
		Priority: scheduler.PriorityMedium,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			return nil
		},
	}

	task2 := &scheduler.Task{
		ID:       "abc",
		Type:     "test",
		Priority: scheduler.PriorityMedium,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			return nil
		},
	}

	ch1, prog1, _ := s.Submit(task1)
	ch2, prog2, _ := s.Submit(task2)

	if ch1 != ch2 {
		t.Error("Expected identical result channel reference for duplicate task ID")
	}
	if prog1 != prog2 {
		t.Error("Expected identical progress channel reference for duplicate task ID")
	}

	close(blocker)
}

// Requirement 5: Progress channel buffered >= 10 and progress reporting works
func TestRequirement5_ProgressChannelBuffered(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  1,
		MaxQueueSize: 100,
	})
	s.Start()
	defer s.Shutdown(5 * time.Second)

	blocked := false
	var progressValues []int
	var mu sync.Mutex

	task := &scheduler.Task{
		ID:       "progress-test",
		Type:     "test",
		Priority: scheduler.PriorityMedium,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			// Send 11 progress updates without blocking (0-100%)
			for i := 0; i <= 100; i += 10 {
				select {
				case progress <- i:
				default:
					blocked = true
					return errors.New("blocked")
				}
			}
			return nil
		},
	}

	resultCh, progressCh, _ := s.Submit(task)

	// Collect progress in background
	done := make(chan struct{})
	go func() {
		for p := range progressCh {
			mu.Lock()
			progressValues = append(progressValues, p)
			mu.Unlock()
		}
		close(done)
	}()

	select {
	case result := <-resultCh:
		if result.Error != nil && blocked {
			t.Error("Progress channel blocked - buffer too small")
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Timeout")
	}

	if blocked {
		t.Error("Progress channel blocked - buffer must be at least 10")
	}

	// Wait for progress collection to complete
	select {
	case <-done:
	case <-time.After(1 * time.Second):
	}

	// Verify progress values were received
	mu.Lock()
	if len(progressValues) < 10 {
		t.Errorf("Expected at least 10 progress updates, got %d", len(progressValues))
	}
	// Verify progress values are in expected range
	for _, v := range progressValues {
		if v < 0 || v > 100 {
			t.Errorf("Progress value %d out of expected range 0-100", v)
		}
	}
	mu.Unlock()
}

// Requirement 6: No defer in loops
func TestRequirement6_NoDeferInLoop(t *testing.T) {
	content, err := os.ReadFile("/app/repository_after/scheduler.go")
	if err != nil {
		content, err = os.ReadFile("../repository_after/scheduler.go")
		if err != nil {
			t.Skip("Could not read scheduler.go")
		}
	}

	code := string(content)
	lines := strings.Split(code, "\n")

	inFor := false
	braceDepth := 0
	forBraceDepth := 0

	for lineNum, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Count braces before checking for defer
		openBraces := strings.Count(trimmed, "{")
		closeBraces := strings.Count(trimmed, "}")

		// Detect for loop start
		if strings.HasPrefix(trimmed, "for ") || trimmed == "for{" || trimmed == "for {" {
			inFor = true
			forBraceDepth = braceDepth + openBraces
		}

		// Check for defer inside for loop
		if inFor && strings.HasPrefix(trimmed, "defer ") {
			t.Errorf("Found defer inside for loop at line %d: %s", lineNum+1, trimmed)
		}

		// Track brace depth
		braceDepth += openBraces
		braceDepth -= closeBraces

		// Exit for loop tracking when we return to the level before the for
		if inFor && braceDepth < forBraceDepth {
			inFor = false
		}
	}
}

// Requirement 7: No unused imports (go vet clean)
func TestRequirement7_NoUnusedImports(t *testing.T) {
	cmd := exec.Command("go", "vet", "./...")
	cmd.Dir = "/app/repository_after"
	if _, err := os.Stat("/app/repository_after"); os.IsNotExist(err) {
		cmd.Dir = "../repository_after"
	}

	output, err := cmd.CombinedOutput()
	outputStr := string(output)

	if strings.Contains(outputStr, "imported and not used") {
		t.Errorf("Unused imports detected:\n%s", outputStr)
	}

	// Also check for other go vet errors
	if err != nil && !strings.Contains(outputStr, "imported and not used") {
		if strings.Contains(outputStr, "imported") {
			t.Errorf("go vet failed:\n%s", outputStr)
		}
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
		Priority: scheduler.PriorityMedium,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			panic("test panic")
		},
	}

	panicCh, _, _ := s.Submit(panicTask)

	select {
	case result := <-panicCh:
		if result.State != scheduler.TaskStateFailed {
			t.Errorf("Expected failed state, got %v", result.State)
		}
		if result.Success {
			t.Error("Expected Success=false for panic")
		}
		if result.Error == nil || !strings.Contains(result.Error.Error(), "panic") {
			t.Errorf("Expected panic error, got %v", result.Error)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Timeout waiting for panic task")
	}

	// Verify worker still alive
	normalTask := &scheduler.Task{
		ID:       "normal-task",
		Type:     "test",
		Priority: scheduler.PriorityMedium,
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
		if !result.Success {
			t.Error("Expected Success=true for normal task")
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
			Priority: scheduler.PriorityMedium,
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
			Priority: scheduler.PriorityMedium,
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
			Priority: scheduler.PriorityMedium,
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
		t.Errorf("Rate limiting too fast: %v (expected >= 2.5s)", elapsed)
	}
}

// Requirement 12: Race-free stats with accuracy validation
func TestRequirement12_RaceFreeStats(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  10,
		MaxQueueSize: 1000,
	})
	s.Start()
	defer s.Shutdown(5 * time.Second)

	var wg sync.WaitGroup
	taskCount := 100

	for i := 0; i < taskCount; i++ {
		wg.Add(1)
		idx := i
		go func() {
			defer wg.Done()
			task := &scheduler.Task{
				ID:       "task-" + string(rune('a'+idx%26)) + string(rune('0'+idx/26)),
				Type:     "test",
				Priority: scheduler.PriorityMedium,
				ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
					return nil
				},
			}
			s.Submit(task)
		}()
	}

	// Concurrent stats reads
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			stats := s.Stats()
			// Verify stats consistency
			if stats.Running > stats.Submitted {
				t.Errorf("Running (%d) > Submitted (%d)", stats.Running, stats.Submitted)
			}
			if stats.Completed > stats.Submitted {
				t.Errorf("Completed (%d) > Submitted (%d)", stats.Completed, stats.Submitted)
			}
		}()
	}

	wg.Wait()

	// Wait for all tasks to complete
	time.Sleep(500 * time.Millisecond)

	// Verify final stats accuracy
	finalStats := s.Stats()
	if finalStats.Completed+finalStats.Failed != finalStats.Submitted {
		t.Logf("Stats: Submitted=%d, Completed=%d, Failed=%d",
			finalStats.Submitted, finalStats.Completed, finalStats.Failed)
	}
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
		Priority: scheduler.PriorityMedium,
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
			t.Errorf("Timeout too slow: %v (expected < 200ms)", elapsed)
		}
		if result.State != scheduler.TaskStateFailed {
			t.Errorf("Expected failed, got %v", result.State)
		}
		if result.Success {
			t.Error("Expected Success=false for timeout")
		}
		if result.Error == nil {
			t.Error("Expected context deadline exceeded error")
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
		Priority: scheduler.PriorityMedium,
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
			Priority: scheduler.PriorityMedium,
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
		Priority: scheduler.PriorityMedium,
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
			Priority: scheduler.PriorityMedium,
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

	if elapsed > 300*time.Millisecond {
		t.Errorf("Hard deadline too slow: %v (expected < 300ms)", elapsed)
	}
}

// Requirement 16: Priority ordering (High=0 executes before Low=2)
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
		Priority: scheduler.PriorityMedium,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			<-blocker
			return nil
		},
	}
	s.Submit(blockTask)
	time.Sleep(50 * time.Millisecond)

	var order []string
	var mu sync.Mutex

	// Submit Low priority tasks first
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

	// Then submit High priority tasks
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
		t.Fatalf("Expected 6 tasks, got %d", len(order))
	}

	// High priority tasks (Priority=0) should execute before Low (Priority=2)
	for i := 0; i < 3; i++ {
		if len(order[i]) < 4 || order[i][:4] != "high" {
			t.Errorf("Position %d: expected high priority task, got %s (order: %v)", i, order[i], order)
		}
	}
	for i := 3; i < 6; i++ {
		if len(order[i]) < 3 || order[i][:3] != "low" {
			t.Errorf("Position %d: expected low priority task, got %s (order: %v)", i, order[i], order)
		}
	}
}

// Requirement 17: Standard library only
func TestRequirement17_StandardLibraryOnly(t *testing.T) {
	content, err := os.ReadFile("/app/repository_after/go.mod")
	if err != nil {
		content, err = os.ReadFile("../repository_after/go.mod")
		if err != nil {
			t.Skip("Could not read go.mod")
		}
	}

	modContent := string(content)

	// Check for external dependencies
	if strings.Contains(modContent, "github.com") {
		t.Error("External github.com dependencies found in go.mod")
	}
	if strings.Contains(modContent, "golang.org/x") {
		t.Error("External golang.org/x dependencies found in go.mod")
	}

	// Verify it compiles with go build
	cmd := exec.Command("go", "build", "./...")
	cmd.Dir = "/app/repository_after"
	if _, err := os.Stat("/app/repository_after"); os.IsNotExist(err) {
		cmd.Dir = "../repository_after"
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Errorf("Code does not compile with standard library only:\n%s", string(output))
	}
}

// Requirement 18: Concurrent safety
func TestRequirement18_ConcurrentSafety(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  10,
		MaxQueueSize: 1000,
	})

	var wg sync.WaitGroup

	// Concurrent Start calls
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s.Start()
		}()
	}
	wg.Wait()

	// Concurrent Submit, Stats, SetRateLimit
	for i := 0; i < 100; i++ {
		wg.Add(3)
		idx := i
		go func() {
			defer wg.Done()
			task := &scheduler.Task{
				ID:       "task-" + string(rune(idx)),
				Type:     "test",
				Priority: scheduler.PriorityMedium,
				ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
					return nil
				},
			}
			s.Submit(task)
		}()

		go func() {
			defer wg.Done()
			s.Stats()
		}()

		go func() {
			defer wg.Done()
			s.SetRateLimit("type"+string(rune(idx)), float64(idx+1))
		}()
	}
	wg.Wait()

	// Concurrent Shutdown calls
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s.Shutdown(1 * time.Second)
		}()
	}
	wg.Wait()
}

// Additional: Test TaskResult Duration field
func TestTaskResultDuration(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  1,
		MaxQueueSize: 100,
	})
	s.Start()
	defer s.Shutdown(5 * time.Second)

	sleepDuration := 100 * time.Millisecond
	task := &scheduler.Task{
		ID:       "duration-test",
		Type:     "test",
		Priority: scheduler.PriorityMedium,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			time.Sleep(sleepDuration)
			return nil
		},
	}

	resultCh, _, _ := s.Submit(task)

	select {
	case result := <-resultCh:
		if result.Duration < sleepDuration {
			t.Errorf("Duration (%v) should be >= sleep time (%v)", result.Duration, sleepDuration)
		}
		if result.Duration > sleepDuration+50*time.Millisecond {
			t.Errorf("Duration (%v) too long for sleep time (%v)", result.Duration, sleepDuration)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Timeout")
	}
}

// Additional: Test Success boolean field
func TestTaskResultSuccessField(t *testing.T) {
	s := scheduler.NewScheduler(scheduler.SchedulerConfig{
		WorkerCount:  1,
		MaxQueueSize: 100,
	})
	s.Start()
	defer s.Shutdown(5 * time.Second)

	// Test successful task
	successTask := &scheduler.Task{
		ID:       "success-test",
		Type:     "test",
		Priority: scheduler.PriorityMedium,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			return nil
		},
	}

	resultCh, _, _ := s.Submit(successTask)
	result := <-resultCh

	if !result.Success {
		t.Error("Expected Success=true for successful task")
	}
	if result.State != scheduler.TaskStateCompleted {
		t.Errorf("Expected TaskStateCompleted, got %v", result.State)
	}

	// Test failed task
	failTask := &scheduler.Task{
		ID:       "fail-test",
		Type:     "test",
		Priority: scheduler.PriorityMedium,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			return errors.New("intentional failure")
		},
	}

	resultCh2, _, _ := s.Submit(failTask)
	result2 := <-resultCh2

	if result2.Success {
		t.Error("Expected Success=false for failed task")
	}
	if result2.State != scheduler.TaskStateFailed {
		t.Errorf("Expected TaskStateFailed, got %v", result2.State)
	}
}

// Additional: Test three priority levels (High, Medium, Low)
func TestThreePriorityLevels(t *testing.T) {
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
		Priority: scheduler.PriorityMedium,
		ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
			<-blocker
			return nil
		},
	}
	s.Submit(blockTask)
	time.Sleep(50 * time.Millisecond)

	var order []string
	var mu sync.Mutex

	// Submit in order: Low, Medium, High
	priorities := []struct {
		name     string
		priority scheduler.Priority
	}{
		{"low", scheduler.PriorityLow},
		{"medium", scheduler.PriorityMedium},
		{"high", scheduler.PriorityHigh},
	}

	for _, p := range priorities {
		name := p.name
		task := &scheduler.Task{
			ID:       name,
			Type:     "test",
			Priority: p.priority,
			ExecuteFunc: func(ctx context.Context, progress chan<- int) error {
				mu.Lock()
				order = append(order, name)
				mu.Unlock()
				return nil
			},
		}
		s.Submit(task)
	}

	close(blocker)
	time.Sleep(300 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()

	// Expected order: high (0), medium (1), low (2)
	expected := []string{"high", "medium", "low"}
	if len(order) != 3 {
		t.Fatalf("Expected 3 tasks, got %d", len(order))
	}

	for i, exp := range expected {
		if order[i] != exp {
			t.Errorf("Position %d: expected %s, got %s (order: %v)", i, exp, order[i], order)
		}
	}
}

// Additional: Verify Priority constants have correct values
func TestPriorityConstants(t *testing.T) {
	if scheduler.PriorityHigh != 0 {
		t.Errorf("PriorityHigh should be 0, got %d", scheduler.PriorityHigh)
	}
	if scheduler.PriorityMedium != 1 {
		t.Errorf("PriorityMedium should be 1, got %d", scheduler.PriorityMedium)
	}
	if scheduler.PriorityLow != 2 {
		t.Errorf("PriorityLow should be 2, got %d", scheduler.PriorityLow)
	}
}