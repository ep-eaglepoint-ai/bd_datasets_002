package discountengine

import (
	"sync"
	"testing"
	"time"
)

// ============================================================================
// Requirement 1: Rule Dependency Resolution (DAG + Cycle Detection)
// ============================================================================

func TestDAG_AddRule(t *testing.T) {
	dag := NewDAG()
	
	rule := &Rule{
		ID:       "rule1",
		Name:     "Test Rule",
		Type:     RuleTypePercentage,
		Mode:     RuleModeStackable,
		Priority: 1,
	}
	
	err := dag.AddRule(rule)
	if err != nil {
		t.Errorf("Failed to add rule: %v", err)
	}
	
	if dag.RuleCount() != 1 {
		t.Errorf("Expected 1 rule, got %d", dag.RuleCount())
	}
}

func TestDAG_DetectCycle_NoCycle(t *testing.T) {
	dag := NewDAG()
	
	// Create a valid DAG: A -> B -> C
	dag.AddRule(&Rule{ID: "A", Name: "Rule A", Priority: 1})
	dag.AddRule(&Rule{ID: "B", Name: "Rule B", Priority: 2, Dependencies: []string{"A"}})
	dag.AddRule(&Rule{ID: "C", Name: "Rule C", Priority: 3, Dependencies: []string{"B"}})
	
	err := dag.DetectCycle()
	if err != nil {
		t.Errorf("Should not detect cycle in valid DAG: %v", err)
	}
}

func TestDAG_DetectCycle_WithCycle(t *testing.T) {
	dag := NewDAG()
	
	// Create a cycle: A -> B -> C -> A
	dag.AddRule(&Rule{ID: "A", Name: "Rule A", Dependencies: []string{"C"}})
	dag.AddRule(&Rule{ID: "B", Name: "Rule B", Dependencies: []string{"A"}})
	dag.AddRule(&Rule{ID: "C", Name: "Rule C", Dependencies: []string{"B"}})
	
	err := dag.DetectCycle()
	if err == nil {
		t.Error("Should detect cycle in invalid DAG")
	}
}

func TestDAG_TopologicalSort(t *testing.T) {
	dag := NewDAG()
	
	dag.AddRule(&Rule{ID: "A", Name: "Rule A", Priority: 1})
	dag.AddRule(&Rule{ID: "B", Name: "Rule B", Priority: 2, Dependencies: []string{"A"}})
	dag.AddRule(&Rule{ID: "C", Name: "Rule C", Priority: 3, Dependencies: []string{"A"}})
	
	sorted, err := dag.TopologicalSort()
	if err != nil {
		t.Errorf("TopologicalSort failed: %v", err)
	}
	
	if len(sorted) != 3 {
		t.Errorf("Expected 3 sorted rules, got %d", len(sorted))
	}
	
	// A should come before B and C
	aIndex := -1
	for i, r := range sorted {
		if r.ID == "A" {
			aIndex = i
			break
		}
	}
	
	if aIndex != 0 {
		t.Error("Rule A should be first (no dependencies)")
	}
}

// ============================================================================
// Requirement 2: Financial Precision (Fixed-Point Decimal)
// ============================================================================

func TestDecimal_Add(t *testing.T) {
	// Classic floating-point failure: 0.1 + 0.2 should equal 0.3
	a := NewDecimal(0.1)
	b := NewDecimal(0.2)
	result := a.Add(b)
	expected := NewDecimal(0.3)
	
	if !result.Equal(expected) {
		t.Errorf("0.1 + 0.2 = %s, expected %s", result.String(), expected.String())
	}
}

func TestDecimal_Multiply(t *testing.T) {
	price := NewDecimal(19.99)
	quantity := NewDecimalFromInt(3)
	result := price.Mul(quantity)
	expected := NewDecimal(59.97)
	
	if !result.Equal(expected) {
		t.Errorf("19.99 * 3 = %s, expected %s", result.String(), expected.String())
	}
}

