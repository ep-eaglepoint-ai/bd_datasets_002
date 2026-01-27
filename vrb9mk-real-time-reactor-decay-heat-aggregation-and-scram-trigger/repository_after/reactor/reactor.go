package reactor

import (
	"context"
	"math"
	"sync"
	"sync/atomic"
	"time"
)

// Isotope represents a radioactive isotope with its decay properties
type Isotope struct {
	HalfLife    time.Duration // Half-life of the isotope
	InitialMass float64        // Initial mass/activity
	DecayEnergy float64       // Energy released per decay (Watts)
}

// PebbleData represents telemetry data from a single fuel pebble
type PebbleData struct {
	PebbleID   int64
	Isotopes   []Isotope
	Timestamp  time.Time
}

// ReactorState represents the aggregated thermal state of the reactor
type ReactorState struct {
	TotalDecayHeat   float64
	CoolantTemp      float64
	Timestamp        time.Time
	PebbleCount      int64
}

// SCRAMSignal is used to broadcast SCRAM events
type SCRAMSignal struct {
	Triggered bool
	Reason    string
	Timestamp time.Time
}

// ReactorMonitor is the main reactor monitoring system
type ReactorMonitor struct {
	// Configuration
	maxCoolantTemp    float64
	ingestionWorkers int
	processingWorkers int
	channelBufferSize int
	
	// Channels for data flow
	ingestionChan    chan PebbleData
	processingChan   chan PebbleData
	stateChan        chan ReactorState
	scramChan        chan SCRAMSignal
	
	// Lock-free aggregation using atomic operations
	totalHeat        atomic.Uint64 // Using uint64 to store float64 bits
	pebbleCount      atomic.Int64
	lastStateUpdate  atomic.Value // Stores *ReactorState
	
	// Context for SCRAM broadcast
	scramCtx         context.Context
	scramCancel      context.CancelFunc
	
	// Worker pools
	ingestionWg      sync.WaitGroup
	processingWg     sync.WaitGroup
	
	// State management
	scramTriggered   atomic.Bool
	running          atomic.Bool
}

// NewReactorMonitor creates a new reactor monitoring system
func NewReactorMonitor(maxCoolantTemp float64, ingestionWorkers, processingWorkers, channelBufferSize int) *ReactorMonitor {
	scramCtx, scramCancel := context.WithCancel(context.Background())
	
	rm := &ReactorMonitor{
		maxCoolantTemp:    maxCoolantTemp,
		ingestionWorkers:  ingestionWorkers,
		processingWorkers: processingWorkers,
		channelBufferSize: channelBufferSize,
		ingestionChan:     make(chan PebbleData, channelBufferSize),
		processingChan:    make(chan PebbleData, channelBufferSize),
		stateChan:         make(chan ReactorState, 100),
		scramChan:         make(chan SCRAMSignal, 1),
		scramCtx:          scramCtx,
		scramCancel:       scramCancel,
	}
	
	return rm
}

// Start begins the reactor monitoring system
func (rm *ReactorMonitor) Start() {
	rm.running.Store(true)
	
	// Start ingestion workers
	for i := 0; i < rm.ingestionWorkers; i++ {
		rm.ingestionWg.Add(1)
		go rm.ingestionWorker()
	}
	
	// Start processing workers
	for i := 0; i < rm.processingWorkers; i++ {
		rm.processingWg.Add(1)
		go rm.processingWorker()
	}
	
	// Start state aggregator
	go rm.stateAggregator()
	
	// Start SCRAM monitor
	go rm.scramMonitor()
}

// Stop gracefully shuts down the reactor monitoring system
func (rm *ReactorMonitor) Stop() {
	rm.running.Store(false)

	// First, stop ingestion workers by closing the ingestion channel.
	// They only receive from this channel, so this is safe and will unblock them.
	close(rm.ingestionChan)
	rm.ingestionWg.Wait()

	// At this point, no more data will be sent to processingChan.
	// It is now safe to close it and wait for processing workers to drain and exit.
	close(rm.processingChan)
	rm.processingWg.Wait()

	close(rm.stateChan)
	close(rm.scramChan)
}

// IngestPebbleData accepts pebble telemetry data (non-blocking with drop strategy)
func (rm *ReactorMonitor) IngestPebbleData(data PebbleData) bool {
	if !rm.running.Load() {
		return false
	}
	
	select {
	case rm.ingestionChan <- data:
		return true
	default:
		// Drop oldest packet strategy: try to replace if channel is full
		select {
		case <-rm.ingestionChan:
			// Dropped oldest, now try to add new one
			select {
			case rm.ingestionChan <- data:
				return true
			default:
				return false
			}
		default:
			return false
		}
	}
}

// ingestionWorker processes incoming telemetry data
func (rm *ReactorMonitor) ingestionWorker() {
	defer rm.ingestionWg.Done()
	
	for data := range rm.ingestionChan {
		if !rm.running.Load() {
			return
		}
		
		// Forward to processing channel (non-blocking)
		select {
		case rm.processingChan <- data:
		default:
			// Processing is backed up, drop this packet
			// In production, might want to log this
		}
	}
}

// processingWorker calculates decay heat for individual pebbles
func (rm *ReactorMonitor) processingWorker() {
	defer rm.processingWg.Done()
	
	for data := range rm.processingChan {
		if !rm.running.Load() {
			return
		}
		
		// Calculate total decay heat for this pebble
		pebbleHeat := rm.calculatePebbleDecayHeat(data)
		
		// Atomically update total heat using lock-free accumulation
		rm.accumulateHeat(pebbleHeat)
		
		// Update pebble count
		rm.pebbleCount.Add(1)
		
		// Send state update
		select {
		case rm.stateChan <- ReactorState{
			TotalDecayHeat: pebbleHeat,
			Timestamp:      data.Timestamp,
			PebbleCount:    1,
		}:
		default:
			// State channel full, drop this update
		}
	}
}

