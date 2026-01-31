package dispatcher

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"sync/atomic"
	"time"
)

// OrchestratorConfig holds configuration for the EventOrchestrator
type OrchestratorConfig struct {
	// WorkerCount is the number of concurrent workers in the pool
	WorkerCount int
	// RequestTimeout is the timeout for each outgoing HTTP request
	RequestTimeout time.Duration
	// MaxConnectionsPerDomain limits concurrent connections to a single host
	MaxConnectionsPerDomain int
	// RetryConfig configures the retry behavior
	RetryConfig RetryConfig
	// PollInterval is how often to poll for new events
	PollInterval time.Duration
}

// DefaultOrchestratorConfig returns sensible defaults
func DefaultOrchestratorConfig() OrchestratorConfig {
	return OrchestratorConfig{
		WorkerCount:             10,
		RequestTimeout:          5 * time.Second,
		MaxConnectionsPerDomain: 50,
		RetryConfig:             DefaultRetryConfig(),
		PollInterval:            100 * time.Millisecond,
	}
}

// EventOrchestrator manages the dispatch of events with guaranteed delivery
type EventOrchestrator struct {
	config      OrchestratorConfig
	store       PersistentStore
	retryPolicy *RetryPolicy
	httpClient  *http.Client

	// Channel for events to be processed
	eventQueue chan *Event

	// Stop channel for signaling shutdown
	stopChan   chan struct{}
	stopOnce   sync.Once
	pollerDone chan struct{}

	// Domain sharding - limits connections per host
	domainSemaphores   map[string]chan struct{}
	domainSemaphoresMu sync.RWMutex

	// Entity locks - ensures only one event per entity is processed at a time
	entityLocks   map[string]*sync.Mutex
	entityLocksMu sync.Mutex

	// Idempotency tracking - prevents duplicate in-flight requests
	inFlightEvents   map[string]bool
	inFlightEventsMu sync.Mutex

	// Worker management
	wg       sync.WaitGroup
	shutdown int32 // atomic flag

	// Metrics
	dispatchCount  int64
	successCount   int64
	failureCount   int64
	duplicateCount int64
	blockedCount   int64
}

// NewEventOrchestrator creates a new orchestrator with the given configuration
func NewEventOrchestrator(store PersistentStore, config OrchestratorConfig) *EventOrchestrator {
	return &EventOrchestrator{
		config:      config,
		store:       store,
		retryPolicy: NewRetryPolicy(config.RetryConfig),
		httpClient: &http.Client{
			Timeout: config.RequestTimeout,
		},
		eventQueue:       make(chan *Event, config.WorkerCount*10),
		stopChan:         make(chan struct{}),
		pollerDone:       make(chan struct{}),
		domainSemaphores: make(map[string]chan struct{}),
		entityLocks:      make(map[string]*sync.Mutex),
		inFlightEvents:   make(map[string]bool),
	}
}

// Start begins the worker pool and event processing
func (o *EventOrchestrator) Start(ctx context.Context) {
	// Start worker pool
	for i := 0; i < o.config.WorkerCount; i++ {
		o.wg.Add(1)
		go o.worker(ctx, i)
	}

	// Start the event poller
	o.wg.Add(1)
	go o.eventPoller(ctx)
}

// Stop gracefully shuts down the orchestrator
func (o *EventOrchestrator) Stop() {
	o.stopOnce.Do(func() {
		// Signal shutdown
		atomic.StoreInt32(&o.shutdown, 1)
		close(o.stopChan)

		// Wait for poller to stop sending to the queue
		<-o.pollerDone

		// Now safe to close the event queue
		close(o.eventQueue)
	})

	// Wait for all workers to finish
	o.wg.Wait()
}

// IsShuttingDown returns true if the orchestrator is shutting down
func (o *EventOrchestrator) IsShuttingDown() bool {
	return atomic.LoadInt32(&o.shutdown) == 1
}

// SubmitEvent adds a new event for processing
func (o *EventOrchestrator) SubmitEvent(ctx context.Context, event *Event) error {
	// Save to persistent store
	if err := o.store.SaveEvent(ctx, event); err != nil {
		return fmt.Errorf("failed to save event: %w", err)
	}
	return nil
}

// eventPoller continuously polls for events ready to be processed
func (o *EventOrchestrator) eventPoller(ctx context.Context) {
	defer o.wg.Done()
	defer close(o.pollerDone) // Signal that poller is done

	ticker := time.NewTicker(o.config.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-o.stopChan:
			return
		case <-ticker.C:
			o.pollAndQueueEvents(ctx)
		}
	}
}

// pollAndQueueEvents finds ready events and queues them for processing
func (o *EventOrchestrator) pollAndQueueEvents(ctx context.Context) {
	pendingEvents, err := o.store.GetPendingEvents(ctx)
	if err != nil {
		return
	}

	// Group events by entity
	entityEvents := make(map[string][]*Event)
	for _, event := range pendingEvents {
		entityEvents[event.EntityID] = append(entityEvents[event.EntityID], event)
	}

	// For each entity, find the next event in sequence that can be processed
	for entityID := range entityEvents {
		event, err := o.store.GetNextSequenceEvent(ctx, entityID)
		if err != nil || event == nil {
			continue
		}

		// Check idempotency - skip if already in flight
		if o.isInFlight(event.EventID) {
			continue
		}

		// Queue the event - use non-blocking send with stop check
		select {
		case <-o.stopChan:
			return
		case o.eventQueue <- event:
		default:
			// Queue is full, will retry on next poll
		}
	}
}

// worker is a goroutine that processes events from the queue
func (o *EventOrchestrator) worker(ctx context.Context, id int) {
	defer o.wg.Done()

	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-o.eventQueue:
			if !ok {
				return // Channel closed, shutdown
			}
			o.processEvent(ctx, event)
		}
	}
}