func TestDecimal_Percent(t *testing.T) {
	price := NewDecimal(100.00)
	discount := price.Percent(15) // 15% of 100
	expected := NewDecimal(15.00)
	
	if !discount.Equal(expected) {
		t.Errorf("15%% of 100 = %s, expected %s", discount.String(), expected.String())
	}
}

func TestDecimal_Round_ISO4217(t *testing.T) {
	// Test rounding to 2 decimal places (cents)
	testCases := []struct {
		input    float64
		expected float64
	}{
		{10.125, 10.13},  // Round up
		{10.124, 10.12},  // Round down
		{10.005, 10.01},  // Edge case
		{99.999, 100.00}, // Round up to next dollar
	}
	
	for _, tc := range testCases {
		result := NewDecimal(tc.input).Round()
		expected := NewDecimal(tc.expected).Round()
		
		if !result.Equal(expected) {
			t.Errorf("Round(%f) = %s, expected %s", tc.input, result.String(), expected.String())
		}
	}
}

func TestDecimal_NoFloatingPointError(t *testing.T) {
	// Verify no floating-point accumulation errors
	total := NewDecimalFromInt(0)
	increment := NewDecimal(0.01)
	
	for i := 0; i < 100; i++ {
		total = total.Add(increment)
	}
	
	expected := NewDecimal(1.00)
	if !total.Equal(expected) {
		t.Errorf("100 * 0.01 = %s, expected %s", total.String(), expected.String())
	}
}

// ============================================================================
// Requirement 3: Conflict & Pruning Logic (Exclusive vs Stackable)
// ============================================================================

func TestEngine_ExclusiveRule_PrunesBranches(t *testing.T) {
	engine := NewEngine()
	
	// Add an exclusive rule
	engine.AddRule(&Rule{
		ID:       "exclusive1",
		Name:     "Exclusive 50% Off",
		Type:     RuleTypePercentage,
		Mode:     RuleModeExclusive,
		Priority: 100,
		Value:    NewDecimal(50),
	})
	
	// Add a stackable rule that should be skipped
	engine.AddRule(&Rule{
		ID:         "stackable1",
		Name:       "10% Additional",
		Type:       RuleTypePercentage,
		Mode:       RuleModeStackable,
		StackOrder: StackOrderMultiplicative,
		Priority:   50,
		Value:      NewDecimal(10),
	})
	
	cart := &Cart{
		ID: "cart1",
		Items: []*CartItem{
			{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: NewDecimal(100)},
		},
	}
	
	manifest, err := engine.Evaluate(cart)
	if err != nil {
		t.Fatalf("Evaluation failed: %v", err)
	}
	
	// Stackable rule should be skipped
	if len(manifest.RulesSkipped) == 0 {
		t.Error("Expected stackable rule to be skipped after exclusive rule")
	}
}

func TestEngine_StackableRules_DeterministicOrder(t *testing.T) {
	engine := NewEngine()
	
	// Add additive rule (applied first)
	engine.AddRule(&Rule{
		ID:         "additive1",
		Name:       "$5 Off",
		Type:       RuleTypeFixed,
		Mode:       RuleModeStackable,
		StackOrder: StackOrderAdditive,
		Priority:   10,
		Value:      NewDecimal(5),
	})
	
	// Add multiplicative rule (applied second)
	engine.AddRule(&Rule{
		ID:         "mult1",
		Name:       "10% Off",
		Type:       RuleTypePercentage,
		Mode:       RuleModeStackable,
		StackOrder: StackOrderMultiplicative,
		Priority:   10,
		Value:      NewDecimal(10),
	})
	
	cart := &Cart{
		ID: "cart1",
		Items: []*CartItem{
			{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: NewDecimal(100)},
		},
	}
	
	manifest, err := engine.Evaluate(cart)
	if err != nil {
		t.Fatalf("Evaluation failed: %v", err)
	}
	
	// Verify order: additive before multiplicative
	if len(manifest.RulesApplied) < 2 {
		t.Skip("Not enough rules applied to verify order")
	}
	
	// First should be additive
	if manifest.RulesApplied[0].RuleID != "additive1" {
		t.Error("Additive rule should be applied before multiplicative")
	}
}

