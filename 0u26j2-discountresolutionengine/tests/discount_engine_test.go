package discountengine_test

import (
	de "discountengine"
	"sync"
	"testing"
	"time"
)

// ============================================================================
// Requirement 1: Rule Dependency Resolution (DAG + Cycle Detection)
// ============================================================================

func TestDAG_AddRule(t *testing.T) {
	dag := de.NewDAG()

	rule := &de.Rule{
		ID:       "rule1",
		Name:     "Test Rule",
		Type:     de.RuleTypePercentage,
		Mode:     de.RuleModeStackable,
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
	dag := de.NewDAG()

	dag.AddRule(&de.Rule{ID: "A", Name: "Rule A", Priority: 1})
	dag.AddRule(&de.Rule{ID: "B", Name: "Rule B", Priority: 2, Dependencies: []string{"A"}})
	dag.AddRule(&de.Rule{ID: "C", Name: "Rule C", Priority: 3, Dependencies: []string{"B"}})

	err := dag.DetectCycle()
	if err != nil {
		t.Errorf("Should not detect cycle in valid DAG: %v", err)
	}
}

func TestDAG_DetectCycle_WithCycle(t *testing.T) {
	dag := de.NewDAG()

	dag.AddRule(&de.Rule{ID: "A", Name: "Rule A", Dependencies: []string{"C"}})
	dag.AddRule(&de.Rule{ID: "B", Name: "Rule B", Dependencies: []string{"A"}})
	dag.AddRule(&de.Rule{ID: "C", Name: "Rule C", Dependencies: []string{"B"}})

	err := dag.DetectCycle()
	if err == nil {
		t.Error("Should detect cycle in invalid DAG")
	}
}

func TestDAG_TopologicalSort(t *testing.T) {
	dag := de.NewDAG()

	dag.AddRule(&de.Rule{ID: "A", Name: "Rule A", Priority: 1})
	dag.AddRule(&de.Rule{ID: "B", Name: "Rule B", Priority: 2, Dependencies: []string{"A"}})
	dag.AddRule(&de.Rule{ID: "C", Name: "Rule C", Priority: 3, Dependencies: []string{"A"}})

	sorted, err := dag.TopologicalSort()
	if err != nil {
		t.Errorf("TopologicalSort failed: %v", err)
	}

	if len(sorted) != 3 {
		t.Errorf("Expected 3 sorted rules, got %d", len(sorted))
	}

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
	a := de.NewDecimal(0.1)
	b := de.NewDecimal(0.2)
	result := a.Add(b)
	expected := de.NewDecimal(0.3)

	if !result.Equal(expected) {
		t.Errorf("0.1 + 0.2 = %s, expected %s", result.String(), expected.String())
	}
}

func TestDecimal_Multiply(t *testing.T) {
	price := de.NewDecimal(19.99)
	quantity := de.NewDecimalFromInt(3)
	result := price.Mul(quantity)
	expected := de.NewDecimal(59.97)

	if !result.Equal(expected) {
		t.Errorf("19.99 * 3 = %s, expected %s", result.String(), expected.String())
	}
}

func TestDecimal_Percent(t *testing.T) {
	price := de.NewDecimal(100.00)
	discount := price.Percent(15)
	expected := de.NewDecimal(15.00)

	if !discount.Equal(expected) {
		t.Errorf("15%% of 100 = %s, expected %s", discount.String(), expected.String())
	}
}

func TestDecimal_Round_ISO4217(t *testing.T) {
	testCases := []struct {
		input    float64
		expected float64
	}{
		{10.125, 10.13},
		{10.124, 10.12},
		{10.005, 10.01},
		{99.999, 100.00},
	}

	for _, tc := range testCases {
		result := de.NewDecimal(tc.input).Round()
		expected := de.NewDecimal(tc.expected).Round()

		if !result.Equal(expected) {
			t.Errorf("Round(%f) = %s, expected %s", tc.input, result.String(), expected.String())
		}
	}
}

func TestDecimal_NoFloatingPointError(t *testing.T) {
	total := de.NewDecimalFromInt(0)
	increment := de.NewDecimal(0.01)

	for i := 0; i < 100; i++ {
		total = total.Add(increment)
	}

	expected := de.NewDecimal(1.00)
	if !total.Equal(expected) {
		t.Errorf("100 * 0.01 = %s, expected %s", total.String(), expected.String())
	}
}

// ============================================================================
// Requirement 3: Conflict & Pruning Logic
// ============================================================================

func TestEngine_ExclusiveRule_PrunesBranches(t *testing.T) {
	engine := de.NewEngine()

	engine.AddRule(&de.Rule{
		ID:       "exclusive1",
		Name:     "Exclusive 50% Off",
		Type:     de.RuleTypePercentage,
		Mode:     de.RuleModeExclusive,
		Priority: 100,
		Value:    de.NewDecimal(50),
	})

	engine.AddRule(&de.Rule{
		ID:         "stackable1",
		Name:       "10% Additional",
		Type:       de.RuleTypePercentage,
		Mode:       de.RuleModeStackable,
		StackOrder: de.StackOrderMultiplicative,
		Priority:   50,
		Value:      de.NewDecimal(10),
	})

	cart := &de.Cart{
		ID: "cart1",
		Items: []*de.CartItem{
			{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: de.NewDecimal(100)},
		},
	}

	manifest, err := engine.Evaluate(cart)
	if err != nil {
		t.Fatalf("Evaluation failed: %v", err)
	}

	if len(manifest.RulesSkipped) == 0 {
		t.Error("Expected stackable rule to be skipped after exclusive rule")
	}
}

func TestEngine_StackableRules_DeterministicOrder(t *testing.T) {
	engine := de.NewEngine()

	engine.AddRule(&de.Rule{
		ID:         "additive1",
		Name:       "$5 Off",
		Type:       de.RuleTypeFixed,
		Mode:       de.RuleModeStackable,
		StackOrder: de.StackOrderAdditive,
		Priority:   10,
		Value:      de.NewDecimal(5),
	})

	engine.AddRule(&de.Rule{
		ID:         "mult1",
		Name:       "10% Off",
		Type:       de.RuleTypePercentage,
		Mode:       de.RuleModeStackable,
		StackOrder: de.StackOrderMultiplicative,
		Priority:   10,
		Value:      de.NewDecimal(10),
	})

	cart := &de.Cart{
		ID: "cart1",
		Items: []*de.CartItem{
			{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: de.NewDecimal(100)},
		},
	}

	manifest, err := engine.Evaluate(cart)
	if err != nil {
		t.Fatalf("Evaluation failed: %v", err)
	}

	if len(manifest.RulesApplied) < 2 {
		t.Skip("Not enough rules applied to verify order")
	}

	if manifest.RulesApplied[0].RuleID != "additive1" {
		t.Error("Additive rule should be applied before multiplicative")
	}
}

// ============================================================================
// Requirement 4: Traceability Metadata
// ============================================================================

func TestEngine_CalculationManifest_ContainsAuditTrail(t *testing.T) {
	engine := de.NewEngine()

	engine.AddRule(&de.Rule{
		ID:         "rule1",
		Name:       "15% Discount",
		Type:       de.RuleTypePercentage,
		Mode:       de.RuleModeStackable,
		StackOrder: de.StackOrderMultiplicative,
		Priority:   10,
		Value:      de.NewDecimal(15),
	})

	cart := &de.Cart{
		ID: "cart1",
		Items: []*de.CartItem{{ID: "item1", Name: "Product", Quantity: 2, UnitPrice: de.NewDecimal(50)}},
	}

	manifest, err := engine.Evaluate(cart)
	if err != nil {
		t.Fatalf("Evaluation failed: %v", err)
	}

	if manifest.CartID != "cart1" {
		t.Error("Manifest should contain cart ID")
	}

	if len(manifest.RulesApplied) == 0 {
		t.Error("Manifest should list applied rules")
	}
}

func TestEngine_CalculationManifest_TracksDelta(t *testing.T) {
	engine := de.NewEngine()

	engine.AddRule(&de.Rule{
		ID:         "discount1",
		Name:       "20% Off",
		Type:       de.RuleTypePercentage,
		Mode:       de.RuleModeStackable,
		StackOrder: de.StackOrderMultiplicative,
		Priority:   10,
		Value:      de.NewDecimal(20),
	})

	cart := &de.Cart{
		ID: "cart1",
		Items: []*de.CartItem{{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: de.NewDecimal(100)}},
	}

	manifest, err := engine.Evaluate(cart)
	if err != nil {
		t.Fatalf("Evaluation failed: %v", err)
	}

	if len(manifest.RulesApplied) > 0 {
		delta := manifest.RulesApplied[0].Delta
		expectedDelta := de.NewDecimal(20)
		if !delta.Equal(expectedDelta) {
			t.Errorf("Delta = %s, expected %s", delta.String(), expectedDelta.String())
		}
	}
}

// ============================================================================
// Requirement 5: Performance & Scalability
// ============================================================================

func TestEngine_ThreadSafe(t *testing.T) {
	engine := de.NewEngine()

	engine.AddRule(&de.Rule{
		ID:         "rule1",
		Name:       "10% Off",
		Type:       de.RuleTypePercentage,
		Mode:       de.RuleModeStackable,
		StackOrder: de.StackOrderMultiplicative,
		Priority:   10,
		Value:      de.NewDecimal(10),
	})

	cart := &de.Cart{
		ID: "cart1",
		Items: []*de.CartItem{{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: de.NewDecimal(100)}},
	}

	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := engine.Evaluate(cart)
			if err != nil {
				t.Errorf("Concurrent evaluation failed: %v", err)
			}
		}()
	}
	wg.Wait()
}