// processEvent handles a single event with all guards applied
func (o *EventOrchestrator) processEvent(ctx context.Context, event *Event) {
	// Idempotency Guard: Check if already completed or in-flight
	if !o.tryAcquireInFlight(event.EventID) {
		atomic.AddInt64(&o.duplicateCount, 1)
		return
	}
	defer o.releaseInFlight(event.EventID)

	// Re-fetch from store to get latest state
	storedEvent, err := o.store.GetEvent(ctx, event.EventID)
	if err != nil {
		return
	}

	// Check if already completed
	if storedEvent.State == StateCompleted {
		atomic.AddInt64(&o.duplicateCount, 1)
		return
	}

	// Check if already in flight (by another process)
	if storedEvent.State == StateInFlight {
		atomic.AddInt64(&o.duplicateCount, 1)
		return
	}

	// Sequence Guard: Acquire entity lock
	entityLock := o.getEntityLock(event.EntityID)
	entityLock.Lock()
	defer entityLock.Unlock()

	// Verify sequence order
	lastCompleted, err := o.store.GetLastCompletedSequence(ctx, event.EntityID)
	if err != nil {
		return
	}

	if event.SequenceNumber != lastCompleted+1 {
		// Not ready yet - a previous event is still pending
		atomic.AddInt64(&o.blockedCount, 1)
		return
	}

	// Check if entity is blocked by a failed event
	blocked, err := o.store.IsEntityBlocked(ctx, event.EntityID)
	if err != nil {
		return
	}
	if blocked {
		atomic.AddInt64(&o.blockedCount, 1)
		return
	}

	// Domain Rate Limit: Acquire domain semaphore
	domain := o.extractDomain(event.TargetURL)
	semaphore := o.getDomainSemaphore(domain)

	select {
	case semaphore <- struct{}{}:
		defer func() { <-semaphore }()
	case <-ctx.Done():
		return
	}

	// Mark as in-flight in the store
	storedEvent.MarkInFlight()
	if err := o.store.SaveEvent(ctx, storedEvent); err != nil {
		return
	}

	// Dispatch the event
	atomic.AddInt64(&o.dispatchCount, 1)
	err = o.dispatchHTTP(ctx, storedEvent)

	if err == nil {
		// Success!
		storedEvent.MarkCompleted()
		o.store.SaveEvent(ctx, storedEvent)
		atomic.AddInt64(&o.successCount, 1)
	} else {
		// Failed - check if we should retry
		nextRetry, shouldRetry := o.retryPolicy.CalculateNextRetry(storedEvent.RetryCount)

		if shouldRetry {
			storedEvent.MarkRetryWait(nextRetry, err.Error())
		} else {
			// Dead Letter
			storedEvent.MarkFailed(err.Error())
			atomic.AddInt64(&o.failureCount, 1)
		}
		o.store.SaveEvent(ctx, storedEvent)
	}
}

// dispatchHTTP sends the event payload to the target URL
func (o *EventOrchestrator) dispatchHTTP(ctx context.Context, event *Event) error {
	req, err := http.NewRequestWithContext(ctx, "POST", event.TargetURL, bytes.NewReader(event.Payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Idempotency-Key", event.EventID)

	resp, err := o.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}

	return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
}

// Helper methods for concurrency control

func (o *EventOrchestrator) tryAcquireInFlight(eventID string) bool {
	o.inFlightEventsMu.Lock()
	defer o.inFlightEventsMu.Unlock()

	if o.inFlightEvents[eventID] {
		return false
	}
	o.inFlightEvents[eventID] = true
	return true
}

func (o *EventOrchestrator) releaseInFlight(eventID string) {
	o.inFlightEventsMu.Lock()
	defer o.inFlightEventsMu.Unlock()
	delete(o.inFlightEvents, eventID)
}

func (o *EventOrchestrator) isInFlight(eventID string) bool {
	o.inFlightEventsMu.Lock()
	defer o.inFlightEventsMu.Unlock()
	return o.inFlightEvents[eventID]
}

func (o *EventOrchestrator) getEntityLock(entityID string) *sync.Mutex {
	o.entityLocksMu.Lock()
	defer o.entityLocksMu.Unlock()

	if lock, ok := o.entityLocks[entityID]; ok {
		return lock
	}
	lock := &sync.Mutex{}
	o.entityLocks[entityID] = lock
	return lock
}

func (o *EventOrchestrator) getDomainSemaphore(domain string) chan struct{} {
	o.domainSemaphoresMu.Lock()
	defer o.domainSemaphoresMu.Unlock()

	if sem, ok := o.domainSemaphores[domain]; ok {
		return sem
	}
	sem := make(chan struct{}, o.config.MaxConnectionsPerDomain)
	o.domainSemaphores[domain] = sem
	return sem
}

func (o *EventOrchestrator) extractDomain(targetURL string) string {
	parsed, err := url.Parse(targetURL)
	if err != nil {
		return "unknown"
	}
	return parsed.Host
}

// Metrics accessors

func (o *EventOrchestrator) GetDispatchCount() int64 {
	return atomic.LoadInt64(&o.dispatchCount)
}

func (o *EventOrchestrator) GetSuccessCount() int64 {
	return atomic.LoadInt64(&o.successCount)
}

func (o *EventOrchestrator) GetFailureCount() int64 {
	return atomic.LoadInt64(&o.failureCount)
}

func (o *EventOrchestrator) GetDuplicateCount() int64 {
	return atomic.LoadInt64(&o.duplicateCount)
}

func (o *EventOrchestrator) GetBlockedCount() int64 {
	return atomic.LoadInt64(&o.blockedCount)
}