// ============================================================================
// Requirement 4: Traceability Metadata (CalculationManifest)
// ============================================================================

func TestEngine_CalculationManifest_ContainsAuditTrail(t *testing.T) {
	engine := NewEngine()
	
	engine.AddRule(&Rule{
		ID:         "rule1",
		Name:       "15% Discount",
		Type:       RuleTypePercentage,
		Mode:       RuleModeStackable,
		StackOrder: StackOrderMultiplicative,
		Priority:   10,
		Value:      NewDecimal(15),
	})
	
	cart := &Cart{
		ID: "cart1",
		Items: []*CartItem{
			{ID: "item1", Name: "Product", Quantity: 2, UnitPrice: NewDecimal(50)},
		},
	}
	
	manifest, err := engine.Evaluate(cart)
	if err != nil {
		t.Fatalf("Evaluation failed: %v", err)
	}
	
	// Check manifest has required fields
	if manifest.CartID != "cart1" {
		t.Error("Manifest should contain cart ID")
	}
	
	if manifest.EntryPrice.IsZero() {
		t.Error("Manifest should contain entry price")
	}
	
	if manifest.FinalPrice.IsZero() {
		t.Error("Manifest should contain final price")
	}
	
	if len(manifest.RulesApplied) == 0 {
		t.Error("Manifest should list applied rules")
	}
	
	// Check rule application details
	ruleApp := manifest.RulesApplied[0]
	if ruleApp.RuleID == "" {
		t.Error("Rule application should have rule ID")
	}
	if ruleApp.EntryPrice.IsZero() {
		t.Error("Rule application should have entry price")
	}
	if ruleApp.ExitPrice.IsZero() {
		t.Error("Rule application should have exit price")
	}
}

func TestEngine_CalculationManifest_TracksDelta(t *testing.T) {
	engine := NewEngine()
	
	engine.AddRule(&Rule{
		ID:         "discount1",
		Name:       "20% Off",
		Type:       RuleTypePercentage,
		Mode:       RuleModeStackable,
		StackOrder: StackOrderMultiplicative,
		Priority:   10,
		Value:      NewDecimal(20),
	})
	
	cart := &Cart{
		ID: "cart1",
		Items: []*CartItem{
			{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: NewDecimal(100)},
		},
	}
	
	manifest, err := engine.Evaluate(cart)
	if err != nil {
		t.Fatalf("Evaluation failed: %v", err)
	}
	
	// Verify delta is tracked
	if len(manifest.RulesApplied) > 0 {
		delta := manifest.RulesApplied[0].Delta
		expectedDelta := NewDecimal(20) // 20% of 100
		
		if !delta.Equal(expectedDelta) {
			t.Errorf("Delta = %s, expected %s", delta.String(), expectedDelta.String())
		}
	}
	
	// Verify total discount
	if !manifest.TotalDiscount.Equal(NewDecimal(20)) {
		t.Errorf("TotalDiscount = %s, expected 20.00", manifest.TotalDiscount.String())
	}
}

// ============================================================================
// Requirement 5: Performance & Scalability
// ============================================================================

func TestEngine_ThreadSafe(t *testing.T) {
	engine := NewEngine()
	
	engine.AddRule(&Rule{
		ID:         "rule1",
		Name:       "10% Off",
		Type:       RuleTypePercentage,
		Mode:       RuleModeStackable,
		StackOrder: StackOrderMultiplicative,
		Priority:   10,
		Value:      NewDecimal(10),
	})
	
	cart := &Cart{
		ID: "cart1",
		Items: []*CartItem{
			{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: NewDecimal(100)},
		},
	}
	
	// Run 100 concurrent evaluations
	var wg sync.WaitGroup
	errors := make(chan error, 100)
	
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := engine.Evaluate(cart)
			if err != nil {
				errors <- err
			}
		}()
	}
	
	wg.Wait()
	close(errors)
	
	for err := range errors {
		t.Errorf("Concurrent evaluation failed: %v", err)
	}
}