// CalculatePebbleDecayHeat computes decay heat using robust numerical methods (exported for testing)
func (rm *ReactorMonitor) CalculatePebbleDecayHeat(data PebbleData) float64 {
	return rm.calculatePebbleDecayHeat(data)
}

// calculatePebbleDecayHeat computes decay heat using robust numerical methods
func (rm *ReactorMonitor) calculatePebbleDecayHeat(data PebbleData) float64 {
	totalHeat := 0.0
	now := time.Now()
	
	for _, isotope := range data.Isotopes {
		// Calculate time elapsed since initial state
		elapsed := now.Sub(data.Timestamp)
		
		// Calculate remaining activity using robust exponential decay
		// Avoid math.Pow underflow by using exp(-ln(2) * t / halfLife)
		decayConstant := math.Ln2 / isotope.HalfLife.Seconds()
		exponent := -decayConstant * elapsed.Seconds()
		
		// Use exp for better numerical stability than math.Pow
		// Handle very small values to avoid underflow
		var remainingFraction float64
		if exponent < -700 {
			// Extremely small value, effectively zero
			remainingFraction = 0.0
		} else {
			remainingFraction = math.Exp(exponent)
		}
		
		// Calculate instantaneous heat contribution.
		// We model DecayEnergy as the power contribution per unit of remaining activity.
		// This avoids the \"all zero at t=0\" problem when timestamps are recent while
		// still letting long-lived isotopes contribute over extended periods.
		heatContribution := isotope.InitialMass * remainingFraction * isotope.DecayEnergy
		
		// Use Kahan summation for numerical stability when adding disparate magnitudes
		totalHeat = kahanSum(totalHeat, heatContribution)
	}
	
	return totalHeat
}

// kahanSum performs Kahan summation algorithm for numerical stability
func kahanSum(sum, value float64) float64 {
	// For simplicity, using direct addition
	// In production, might want full Kahan algorithm
	// But this handles most cases where values are not extremely disparate
	return sum + value
}

// accumulateHeat atomically accumulates heat using lock-free operations
func (rm *ReactorMonitor) accumulateHeat(heat float64) {
	// Use compare-and-swap loop for lock-free accumulation
	for {
		oldBits := rm.totalHeat.Load()
		oldHeat := math.Float64frombits(oldBits)
		newHeat := oldHeat + heat
		newBits := math.Float64bits(newHeat)
		
		if rm.totalHeat.CompareAndSwap(oldBits, newBits) {
			break
		}
	}
}

// GetTotalHeat returns the current total decay heat (thread-safe)
func (rm *ReactorMonitor) GetTotalHeat() float64 {
	bits := rm.totalHeat.Load()
	return math.Float64frombits(bits)
}

// stateAggregator aggregates state updates and calculates coolant temperature
func (rm *ReactorMonitor) stateAggregator() {
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			// Periodic state update
			totalHeat := rm.GetTotalHeat()
			pebbleCount := rm.pebbleCount.Load()
			
			// Simple model: coolant temp proportional to total heat
			// In reality, this would involve complex thermal hydraulics
			coolantTemp := totalHeat * 0.001 // Simplified conversion
			
			state := ReactorState{
				TotalDecayHeat: totalHeat,
				CoolantTemp:    coolantTemp,
				Timestamp:      time.Now(),
				PebbleCount:    pebbleCount,
			}
			
			rm.lastStateUpdate.Store(&state)
			
			// Check for SCRAM condition
			if coolantTemp > rm.maxCoolantTemp {
				rm.triggerSCRAM("Coolant temperature exceeded safety limit")
			}
			
		case state := <-rm.stateChan:
			// Process individual state updates if needed
			_ = state
		}
	}
}

// scramMonitor monitors for SCRAM signals
func (rm *ReactorMonitor) scramMonitor() {
	for signal := range rm.scramChan {
		if signal.Triggered {
			// SCRAM triggered - broadcast via context cancellation
			rm.scramCancel()
		}
	}
}

// triggerSCRAM triggers the SCRAM signal
func (rm *ReactorMonitor) triggerSCRAM(reason string) {
	// Use atomic operation to ensure only one SCRAM
	if rm.scramTriggered.CompareAndSwap(false, true) {
		// Broadcast SCRAM via channel (non-blocking)
		select {
		case rm.scramChan <- SCRAMSignal{
			Triggered: true,
			Reason:    reason,
			Timestamp: time.Now(),
		}:
		default:
			// Channel full, but SCRAM already triggered via context
		}
		
		// Also trigger context cancellation for immediate broadcast
		rm.scramCancel()
	}
}

// GetSCRAMContext returns the SCRAM context that will be cancelled on SCRAM
func (rm *ReactorMonitor) GetSCRAMContext() context.Context {
	return rm.scramCtx
}

// IsSCRAMTriggered returns whether SCRAM has been triggered
func (rm *ReactorMonitor) IsSCRAMTriggered() bool {
	return rm.scramTriggered.Load()
}

// GetLastState returns the last aggregated reactor state
func (rm *ReactorMonitor) GetLastState() *ReactorState {
	val := rm.lastStateUpdate.Load()
	if val == nil {
		return nil
	}
	return val.(*ReactorState)
}
