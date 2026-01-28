package tests

import (
	"math"
	"sync"
	"testing"

	balancer "repository"
)

// ==================== HELPER: Sequence Auditor (Requirement 9) ====================

type SequenceAuditor struct {
	counts     map[string]int
	sequence   []string
	totalCalls int
}

func NewSequenceAuditor() *SequenceAuditor {
	return &SequenceAuditor{
		counts:   make(map[string]int),
		sequence: make([]string, 0),
	}
}

func (sa *SequenceAuditor) Record(nodeID string) {
	sa.counts[nodeID]++
	sa.sequence = append(sa.sequence, nodeID)
	sa.totalCalls++
}

func (sa *SequenceAuditor) GetSequence() []string {
	return sa.sequence
}

func (sa *SequenceAuditor) GetCounts() map[string]int {
	return sa.counts
}

func (sa *SequenceAuditor) VerifyDistribution(t *testing.T, expectedRatios map[string]float64, tolerancePercent float64) {
	t.Helper()

	if sa.totalCalls == 0 {
		t.Error("No calls recorded")
		return
	}

	for nodeID, expectedRatio := range expectedRatios {
		actualCount := sa.counts[nodeID]
		actualRatio := float64(actualCount) / float64(sa.totalCalls)

		diff := math.Abs(actualRatio - expectedRatio)
		tolerance := tolerancePercent / 100.0

		if diff > tolerance {
			t.Errorf("Node %s: expected ratio %.3f, got %.3f (diff %.3f > tolerance %.3f)",
				nodeID, expectedRatio, actualRatio, diff, tolerance)
		}
	}
}

// VerifyExactSequence verifies the sequence matches exactly (Requirement 2)
func (sa *SequenceAuditor) VerifyExactSequence(t *testing.T, expected []string) {
	t.Helper()

	if len(sa.sequence) != len(expected) {
		t.Errorf("Sequence length mismatch: expected %d, got %d", len(expected), len(sa.sequence))
		return
	}

	for i, exp := range expected {
		if sa.sequence[i] != exp {
			t.Errorf("Sequence mismatch at position %d: expected '%s', got '%s'", i, exp, sa.sequence[i])
		}
	}
}

func (sa *SequenceAuditor) RunAudit(b *balancer.DynamicWeightedBalancer, n int) {
	for i := 0; i < n; i++ {
		result := b.GetNextNode()
		sa.Record(result)
	}
}

func (sa *SequenceAuditor) Reset() {
	sa.counts = make(map[string]int)
	sa.sequence = make([]string, 0)
	sa.totalCalls = 0
}

// ==================== STATIC DISTRIBUTION TESTS (Requirement 8) ====================

func TestStaticDistribution(t *testing.T) {

	t.Run("EqualWeights_EqualDistribution", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: true},
			{ID: "B", Weight: 5, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 1000)

		auditor.VerifyDistribution(t, map[string]float64{
			"A": 0.5,
			"B": 0.5,
		}, 1.0)
	})

	t.Run("UnequalWeights_ProportionalDistribution", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 3, Healthy: true},
			{ID: "B", Weight: 1, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 1000)

		auditor.VerifyDistribution(t, map[string]float64{
			"A": 0.75,
			"B": 0.25,
		}, 1.0)
	})

	t.Run("ThreeNodes_WeightedDistribution", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: true},
			{ID: "B", Weight: 3, Healthy: true},
			{ID: "C", Weight: 2, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 1000)

		auditor.VerifyDistribution(t, map[string]float64{
			"A": 0.50,
			"B": 0.30,
			"C": 0.20,
		}, 1.0)
	})

	t.Run("SingleNode_AllTraffic", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "Solo", Weight: 10, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		for i := 0; i < 100; i++ {
			result := b.GetNextNode()
			if result != "Solo" {
				t.Errorf("Expected 'Solo', got '%s'", result)
			}
		}
	})

	t.Run("EmptyNodes_ReturnsEmpty", func(t *testing.T) {
		nodes := []*balancer.Node{}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		result := b.GetNextNode()
		if result != "" {
			t.Errorf("Expected empty string, got '%s'", result)
		}
	})

	t.Run("AllUnhealthy_ReturnsEmpty", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: false},
			{ID: "B", Weight: 5, Healthy: false},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		result := b.GetNextNode()
		if result != "" {
			t.Errorf("Expected empty string for all unhealthy, got '%s'", result)
		}
	})

	t.Run("MixedHealthy_OnlyHealthySelected", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: false},
			{ID: "B", Weight: 5, Healthy: true},
			{ID: "C", Weight: 5, Healthy: false},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		for i := 0; i < 50; i++ {
			result := b.GetNextNode()
			if result != "B" {
				t.Errorf("Only B should be selected, got '%s'", result)
			}
		}
	})

	t.Run("HighWeightDifference", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "Heavy", Weight: 100, Healthy: true},
			{ID: "Light", Weight: 1, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 1010)

		// Heavy should get ~99%, Light ~1%
		heavyRatio := float64(auditor.GetCounts()["Heavy"]) / float64(auditor.totalCalls)
		if heavyRatio < 0.98 {
			t.Errorf("Heavy node should get ~99%% of traffic, got %.2f%%", heavyRatio*100)
		}
	})
}

