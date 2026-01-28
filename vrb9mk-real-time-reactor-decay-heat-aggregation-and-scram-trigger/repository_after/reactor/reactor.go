package reactor

import (
	"context"
	"math"
	"math/big"
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
	totalHeat        atomic.Value // Stores *big.Float
	pebbleCount      atomic.Int64
	lastStateUpdate  atomic.Value // Stores *ReactorState
	
	// Context for SCRAM broadcast
	scramCtx         context.Context
	scramCancel      context.CancelFunc
	
	// Worker pools
	ingestionWg      sync.WaitGroup
	processingWg     sync.WaitGroup
	aggregatorWg     sync.WaitGroup
	
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
	
	// Initialize high-precision total heat
	rm.totalHeat.Store(new(big.Float).SetPrec(256).SetFloat64(0.0))
	
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
	rm.aggregatorWg.Add(1)
	go rm.stateAggregator()
	
	// Start SCRAM monitor
	go rm.scramMonitor()
}

// Stop gracefully shuts down the reactor monitoring system
func (rm *ReactorMonitor) Stop() {
	if !rm.running.CompareAndSwap(true, false) {
		return
	}

	// First, stop ingestion workers by closing the ingestion channel.
	close(rm.ingestionChan)
	rm.ingestionWg.Wait()

	// At this point, no more data will be sent to processingChan.
	close(rm.processingChan)
	rm.processingWg.Wait()

	// Stop aggregator
	close(rm.stateChan)
	rm.aggregatorWg.Wait()

	// Finally close scram channel
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
		// Forward to processing channel (non-blocking)
		select {
		case rm.processingChan <- data:
		default:
			// Processing is backed up, drop this packet
		}
	}
}

// processingWorker calculates decay heat for individual pebbles
func (rm *ReactorMonitor) processingWorker() {
	defer rm.processingWg.Done()
	
	for data := range rm.processingChan {
		// Calculate total decay heat for this pebble using high precision
		pebbleHeat := rm.calculatePebbleDecayHeat(data)
		
		// Atomically update total heat using lock-free accumulation with big.Float
		rm.accumulateHeat(pebbleHeat)
		
		// Update pebble count
		rm.pebbleCount.Add(1)
		
		// Send state update for fine-grained monitoring if needed
		select {
		case rm.stateChan <- ReactorState{
			TotalDecayHeat: pebbleHeat,
			Timestamp:      data.Timestamp,
			PebbleCount:    1,
		}:
		default:
			// State channel full, skip individual update
		}
	}
}

// CalculatePebbleDecayHeat computes decay heat using robust numerical methods (exported for testing)
func (rm *ReactorMonitor) CalculatePebbleDecayHeat(data PebbleData) float64 {
	return rm.calculatePebbleDecayHeat(data)
}

// calculatePebbleDecayHeat computes decay heat using robust numerical methods
func (rm *ReactorMonitor) calculatePebbleDecayHeat(data PebbleData) float64 {
	// Use big.Float for high-precision accumulation of isotope contributions
	// and to prevent precision loss when summing disparate magnitudes.
	// 256 bits is significantly more than float64 (53 bits).
	totalHeat := new(big.Float).SetPrec(256).SetFloat64(0.0)
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
			// math.Exp underflows to zero around -745 for float64.
			// Clamping at -700 is a safe threshold for numerical stability.
			remainingFraction = 0.0
		} else {
			remainingFraction = math.Exp(exponent)
		}
		
		// heatContribution = InitialMass * remainingFraction * DecayEnergy
		// We use big.Float for the multiplication and addition to maintain precision
		mass := new(big.Float).SetPrec(256).SetFloat64(isotope.InitialMass)
		frac := new(big.Float).SetPrec(256).SetFloat64(remainingFraction)
		energy := new(big.Float).SetPrec(256).SetFloat64(isotope.DecayEnergy)
		
		contribution := new(big.Float).SetPrec(256).Mul(mass, frac)
		contribution.Mul(contribution, energy)
		
		// Add to total using high-precision summation
		totalHeat.Add(totalHeat, contribution)
	}
	
	f, _ := totalHeat.Float64()
	return f
}

// accumulateHeat atomically accumulates heat using lock-free operations
func (rm *ReactorMonitor) accumulateHeat(heat float64) {
	// Use compare-and-swap loop for lock-free accumulation with big.Float
	newContribution := new(big.Float).SetPrec(256).SetFloat64(heat)
	for {
		oldHeatVal := rm.totalHeat.Load()
		oldHeat := oldHeatVal.(*big.Float)
		
		// Create a new big.Float for the updated value to maintain immutability for CAS
		updatedHeat := new(big.Float).SetPrec(256).Add(oldHeat, newContribution)
		
		if rm.totalHeat.CompareAndSwap(oldHeat, updatedHeat) {
			break
		}
	}
}

// GetTotalHeat returns the current total decay heat (thread-safe)
func (rm *ReactorMonitor) GetTotalHeat() float64 {
	val := rm.totalHeat.Load()
	if val == nil {
		return 0.0
	}
	f, _ := val.(*big.Float).Float64()
	return f
}

// stateAggregator aggregates state updates and calculates coolant temperature
func (rm *ReactorMonitor) stateAggregator() {
	defer rm.aggregatorWg.Done()
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			if !rm.running.Load() {
				return
			}
			
			// Periodic state update
			totalHeat := rm.GetTotalHeat()
			pebbleCount := rm.pebbleCount.Load()
			
			// Simple model: coolant temp proportional to total heat
			coolantTemp := totalHeat * 0.001
			
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
			
		case _, ok := <-rm.stateChan:
			if !ok {
				return
			}
		}
	}
}

// scramMonitor monitors for SCRAM signals
func (rm *ReactorMonitor) scramMonitor() {
	for range rm.scramChan {
		// Signal received from channel
	}
}

// triggerSCRAM triggers the SCRAM signal
func (rm *ReactorMonitor) triggerSCRAM(reason string) {
	// Use atomic operation to ensure only one SCRAM trigger logic runs
	if rm.scramTriggered.CompareAndSwap(false, true) {
		// Broadcast SCRAM via context cancellation (immediate and robust)
		rm.scramCancel()
		
		// Also send to channel if monitor is still running
		select {
		case rm.scramChan <- SCRAMSignal{
			Triggered: true,
			Reason:    reason,
			Timestamp: time.Now(),
		}:
		default:
			// Channel full or closed
		}
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
