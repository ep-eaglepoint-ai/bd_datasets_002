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

func (sa *SequenceAuditor) RunAudit(b *balancer.DynamicWeightedBalancer, n int) {
	for i := 0; i < n; i++ {
		result := b.GetNextNode()
		sa.Record(result)
	}
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
}

// ==================== DYNAMIC TRANSITION TESTS (Requirement 8) ====================

func TestDynamicTransitions(t *testing.T) {

	// Requirement 2: Sequence Continuity Test
	t.Run("SequenceContinuity_WeightTransition", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 2, Healthy: true},
			{ID: "B", Weight: 2, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

		result1 := b.GetNextNode()
		result2 := b.GetNextNode()
		t.Logf("First two calls: %v, %v", result1, result2)

		newNodes := []*balancer.Node{
			{ID: "A", Weight: 10, Healthy: true},
			{ID: "B", Weight: 2, Healthy: true},
		}
		b.UpdateWeights(newNodes)

		auditor := NewSequenceAuditor()
		auditor.RunAudit(b, 12)

		next12 := auditor.GetSequence()
		if len(next12) != 12 {
			t.Errorf("Expected 12 results, got %d", len(next12))
		}

		counts := auditor.GetCounts()
		if counts["A"] < counts["B"] {
			t.Errorf("A (weight 10) should be selected more than B (weight 2), got A=%d, B=%d",
				counts["A"], counts["B"])
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

		for i := 0; i < 5; i++ {
			b.GetNextNode()
		}

		newNodes := []*balancer.Node{
			{ID: "X", Weight: 7, Healthy: true},
			{ID: "Y", Weight: 13, Healthy: true},
		}
		b.UpdateWeights(newNodes)

		if s, ok := interface{}(b).(Stater); ok {
			_, _, maxW2, gcd2 := s.GetCurrentState()
			if gcd2 != 1 {
				t.Errorf("After update GCD should be 1, got %d", gcd2)
			}
			if maxW2 != 13 {
				t.Errorf("After update maxWeight should be 13, got %d", maxW2)
			}
		}

		for i := 0; i < 100; i++ {
			result := b.GetNextNode()
			if result != "X" && result != "Y" {
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

		phase1Auditor := NewSequenceAuditor()
		phase1Auditor.RunAudit(b, 120)

		nodes[0].Healthy = false
		b.UpdateWeights(nodes)

		phase2Auditor := NewSequenceAuditor()
		phase2Auditor.RunAudit(b, 50)
		if phase2Auditor.GetCounts()["Heavy"] > 0 {
			t.Errorf("Heavy should not be selected when unhealthy")
		}

		nodes[0].Healthy = true
		b.UpdateWeights(nodes)

		phase3Auditor := NewSequenceAuditor()
		phase3Auditor.RunAudit(b, 120)

		phase3Heavy := phase3Auditor.GetCounts()["Heavy"]
		phase3Light := phase3Auditor.GetCounts()["Light"]

		if phase3Heavy < phase3Light {
			t.Errorf("Heavy should be selected more after regaining health, got Heavy=%d, Light=%d",
				phase3Heavy, phase3Light)
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

		for i := 0; i < 10; i++ {
			b.GetNextNode()
		}

		newNodes := []*balancer.Node{
			{ID: "A", Weight: 1, Healthy: true},
			{ID: "B", Weight: 1, Healthy: true},
		}
		b.UpdateWeights(newNodes)

		for i := 0; i < 20; i++ {
			result := b.GetNextNode()
			if result != "A" && result != "B" {
				t.Errorf("Unexpected result after slice reduction: '%s'", result)
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

		result := b.GetNextNode()
		if result != "" {
			t.Errorf("Expected empty string for zero weights, got '%s'", result)
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

		for i := 0; i < 1000; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				b.GetNextNode()
			}()
		}

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
}

// ==================== COVERAGE TESTS (Requirement 1) ====================

func TestCoverage(t *testing.T) {

	t.Run("AllBranches_GetNextNode", func(t *testing.T) {
		emptyB := balancer.NewDynamicWeightedBalancer([]*balancer.Node{})
		if emptyB.GetNextNode() != "" {
			t.Error("Empty nodes should return empty string")
		}

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
	})

	t.Run("AllBranches_UpdateWeights", func(t *testing.T) {
		nodes := []*balancer.Node{
			{ID: "A", Weight: 5, Healthy: true},
		}
		b := balancer.NewDynamicWeightedBalancer(nodes)

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
	})

	t.Run("GCD_EdgeCases", func(t *testing.T) {
		type Stater interface {
			GetCurrentState() (int, int, int, int)
		}

		single := []*balancer.Node{
			{ID: "A", Weight: 7, Healthy: true},
		}
		b1 := balancer.NewDynamicWeightedBalancer(single)

		if s, ok := interface{}(b1).(Stater); ok {
			_, _, _, gcd1 := s.GetCurrentState()
			if gcd1 != 7 {
				t.Errorf("GCD of single node should be its weight, got %d", gcd1)
			}
		} else {
			t.Fatal("GetCurrentState not implemented")
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

		auditor.VerifyDistribution(t, map[string]float64{
			"A": 0.75,
			"B": 0.25,
		}, 1.0)
	})
}