// ==================== DYNAMIC TRANSITION TESTS (Requirement 8) ====================

func TestDynamicTransitions(t *testing.T) {

	// Requirement 2: Sequence Continuity Test - EXACT sequence verification
	t.Run("SequenceContinuity_WeightTransition", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 2, Healthy: true},
			{ID: "B", Weight: 2, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		// Call GetNextNode twice with equal weights
		result1 := b.GetNextNode()
		result2 := b.GetNextNode()
		t.Logf("First two calls: %v, %v", result1, result2)

		// Verify initial behavior - with equal weights, should be A, B
		if result1 != "A" {
			t.Errorf("First call should return 'A', got '%s'", result1)
		}
		if result2 != "B" {
			t.Errorf("Second call should return 'B', got '%s'", result2)
		}

		// Update to [A:10, B:2]
		newNodes := []*balancer.Node{
			{ID: "A", Weight: 10, Healthy: true},
			{ID: "B", Weight: 2, Healthy: true},
		}
		b.UpdateWeights(newNodes)

		// Record next 12 calls
		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 12)

		next12 := auditor.GetSequence()
		t.Logf("Next 12 calls sequence: %v", next12)

		// EXACT SEQUENCE VERIFICATION (Requirement 2)
		// With weights A:10, B:2 (GCD=2, Max=10), starting after state [index=1, weight=2]
		// Expected sequence: A, A, A, A, A, B, A, A, A, A, A, B
		expectedSequence := []string{"A", "A", "A", "A", "A", "B", "A", "A", "A", "A", "A", "B"}
		auditor.VerifyExactSequence(t, expectedSequence)

		counts := auditor.GetCounts()
		t.Logf("Distribution: A=%d, B=%d", counts["A"], counts["B"])

		// Also verify counts: A should have 10, B should have 2
		if counts["A"] != 10 {
			t.Errorf("A should be selected exactly 10 times, got %d", counts["A"])
		}
		if counts["B"] != 2 {
			t.Errorf("B should be selected exactly 2 times, got %d", counts["B"])
		}
	})

	// Requirement 2 - Additional: Verify no skipped turns
	t.Run("SequenceContinuity_NoSkippedTurns", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 2, Healthy: true},
			{ID: "B", Weight: 2, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		// Exhaust one full cycle (4 calls for weights 2:2)
		for i := 0; i < 4; i++ {
			b.GetNextNode()
		}

		// Update weights
		newNodes := []*balancer.Node{
			{ID: "A", Weight: 10, Healthy: true},
			{ID: "B", Weight: 2, Healthy: true},
		}
		b.UpdateWeights(newNodes)

		// Verify balancer continues working
		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 24)

		if auditor.totalCalls != 24 {
			t.Errorf("Expected 24 calls, got %d", auditor.totalCalls)
		}

		// Verify distribution approximately matches weight ratio (10:2 = 5:1)
		aCount := auditor.GetCounts()["A"]
		bCount := auditor.GetCounts()["B"]

		// With weights 10:2, A should get ~83%, B should get ~17%
		aRatio := float64(aCount) / float64(auditor.totalCalls)
		if aRatio < 0.7 || aRatio > 0.95 {
			t.Errorf("A ratio should be ~83%%, got %.1f%% (A=%d, B=%d)", aRatio*100, aCount, bCount)
		}
	})

	// Requirement 3: GCD Flux Test
	t.Run("GCDFlux_TransitionFromHighToLowGCD", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "X", Weight: 10, Healthy: true},
			{ID: "Y", Weight: 20, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		type Stater interface {
			GetCurrentState() (int, int, int, int)
		}

		// Verify initial GCD = 10
		if s, ok := interface{}(b).(Stater); ok {
			_, _, maxW1, gcd1 := s.GetCurrentState()
			if gcd1 != 10 {
				t.Errorf("Initial GCD should be 10, got %d", gcd1)
			}
			if maxW1 != 20 {
				t.Errorf("Initial maxWeight should be 20, got %d", maxW1)
			}
		} else {
			t.Fatal("GetCurrentState not implemented - required for GCD Flux test")
		}

		// Make some calls to advance state
		for i := 0; i < 5; i++ {
			result := b.GetNextNode()
			if result != "X" && result != "Y" {
				t.Errorf("Unexpected result before update: '%s'", result)
			}
		}

		// Update to weights with GCD = 1
		newNodes := []*balancer.Node{
			{ID: "X", Weight: 7, Healthy: true},
			{ID: "Y", Weight: 13, Healthy: true},
		}
		b.UpdateWeights(newNodes)

		// Verify new GCD = 1
		if s, ok := interface{}(b).(Stater); ok {
			_, _, maxW2, gcd2 := s.GetCurrentState()
			if gcd2 != 1 {
				t.Errorf("After update GCD should be 1, got %d", gcd2)
			}
			if maxW2 != 13 {
				t.Errorf("After update maxWeight should be 13, got %d", maxW2)
			}
		}

		// Verify no infinite loop or out-of-bounds - make many calls
		for i := 0; i < 200; i++ {
			result := b.GetNextNode()
			if result != "X" && result != "Y" {
				t.Errorf("Unexpected result after GCD flux: '%s'", result)
			}
		}
	})

	// Requirement 3 - Additional: GCD changes in both directions
	t.Run("GCDFlux_LowToHighGCD", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 7, Healthy: true},
			{ID: "B", Weight: 11, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		type Stater interface {
			GetCurrentState() (int, int, int, int)
		}

		if s, ok := interface{}(b).(Stater); ok {
			_, _, _, gcd1 := s.GetCurrentState()
			if gcd1 != 1 {
				t.Errorf("Initial GCD should be 1, got %d", gcd1)
			}
		} else {
			t.Fatal("GetCurrentState not implemented")
		}

		// Update to weights with higher GCD
		newNodes := []*balancer.Node{
			{ID: "A", Weight: 15, Healthy: true},
			{ID: "B", Weight: 25, Healthy: true},
		}
		b.UpdateWeights(newNodes)

		if s, ok := interface{}(b).(Stater); ok {
			_, _, _, gcd2 := s.GetCurrentState()
			if gcd2 != 5 {
				t.Errorf("After update GCD should be 5, got %d", gcd2)
			}
		}

		// Verify balancer still works
		for i := 0; i < 100; i++ {
			result := b.GetNextNode()
			if result != "A" && result != "B" {
				t.Errorf("Unexpected result: '%s'", result)
			}
		}
	})

	// Requirement 4: Fairness under Health Flaps
	t.Run("FairnessUnderHealthFlaps", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "Heavy", Weight: 10, Healthy: true},
			{ID: "Light", Weight: 2, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		// Phase 1: Both healthy
		phase1Auditor := NewSequenceAuditor()
		phase1Auditor.RunAudit(b, 120)

		phase1Heavy := phase1Auditor.GetCounts()["Heavy"]
		phase1Light := phase1Auditor.GetCounts()["Light"]
		t.Logf("Phase 1 (both healthy): Heavy=%d, Light=%d", phase1Heavy, phase1Light)

		if phase1Heavy < phase1Light {
			t.Errorf("Phase 1: Heavy should be selected more, got Heavy=%d, Light=%d",
				phase1Heavy, phase1Light)
		}

		// Phase 2: Heavy unhealthy
		nodes[0].Healthy = false
		b.UpdateWeights(nodes)

		phase2Auditor := NewSequenceAuditor()
		phase2Auditor.RunAudit(b, 50)

		if phase2Auditor.GetCounts()["Heavy"] > 0 {
			t.Errorf("Phase 2: Heavy should not be selected when unhealthy, got %d",
				phase2Auditor.GetCounts()["Heavy"])
		}
		if phase2Auditor.GetCounts()["Light"] != 50 {
			t.Errorf("Phase 2: Light should get all traffic, got %d", phase2Auditor.GetCounts()["Light"])
		}

		// Phase 3: Heavy healthy again
		nodes[0].Healthy = true
		b.UpdateWeights(nodes)

		phase3Auditor := NewSequenceAuditor()
		phase3Auditor.RunAudit(b, 120)

		phase3Heavy := phase3Auditor.GetCounts()["Heavy"]
		phase3Light := phase3Auditor.GetCounts()["Light"]
		t.Logf("Phase 3 (Heavy restored): Heavy=%d, Light=%d", phase3Heavy, phase3Light)

		// Verify Heavy regains proportional share (10:2 = 5:1 ratio)
		if phase3Heavy < phase3Light {
			t.Errorf("Phase 3: Heavy should be selected more after regaining health, got Heavy=%d, Light=%d",
				phase3Heavy, phase3Light)
		}

		// Verify approximate ratio
		expectedRatio := 10.0 / 12.0 // ~83%
		actualRatio := float64(phase3Heavy) / float64(phase3Heavy+phase3Light)
		if math.Abs(actualRatio-expectedRatio) > 0.1 {
			t.Errorf("Phase 3: Heavy ratio should be ~%.1f%%, got %.1f%%",
				expectedRatio*100, actualRatio*100)
		}
	})

	// Requirement 7: Boundary Test - Slice Reduction
	t.Run("BoundaryTest_SliceReduction", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 1, Healthy: true},
			{ID: "B", Weight: 1, Healthy: true},
			{ID: "C", Weight: 1, Healthy: true},
			{ID: "D", Weight: 1, Healthy: true},
			{ID: "E", Weight: 1, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		// Advance to near end of slice
		for i := 0; i < 10; i++ {
			b.GetNextNode()
		}

		// Reduce slice size significantly
		newNodes := []*balancer.Node{
			{ID: "A", Weight: 1, Healthy: true},
			{ID: "B", Weight: 1, Healthy: true},
		}
		b.UpdateWeights(newNodes)

		// Verify no crash or out-of-bounds
		for i := 0; i < 20; i++ {
			result := b.GetNextNode()
			if result != "A" && result != "B" {
				t.Errorf("Unexpected result after slice reduction: '%s'", result)
			}
		}
	})

	// Requirement 7 - Additional: Boundary at exact end
	t.Run("BoundaryTest_ExactEndOfSlice", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 1, Healthy: true},
			{ID: "B", Weight: 1, Healthy: true},
			{ID: "C", Weight: 1, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		// Advance exactly to last node (index 2)
		for i := 0; i < 3; i++ {
			b.GetNextNode()
		}

		// Reduce to single node
		newNodes := []*balancer.Node{
			{ID: "A", Weight: 1, Healthy: true},
		}
		b.UpdateWeights(newNodes)

		// Verify single node is always selected
		for i := 0; i < 10; i++ {
			result := b.GetNextNode()
			if result != "A" {
				t.Errorf("Expected 'A' after slice reduction to 1, got '%s'", result)
			}
		}
	})

	// Requirement 6: Adversarial Case - Zero Weights
	t.Run("AdversarialCase_ZeroWeights", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 0, Healthy: true},
			{ID: "B", Weight: 0, Healthy: true},
			{ID: "C", Weight: 0, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		// Should not hang and should return empty string
		result := b.GetNextNode()
		if result != "" {
			t.Errorf("Expected empty string for zero weights, got '%s'", result)
		}

		// Multiple calls should also work
		for i := 0; i < 10; i++ {
			result := b.GetNextNode()
			if result != "" {
				t.Errorf("Call %d: Expected empty string for zero weights, got '%s'", i, result)
			}
		}
	})

	// Requirement 6 - Additional: Mix of zero and non-zero weights
	t.Run("AdversarialCase_MixedZeroWeights", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 0, Healthy: true},
			{ID: "B", Weight: 5, Healthy: true},
			{ID: "C", Weight: 0, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		// Only B should be selected
		for i := 0; i < 20; i++ {
			result := b.GetNextNode()
			if result != "B" {
				t.Errorf("Only B should be selected, got '%s'", result)
			}
		}
	})
}