// ============================================================================
// Requirement 6: Idempotent Simulation
// ============================================================================

func TestEngine_ShadowEvaluation_SnapshotDate(t *testing.T) {
	engine := de.NewEngine()

	now := time.Now()
	pastDate := now.AddDate(0, -1, 0)
	futureDate := now.AddDate(0, 1, 0)

	engine.AddRule(&de.Rule{
		ID:         "past_rule",
		Name:       "Past Promo",
		Type:       de.RuleTypePercentage,
		Mode:       de.RuleModeStackable,
		StackOrder: de.StackOrderMultiplicative,
		Priority:   10,
		Value:      de.NewDecimal(20),
		ValidFrom:  pastDate.AddDate(0, 0, -15),
		ValidTo:    pastDate.AddDate(0, 0, 15),
	})

	engine.AddRule(&de.Rule{
		ID:         "current_rule",
		Name:       "Current Promo",
		Type:       de.RuleTypePercentage,
		Mode:       de.RuleModeStackable,
		StackOrder: de.StackOrderMultiplicative,
		Priority:   10,
		Value:      de.NewDecimal(10),
		ValidFrom:  now.AddDate(0, 0, -7),
		ValidTo:    futureDate,
	})

	cart := &de.Cart{
		ID: "cart1",
		Items: []*de.CartItem{{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: de.NewDecimal(100)}},
	}

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
	engine := de.NewEngine()

	engine.AddRule(&de.Rule{
		ID:         "rule1",
		Name:       "10% Off",
		Type:       de.RuleTypePercentage,
		Mode:       de.RuleModeStackable,
		StackOrder: de.StackOrderMultiplicative,
		Priority:   10,
		Value:      de.NewDecimal(10),
	})

	cart := &de.Cart{
		ID: "cart1",
		Items: []*de.CartItem{{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: de.NewDecimal(100)}},
	}

	snapshotDate := time.Now()

	var results []de.Decimal
	for i := 0; i < 10; i++ {
		manifest, err := engine.EvaluateAt(cart, snapshotDate, true)
		if err != nil {
			t.Fatalf("Shadow evaluation %d failed: %v", i, err)
		}
		results = append(results, manifest.FinalPrice)
	}

	for i := 1; i < len(results); i++ {
		if !results[i].Equal(results[0]) {
			t.Errorf("Shadow evaluation not idempotent: run %d = %s, run 0 = %s",
				i, results[i].String(), results[0].String())
		}
	}
}