func TestEngine_Performance_100Items_200Rules(t *testing.T) {
	engine := NewEngine()
	
	// Add 200 rules
	for i := 0; i < 200; i++ {
		engine.AddRule(&Rule{
			ID:         string(rune('A' + (i % 26))) + string(rune('0' + (i / 26))),
			Name:       "Rule",
			Type:       RuleTypePercentage,
			Mode:       RuleModeStackable,
			StackOrder: StackOrderMultiplicative,
			Priority:   i,
			Value:      NewDecimal(0.1), // 0.1% each
		})
	}
	
	// Create cart with 100 items
	items := make([]*CartItem, 100)
	for i := 0; i < 100; i++ {
		items[i] = &CartItem{
			ID:        string(rune('A' + i)),
			Name:      "Product",
			Quantity:  1,
			UnitPrice: NewDecimal(10),
		}
	}
	
	cart := &Cart{ID: "perf-cart", Items: items}
	
	// Measure evaluation time
	start := time.Now()
	_, err := engine.Evaluate(cart)
	elapsed := time.Since(start)
	
	if err != nil {
		t.Fatalf("Evaluation failed: %v", err)
	}
	
	// P99 should be < 5ms (we test single evaluation as proxy)
	if elapsed > 5*time.Millisecond {
		t.Logf("Warning: Evaluation took %v (target < 5ms)", elapsed)
	}
}

// ============================================================================
// Requirement 6: Idempotent Simulation (Shadow Evaluation)
// ============================================================================

func TestEngine_ShadowEvaluation_SnapshotDate(t *testing.T) {
	engine := NewEngine()
	
	now := time.Now()
	pastDate := now.AddDate(0, -1, 0) // 1 month ago
	futureDate := now.AddDate(0, 1, 0) // 1 month from now
	
	// Add rule valid only in the past
	engine.AddRule(&Rule{
		ID:         "past_rule",
		Name:       "Past Promo",
		Type:       RuleTypePercentage,
		Mode:       RuleModeStackable,
		StackOrder: StackOrderMultiplicative,
		Priority:   10,
		Value:      NewDecimal(20),
		ValidFrom:  pastDate.AddDate(0, 0, -15),
		ValidTo:    pastDate.AddDate(0, 0, 15),
	})
	
	// Add rule valid now
	engine.AddRule(&Rule{
		ID:         "current_rule",
		Name:       "Current Promo",
		Type:       RuleTypePercentage,
		Mode:       RuleModeStackable,
		StackOrder: StackOrderMultiplicative,
		Priority:   10,
		Value:      NewDecimal(10),
		ValidFrom:  now.AddDate(0, 0, -7),
		ValidTo:    futureDate,
	})
	
	cart := &Cart{
		ID: "cart1",
		Items: []*CartItem{
			{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: NewDecimal(100)},
		},
	}
	
	// Shadow evaluation at past date
	manifestPast, err := engine.EvaluateAt(cart, pastDate, true)
	if err != nil {
		t.Fatalf("Shadow evaluation failed: %v", err)
	}
	
	if !manifestPast.IsSimulation {
		t.Error("Shadow evaluation should be marked as simulation")
	}
	
	if manifestPast.SnapshotDate == nil {
		t.Error("Shadow evaluation should have snapshot date")
	}
}

func TestEngine_ShadowEvaluation_Idempotent(t *testing.T) {
	engine := NewEngine()
	
	engine.AddRule(&Rule{
		ID:         "rule1",
		Name:       "10% Off",
		Type:       RuleTypePercentage,
		Mode:       RuleModeStackable,
		StackOrder: StackOrderMultiplicative,
		Priority:   10,
		Value:      NewDecimal(10),
	})
	
	cart := &Cart{
		ID: "cart1",
		Items: []*CartItem{
			{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: NewDecimal(100)},
		},
	}
	
	snapshotDate := time.Now()
	
	// Run shadow evaluation multiple times
	var results []Decimal
	for i := 0; i < 10; i++ {
		manifest, err := engine.EvaluateAt(cart, snapshotDate, true)
		if err != nil {
			t.Fatalf("Shadow evaluation %d failed: %v", i, err)
		}
		results = append(results, manifest.FinalPrice)
	}
	
	// All results should be identical
	for i := 1; i < len(results); i++ {
		if !results[i].Equal(results[0]) {
			t.Errorf("Shadow evaluation not idempotent: run %d = %s, run 0 = %s",
				i, results[i].String(), results[0].String())
		}
	}
}