// ==================== CONCURRENCY TESTS (Requirement 5) ====================

func TestConcurrency(t *testing.T) {

	t.Run("ConcurrentGetNextNode_WithUpdates", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: true},
			{ID: "B", Weight: 3, Healthy: true},
			{ID: "C", Weight: 2, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		var wg sync.WaitGroup

		// 1000 concurrent GetNextNode calls
		for i := 0; i < 1000; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				result := b.GetNextNode()
				// Just verify it doesn't crash and returns valid result
				if result != "A" && result != "B" && result != "C" && result != "" {
					t.Errorf("Unexpected result: '%s'", result)
				}
			}()
		}

		// 50 concurrent UpdateWeights calls
		for i := 0; i < 50; i++ {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()
				newNodes := []*balancer.Node{
					{ID: "A", Weight: 5 + idx%5, Healthy: true},
					{ID: "B", Weight: 3 + idx%3, Healthy: true},
					{ID: "C", Weight: 2 + idx%2, Healthy: idx%2 == 0},
				}
				b.UpdateWeights(newNodes)
			}(i)
		}

		wg.Wait()
	})

	t.Run("ConcurrentGetNextNode_OnlyReads", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: true},
			{ID: "B", Weight: 3, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		var wg sync.WaitGroup

		for i := 0; i < 1000; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				b.GetNextNode()
			}()
		}

		wg.Wait()
	})

	t.Run("ConcurrentUpdates_OnlyWrites", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		var wg sync.WaitGroup

		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()
				newNodes := []*balancer.Node{
					{ID: "A", Weight: idx%10 + 1, Healthy: true},
					{ID: "B", Weight: idx%5 + 1, Healthy: true},
				}
				b.UpdateWeights(newNodes)
			}(i)
		}

		wg.Wait()
	})
}