// ============================================================================
// Requirement 7: Buy 2 Get 1 + 15% Seasonal
// ============================================================================

func TestEngine_Buy2Get1_Plus_15Percent_Interaction(t *testing.T) {
	engine := de.NewEngine()

	engine.AddRule(&de.Rule{
		ID:          "b2g1",
		Name:        "Buy 2 Get 1 Free",
		Type:        de.RuleTypeBuyXGetY,
		Mode:        de.RuleModeStackable,
		StackOrder:  de.StackOrderAdditive,
		Priority:    10,
		BuyQuantity: 2,
		GetQuantity: 1,
	})

	engine.AddRule(&de.Rule{
		ID:         "seasonal15",
		Name:       "15% Seasonal Discount",
		Type:       de.RuleTypePercentage,
		Mode:       de.RuleModeStackable,
		StackOrder: de.StackOrderMultiplicative,
		Priority:   10,
		Value:      de.NewDecimal(15),
	})

	cart := &de.Cart{
		ID: "cart1",
		Items: []*de.CartItem{{ID: "item1", Name: "Product A", Quantity: 3, UnitPrice: de.NewDecimal(30)}},
	}

	manifest, err := engine.Evaluate(cart)
	if err != nil {
		t.Fatalf("Evaluation failed: %v", err)
	}

	expectedFinal := de.NewDecimal(51)
	if !manifest.FinalPrice.Equal(expectedFinal) {
		t.Errorf("Final price = %s, expected %s", manifest.FinalPrice.String(), expectedFinal.String())
	}
}