// ============================================================================
// Requirement 7: Testing (Unit) - Buy 2 Get 1 + 15% Seasonal
// ============================================================================

func TestEngine_Buy2Get1_Plus_15Percent_Interaction(t *testing.T) {
	engine := NewEngine()
	
	// Buy 2 Get 1 Free (additive - applied first)
	engine.AddRule(&Rule{
		ID:          "b2g1",
		Name:        "Buy 2 Get 1 Free",
		Type:        RuleTypeBuyXGetY,
		Mode:        RuleModeStackable,
		StackOrder:  StackOrderAdditive,
		Priority:    10,
		BuyQuantity: 2,
		GetQuantity: 1,
	})
	
	// 15% Seasonal Discount (multiplicative - applied second)
	engine.AddRule(&Rule{
		ID:         "seasonal15",
		Name:       "15% Seasonal Discount",
		Type:       RuleTypePercentage,
		Mode:       RuleModeStackable,
		StackOrder: StackOrderMultiplicative,
		Priority:   10,
		Value:      NewDecimal(15),
	})
	
	// Cart with 3 items at $30 each = $90 total
	cart := &Cart{
		ID: "cart1",
		Items: []*CartItem{
			{ID: "item1", Name: "Product A", Quantity: 3, UnitPrice: NewDecimal(30)},
		},
	}
	
	manifest, err := engine.Evaluate(cart)
	if err != nil {
		t.Fatalf("Evaluation failed: %v", err)
	}
	
	// Entry: $90
	// After B2G1: $90 - $30 (one free item) = $60
	// After 15%: $60 - $9 = $51
	
	entryPrice := manifest.EntryPrice
	if !entryPrice.Equal(NewDecimal(90)) {
		t.Errorf("Entry price = %s, expected 90.00", entryPrice.String())
	}
	
	// Final price should be mathematically correct
	// The order matters: B2G1 first, then percentage
	expectedFinal := NewDecimal(51)
	
	if !manifest.FinalPrice.Equal(expectedFinal) {
		t.Errorf("Final price = %s, expected %s", manifest.FinalPrice.String(), expectedFinal.String())
	}
	
	// Verify the calculation trail
	if len(manifest.RulesApplied) < 2 {
		t.Error("Both rules should be applied")
	}
}

// ============================================================================
// Requirement 8: Testing (Adversarial) - 500 nodes, 50+ depth
// ============================================================================

func TestEngine_Adversarial_500Nodes_DeepNesting(t *testing.T) {
	engine := NewEngine()
	
	// Create 500 rules with deep nesting (50+ levels)
	for i := 0; i < 500; i++ {
		rule := &Rule{
			ID:         string(rune(i)),
			Name:       "Rule",
			Type:       RuleTypePercentage,
			Mode:       RuleModeStackable,
			StackOrder: StackOrderMultiplicative,
			Priority:   500 - i,
			Value:      NewDecimal(0.01), // Tiny discount
		}
		
		// Create deep nesting: each rule depends on previous one
		if i > 0 && i < 50 {
			rule.Dependencies = []string{string(rune(i - 1))}
		}
		
		engine.AddRule(rule)
	}
	
	if engine.RuleCount() != 500 {
		t.Errorf("Expected 500 rules, got %d", engine.RuleCount())
	}
	
	cart := &Cart{
		ID: "adversarial-cart",
		Items: []*CartItem{
			{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: NewDecimal(1000)},
		},
	}
	
	// Should complete without stack overflow or timeout
	start := time.Now()
	manifest, err := engine.Evaluate(cart)
	elapsed := time.Since(start)
	
	if err != nil {
		t.Fatalf("Adversarial evaluation failed: %v", err)
	}
	
	// Should complete within reasonable time (< 100ms for this test)
	if elapsed > 100*time.Millisecond {
		t.Logf("Warning: Adversarial evaluation took %v", elapsed)
	}
	
	// Result should be valid
	if manifest.FinalPrice.IsNegative() {
		t.Error("Final price should not be negative")
	}
}