// ==================== COVERAGE TESTS (Requirement 1) ====================

func TestCoverage(t *testing.T) {

	t.Run("AllBranches_GetNextNode", func(t *testing.T) {
		// Branch: n == 0 (empty nodes)
		emptyB := balancer.NewDynamicWeightedBalancer([]*balancer.Node{})
		if emptyB.GetNextNode() != "" {
			t.Error("Empty nodes should return empty string")
		}

		// Branch: node.Healthy == false
		unhealthyNodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: false},
			{ID: "B", Weight: 5, Healthy: true},
		}
		b1 := balancer.NewDynamicWeightedBalancer(unhealthyNodes)
		for i := 0; i < 10; i++ {
			result := b1.GetNextNode()
			if result == "A" {
				t.Error("Unhealthy node A should not be selected")
			}
		}

		// Branch: node.Weight < currentWeight
		lowWeightNodes := []*balancer.Node{
			{ID: "A", Weight: 1, Healthy: true},
			{ID: "B", Weight: 10, Healthy: true},
		}
		b2 := balancer.NewDynamicWeightedBalancer(lowWeightNodes)
		auditor := NewSequenceAuditor()
		auditor.RunAudit(b2, 22)
		// B should be selected more often due to higher weight
		if auditor.GetCounts()["B"] < auditor.GetCounts()["A"] {
			t.Error("B should be selected more than A")
		}

		// Branch: currentWeight <= 0 reset
		singleNode := []*balancer.Node{
			{ID: "X", Weight: 1, Healthy: true},
		}
		b3 := balancer.NewDynamicWeightedBalancer(singleNode)
		for i := 0; i < 5; i++ {
			result := b3.GetNextNode()
			if result != "X" {
				t.Errorf("Expected X, got '%s'", result)
			}
		}

		// Branch: maxWeight == 0
		zeroWeightNodes := []*balancer.Node{
			{ID: "A", Weight: 0, Healthy: true},
		}
		b4 := balancer.NewDynamicWeightedBalancer(zeroWeightNodes)
		result := b4.GetNextNode()
		if result != "" {
			t.Errorf("Zero weight nodes should return empty, got '%s'", result)
		}
	})

	t.Run("AllBranches_UpdateWeights", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		// Update with more nodes
		moreNodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: true},
			{ID: "B", Weight: 3, Healthy: true},
		}
		b.UpdateWeights(moreNodes)

		found := map[string]bool{}
		for i := 0; i < 50; i++ {
			result := b.GetNextNode()
			found[result] = true
		}

		if !found["A"] || !found["B"] {
			t.Error("Both nodes should be selected after update")
		}

		// Update with fewer nodes
		fewerNodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: true},
		}
		b.UpdateWeights(fewerNodes)

		for i := 0; i < 10; i++ {
			result := b.GetNextNode()
			if result != "A" {
				t.Errorf("Only A should be selected, got '%s'", result)
			}
		}

		// Update with different weights
		diffWeights := []*balancer.Node{
			{ID: "A", Weight: 1, Healthy: true},
			{ID: "B", Weight: 9, Healthy: true},
		}
		b.UpdateWeights(diffWeights)

		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 100)
		if auditor.GetCounts()["B"] < auditor.GetCounts()["A"] {
			t.Error("B should be selected more with higher weight")
		}
	})

	t.Run("AllBranches_RecalculateGains", func(t *testing.T) {
		type Stater interface {
			GetCurrentState() (int, int, int, int)
		}

		// Single node - GCD equals weight
		single := []*balancer.Node{
			{ID: "A", Weight: 7, Healthy: true},
		}
		b1 := balancer.NewDynamicWeightedBalancer(single)

		if s, ok := interface{}(b1).(Stater); ok {
			_, _, maxW, gcd := s.GetCurrentState()
			if gcd != 7 {
				t.Errorf("GCD of single node should be its weight (7), got %d", gcd)
			}
			if maxW != 7 {
				t.Errorf("MaxWeight should be 7, got %d", maxW)
			}
		} else {
			t.Fatal("GetCurrentState not implemented")
		}

		// Two nodes with GCD > 1
		twoNodes := []*balancer.Node{
			{ID: "A", Weight: 6, Healthy: true},
			{ID: "B", Weight: 9, Healthy: true},
		}
		b2 := balancer.NewDynamicWeightedBalancer(twoNodes)

		if s, ok := interface{}(b2).(Stater); ok {
			_, _, maxW, gcd := s.GetCurrentState()
			if gcd != 3 {
				t.Errorf("GCD of 6,9 should be 3, got %d", gcd)
			}
			if maxW != 9 {
				t.Errorf("MaxWeight should be 9, got %d", maxW)
			}
		}

		// Coprime weights - GCD = 1
		coprime := []*balancer.Node{
			{ID: "A", Weight: 7, Healthy: true},
			{ID: "B", Weight: 11, Healthy: true},
		}
		b3 := balancer.NewDynamicWeightedBalancer(coprime)

		if s, ok := interface{}(b3).(Stater); ok {
			_, _, _, gcd := s.GetCurrentState()
			if gcd != 1 {
				t.Errorf("GCD of 7,11 should be 1, got %d", gcd)
			}
		}
	})

	t.Run("GCD_EdgeCases", func(t *testing.T) {
		type Stater interface {
			GetCurrentState() (int, int, int, int)
		}

		// All same weights
		same := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: true},
			{ID: "B", Weight: 5, Healthy: true},
			{ID: "C", Weight: 5, Healthy: true},
		}
		b1 := balancer.NewDynamicWeightedBalancer(same)

		if s, ok := interface{}(b1).(Stater); ok {
			_, _, maxW, gcd := s.GetCurrentState()
			if gcd != 5 {
				t.Errorf("GCD should be 5, got %d", gcd)
			}
			if maxW != 5 {
				t.Errorf("MaxWeight should be 5, got %d", maxW)
			}
		} else {
			t.Fatal("GetCurrentState not implemented")
		}

		// Weight of 1
		withOne := []*balancer.Node{
			{ID: "A", Weight: 1, Healthy: true},
			{ID: "B", Weight: 100, Healthy: true},
		}
		b2 := balancer.NewDynamicWeightedBalancer(withOne)

		if s, ok := interface{}(b2).(Stater); ok {
			_, _, _, gcd := s.GetCurrentState()
			if gcd != 1 {
				t.Errorf("GCD with weight 1 should be 1, got %d", gcd)
			}
		}
	})

	t.Run("LoopExhaustion_AllNodesSkipped", func(t *testing.T) {
		// All unhealthy - tests the loop exhaustion return ""
		nodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: false},
			{ID: "B", Weight: 5, Healthy: false},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		result := b.GetNextNode()
		if result != "" {
			t.Errorf("Expected empty string when all unhealthy, got '%s'", result)
		}
	})
}