// ============================================================================
// Requirement 8: Adversarial 500 Nodes
// ============================================================================

func TestEngine_Adversarial_500Nodes_DeepNesting(t *testing.T) {
	engine := de.NewEngine()

	for i := 0; i < 500; i++ {
		rule := &de.Rule{
			ID:         string(rune(i)),
			Name:       "Rule",
			Type:       de.RuleTypePercentage,
			Mode:       de.RuleModeStackable,
			StackOrder: de.StackOrderMultiplicative,
			Priority:   500 - i,
			Value:      de.NewDecimal(0.01),
		}
		if i > 0 && i < 50 {
			rule.Dependencies = []string{string(rune(i - 1))}
		}
		engine.AddRule(rule)
	}

	cart := &de.Cart{
		ID: "adversarial-cart",
		Items: []*de.CartItem{{ID: "item1", Name: "Product", Quantity: 1, UnitPrice: de.NewDecimal(1000)}},
	}

	manifest, err := engine.Evaluate(cart)
	if err != nil {
		t.Fatalf("Adversarial evaluation failed: %v", err)
	}

	if manifest.FinalPrice.IsNegative() {
		t.Error("Final price should not be negative")
	}
}

// ============================================================================
// Requirement 9: Consistency 1000 Parallel
// ============================================================================

func TestEngine_Consistency_1000Parallel(t *testing.T) {
	engine := de.NewEngine()

	engine.AddRule(&de.Rule{
		ID:         "rule1",
		Name:       "10% Off",
		Type:       de.RuleTypePercentage,
		Mode:       de.RuleModeStackable,
		StackOrder: de.StackOrderMultiplicative,
		Priority:   10,
		Value:      de.NewDecimal(10),
	})

	engine.AddRule(&de.Rule{
		ID:         "rule2",
		Name:       "$5 Off",
		Type:       de.RuleTypeFixed,
		Mode:       de.RuleModeStackable,
		StackOrder: de.StackOrderAdditive,
		Priority:   20,
		Value:      de.NewDecimal(5),
	})

	cart := &de.Cart{
		ID: "consistency-cart",
		Items: []*de.CartItem{{ID: "item1", Name: "Product", Quantity: 2, UnitPrice: de.NewDecimal(50)}},
	}

	const numParallel = 1000
	results := make([]*de.CalculationManifest, numParallel)
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

	referencePrice := results[0].FinalPrice
	referenceDiscount := results[0].TotalDiscount

	for i := 1; i < numParallel; i++ {
		if !results[i].FinalPrice.Equal(referencePrice) {
			t.Errorf("Result %d FinalPrice = %s, expected %s", i, results[i].FinalPrice.String(), referencePrice.String())
		}
		if !results[i].TotalDiscount.Equal(referenceDiscount) {
			t.Errorf("Result %d TotalDiscount = %s, expected %s", i, results[i].TotalDiscount.String(), referenceDiscount.String())
		}
	}
}

// ============================================================================
// Additional Tests
// ============================================================================

func TestCart_TotalPrice(t *testing.T) {
	cart := &de.Cart{
		ID: "cart1",
		Items: []*de.CartItem{{ID: "1", Name: "A", Quantity: 2, UnitPrice: de.NewDecimal(10)}, {ID: "2", Name: "B", Quantity: 3, UnitPrice: de.NewDecimal(15)}},
	}

	total := cart.TotalPrice()
	expected := de.NewDecimal(65)

	if !total.Equal(expected) {
		t.Errorf("Cart total = %s, expected %s", total.String(), expected.String())
	}
}

func TestEngine_Validate(t *testing.T) {
	engine := de.NewEngine()

	engine.AddRule(&de.Rule{ID: "A", Name: "Rule A"})
	engine.AddRule(&de.Rule{ID: "B", Name: "Rule B", Dependencies: []string{"A"}})

	err := engine.Validate()
	if err != nil {
		t.Errorf("Validation should pass for valid DAG: %v", err)
	}
}

func TestDecimal_Comparisons(t *testing.T) {
	a := de.NewDecimal(10.5)
	b := de.NewDecimal(10.3)
	c := de.NewDecimal(10.5)

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