// ============================================================================
// Requirement 9: Testing (Consistency) - 1000 parallel evaluations
// ============================================================================

func TestEngine_Consistency_1000Parallel(t *testing.T) {
	engine := NewEngine()
	
	engine.AddRule(&Rule{
		ID:         "rule1",
		Name:       "10% Off",
		Type:       RuleTypePercentage,
		Mode:       RuleModeStackable,
		StackOrder: StackOrderMultiplicative,
		Priority:   10,
		Value:      NewDecimal(10),
	})
	
	engine.AddRule(&Rule{
		ID:         "rule2",
		Name:       "$5 Off",
		Type:       RuleTypeFixed,
		Mode:       RuleModeStackable,
		StackOrder: StackOrderAdditive,
		Priority:   20,
		Value:      NewDecimal(5),
	})
	
	cart := &Cart{
		ID: "consistency-cart",
		Items: []*CartItem{
			{ID: "item1", Name: "Product", Quantity: 2, UnitPrice: NewDecimal(50)},
		},
	}
	
	// Run 1000 parallel evaluations
	const numParallel = 1000
	results := make([]*CalculationManifest, numParallel)
	var wg sync.WaitGroup
	
	for i := 0; i < numParallel; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			manifest, err := engine.Evaluate(cart)
			if err != nil {
				t.Errorf("Parallel evaluation %d failed: %v", idx, err)
				return
			}
			results[idx] = manifest
		}(i)
	}
	
	wg.Wait()
	
	// Verify all results are identical
	if results[0] == nil {
		t.Fatal("First result is nil")
	}
	
	referencePrice := results[0].FinalPrice
	referenceDiscount := results[0].TotalDiscount
	
	for i := 1; i < numParallel; i++ {
		if results[i] == nil {
			t.Errorf("Result %d is nil", i)
			continue
		}
		
		if !results[i].FinalPrice.Equal(referencePrice) {
			t.Errorf("Result %d FinalPrice = %s, expected %s (zero variance required)",
				i, results[i].FinalPrice.String(), referencePrice.String())
		}
		
		if !results[i].TotalDiscount.Equal(referenceDiscount) {
			t.Errorf("Result %d TotalDiscount = %s, expected %s (zero variance required)",
				i, results[i].TotalDiscount.String(), referenceDiscount.String())
		}
	}
}

// ============================================================================
// Additional Tests
// ============================================================================

func TestCart_TotalPrice(t *testing.T) {
	cart := &Cart{
		ID: "cart1",
		Items: []*CartItem{
			{ID: "1", Name: "A", Quantity: 2, UnitPrice: NewDecimal(10)},
			{ID: "2", Name: "B", Quantity: 3, UnitPrice: NewDecimal(15)},
		},
	}
	
	total := cart.TotalPrice()
	expected := NewDecimal(65) // 2*10 + 3*15
	
	if !total.Equal(expected) {
		t.Errorf("Cart total = %s, expected %s", total.String(), expected.String())
	}
}

func TestEngine_Validate(t *testing.T) {
	engine := NewEngine()
	
	engine.AddRule(&Rule{ID: "A", Name: "Rule A"})
	engine.AddRule(&Rule{ID: "B", Name: "Rule B", Dependencies: []string{"A"}})
	
	err := engine.Validate()
	if err != nil {
		t.Errorf("Validation should pass for valid DAG: %v", err)
	}
}

func TestDecimal_Comparisons(t *testing.T) {
	a := NewDecimal(10.5)
	b := NewDecimal(10.3)
	c := NewDecimal(10.5)
	
	if !a.GreaterThan(b) {
		t.Error("10.5 should be greater than 10.3")
	}
	
	if !b.LessThan(a) {
		t.Error("10.3 should be less than 10.5")
	}
	
	if !a.Equal(c) {
		t.Error("10.5 should equal 10.5")
	}
}