// ==================== SEQUENCE AUDITOR TESTS (Requirement 9) ====================

func TestSequenceAuditor(t *testing.T) {

	t.Run("AuditorRecords1000Calls", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 3, Healthy: true},
			{ID: "B", Weight: 1, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 1000)

		if auditor.totalCalls != 1000 {
			t.Errorf("Expected 1000 calls, got %d", auditor.totalCalls)
		}

		// Verify 1% tolerance
		auditor.VerifyDistribution(t, map[string]float64{
			"A": 0.75,
			"B": 0.25,
		}, 1.0)
	})

	t.Run("AuditorSequenceTracking", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "X", Weight: 1, Healthy: true},
			{ID: "Y", Weight: 1, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 10)

		seq := auditor.GetSequence()
		if len(seq) != 10 {
			t.Errorf("Expected sequence length 10, got %d", len(seq))
		}

		for _, nodeID := range seq {
			if nodeID != "X" && nodeID != "Y" {
				t.Errorf("Unexpected node in sequence: '%s'", nodeID)
			}
		}
	})

	t.Run("AuditorDistributionVerification", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 1, Healthy: true},
			{ID: "B", Weight: 1, Healthy: true},
			{ID: "C", Weight: 1, Healthy: true},
			{ID: "D", Weight: 1, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 1000)

		// Each should get ~25% with 1% tolerance
		auditor.VerifyDistribution(t, map[string]float64{
			"A": 0.25,
			"B": 0.25,
			"C": 0.25,
			"D": 0.25,
		}, 1.0)
	})

	t.Run("AuditorCountsAccuracy", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "Solo", Weight: 5, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 100)

		counts := auditor.GetCounts()
		if counts["Solo"] != 100 {
			t.Errorf("Solo should have 100 counts, got %d", counts["Solo"])
		}
	})

	t.Run("AuditorExactSequenceVerification", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 2, Healthy: true},
			{ID: "B", Weight: 1, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 6)

		// With weights A:2, B:1, GCD=1, Max=2
		// Expected: at weight level 2, only A qualifies; at level 1, both qualify
		// Sequence should be: A, A, B, A, A, B (pattern)
		expected := []string{"A", "A", "B", "A", "A", "B"}
		auditor.VerifyExactSequence(t, expected)
	})

	t.Run("AuditorReset", func(t *testing.T) {
		auditor := NewSequenceAuditor()
		auditor.Record("A")
		auditor.Record("B")

		if auditor.totalCalls != 2 {
			t.Errorf("Expected 2 calls, got %d", auditor.totalCalls)
		}

		auditor.Reset()

		if auditor.totalCalls != 0 {
			t.Errorf("After reset, expected 0 calls, got %d", auditor.totalCalls)
		}
		if len(auditor.GetSequence()) != 0 {
			t.Errorf("After reset, expected empty sequence")
		}
	})
}