// Package discountengine implements a high-precision, non-linear discount engine
// that evaluates a DAG of promotion rules with inter-dependencies.
package discountengine

import (
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"
)

// ============================================================================
// DECIMAL - Fixed-Point Arithmetic (avoid IEEE 754 floating-point errors)
// ============================================================================

// Decimal represents a fixed-point decimal number with 4 decimal places precision.
// Internally stored as int64 with implicit 4 decimal places (e.g., 1234 = 0.1234)
type Decimal struct {
	value int64 // value * 10000
}

const decimalScale = 10000

// NewDecimal creates a Decimal from a float64 (use for initialization only)
func NewDecimal(f float64) Decimal {
	return Decimal{value: int64(f * decimalScale)}
}

// NewDecimalFromCents creates a Decimal from cents (integer)
func NewDecimalFromCents(cents int64) Decimal {
	return Decimal{value: cents * 100} // cents to 4 decimal places
}

// NewDecimalFromInt creates a Decimal from an integer
func NewDecimalFromInt(i int64) Decimal {
	return Decimal{value: i * decimalScale}
}

// Add adds two Decimals
func (d Decimal) Add(other Decimal) Decimal {
	return Decimal{value: d.value + other.value}
}

// Sub subtracts two Decimals
func (d Decimal) Sub(other Decimal) Decimal {
	return Decimal{value: d.value - other.value}
}

// Mul multiplies two Decimals
func (d Decimal) Mul(other Decimal) Decimal {
	return Decimal{value: (d.value * other.value) / decimalScale}
}

// Div divides two Decimals
func (d Decimal) Div(other Decimal) Decimal {
	if other.value == 0 {
		return Decimal{value: 0}
	}
	return Decimal{value: (d.value * decimalScale) / other.value}
}

// MulInt multiplies Decimal by an integer
func (d Decimal) MulInt(i int64) Decimal {
	return Decimal{value: d.value * i}
}

// DivInt divides Decimal by an integer
func (d Decimal) DivInt(i int64) Decimal {
	if i == 0 {
		return Decimal{value: 0}
	}
	return Decimal{value: d.value / i}
}

// Percent returns d * (percent/100)
func (d Decimal) Percent(percent int64) Decimal {
	return Decimal{value: (d.value * percent) / 100}
}

// Round rounds to 2 decimal places (ISO-4217 standard for most currencies)
func (d Decimal) Round() Decimal {
	// Round to 2 decimal places (cents)
	remainder := d.value % 100
	rounded := d.value - remainder
	if remainder >= 50 {
		rounded += 100
	} else if remainder <= -50 {
		rounded -= 100
	}
	return Decimal{value: rounded}
}

// Float64 converts to float64 (for display/testing only)
func (d Decimal) Float64() float64 {
	return float64(d.value) / decimalScale
}

// Int64Cents returns value in cents
func (d Decimal) Int64Cents() int64 {
	return d.value / 100
}

// String returns string representation
func (d Decimal) String() string {
	whole := d.value / decimalScale
	frac := d.value % decimalScale
	if frac < 0 {
		frac = -frac
	}
	return fmt.Sprintf("%d.%04d", whole, frac)
}

// IsZero checks if decimal is zero
func (d Decimal) IsZero() bool {
	return d.value == 0
}

// IsNegative checks if decimal is negative
func (d Decimal) IsNegative() bool {
	return d.value < 0
}

// Equal checks equality
func (d Decimal) Equal(other Decimal) bool {
	return d.value == other.value
}

// LessThan compares decimals
func (d Decimal) LessThan(other Decimal) bool {
	return d.value < other.value
}

// GreaterThan compares decimals
func (d Decimal) GreaterThan(other Decimal) bool {
	return d.value > other.value
}

// ============================================================================
// RULE TYPES AND STRUCTURES
// ============================================================================

// RuleType defines the type of discount rule
type RuleType string

const (
	RuleTypePercentage RuleType = "PERCENTAGE"   // e.g., 15% off
	RuleTypeFixed      RuleType = "FIXED"        // e.g., $10 off
	RuleTypeBuyXGetY   RuleType = "BUY_X_GET_Y"  // e.g., Buy 2 Get 1 Free
	RuleTypeBundle     RuleType = "BUNDLE"       // Bundle discount
	RuleTypeSurge      RuleType = "SURGE"        // Regional surge pricing
)

// RuleMode defines how rules interact
type RuleMode string

const (
	RuleModeExclusive RuleMode = "EXCLUSIVE"  // Terminates further evaluation
	RuleModeStackable RuleMode = "STACKABLE"  // Can be combined with others
)

// StackOrder defines the order of stackable rule application
type StackOrder string

const (
	StackOrderAdditive       StackOrder = "ADDITIVE"       // Applied first
	StackOrderMultiplicative StackOrder = "MULTIPLICATIVE" // Applied after additive
)

// Rule represents a discount rule in the DAG
type Rule struct {
	ID           string
	Name         string
	Type         RuleType
	Mode         RuleMode
	StackOrder   StackOrder
	Priority     int           // Higher = evaluated first within same tier
	Dependencies []string      // IDs of rules this depends on
	Value        Decimal       // Discount value (percentage or fixed amount)
	BuyQuantity  int           // For BUY_X_GET_Y rules
	GetQuantity  int           // For BUY_X_GET_Y rules
	ValidFrom    time.Time     // Rule validity period
	ValidTo      time.Time
	Condition    func(*CartItem) bool // Optional condition for rule application
}

// IsValidAt checks if rule is valid at given time
func (r *Rule) IsValidAt(t time.Time) bool {
	if r.ValidFrom.IsZero() && r.ValidTo.IsZero() {
		return true
	}
	if !r.ValidFrom.IsZero() && t.Before(r.ValidFrom) {
		return false
	}
	if !r.ValidTo.IsZero() && t.After(r.ValidTo) {
		return false
	}
	return true
}

// CartItem represents an item in the shopping cart
type CartItem struct {
	ID        string
	ProductID string
	Name      string
	Quantity  int
	UnitPrice Decimal
	Category  string
	Tags      []string
}

// TotalPrice returns total price for the item
func (c *CartItem) TotalPrice() Decimal {
	return c.UnitPrice.MulInt(int64(c.Quantity))
}

// Cart represents a shopping cart
type Cart struct {
	ID        string
	Items     []*CartItem
	CreatedAt time.Time
}

// TotalPrice returns cart total before discounts
func (c *Cart) TotalPrice() Decimal {
	total := NewDecimalFromInt(0)
	for _, item := range c.Items {
		total = total.Add(item.TotalPrice())
	}
	return total
}

// ItemCount returns total item count
func (c *Cart) ItemCount() int {
	count := 0
	for _, item := range c.Items {
		count += item.Quantity
	}
	return count
}

// ============================================================================
// CALCULATION MANIFEST - Audit Trail
// ============================================================================

// RuleApplication records a single rule application
type RuleApplication struct {
	RuleID      string
	RuleName    string
	RuleType    RuleType
	EntryPrice  Decimal
	Delta       Decimal
	ExitPrice   Decimal
	AppliedAt   time.Time
	Description string
}

// CalculationManifest provides full audit trail for price calculation
type CalculationManifest struct {
	CartID           string
	EntryPrice       Decimal
	FinalPrice       Decimal
	TotalDiscount    Decimal
	RulesApplied     []RuleApplication
	RulesSkipped     []string
	EvaluationTime   time.Duration
	SnapshotDate     *time.Time // For shadow evaluation
	IsSimulation     bool
}

// ============================================================================
// DAG - Directed Acyclic Graph for Rule Dependencies
// ============================================================================

// DAG represents the rule dependency graph
type DAG struct {
	rules    map[string]*Rule
	adjList  map[string][]string // rule -> rules that depend on it
	inDegree map[string]int      // incoming edge count for each rule
	mu       sync.RWMutex
}

// NewDAG creates a new empty DAG
func NewDAG() *DAG {
	return &DAG{
		rules:    make(map[string]*Rule),
		adjList:  make(map[string][]string),
		inDegree: make(map[string]int),
	}
}

// AddRule adds a rule to the DAG
func (d *DAG) AddRule(rule *Rule) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if _, exists := d.rules[rule.ID]; exists {
		return fmt.Errorf("rule %s already exists", rule.ID)
	}

	d.rules[rule.ID] = rule
	d.inDegree[rule.ID] = len(rule.Dependencies)

	// Add edges for dependencies
	for _, depID := range rule.Dependencies {
		d.adjList[depID] = append(d.adjList[depID], rule.ID)
	}

	return nil
}

// DetectCycle detects circular dependencies using DFS
func (d *DAG) DetectCycle() error {
	d.mu.RLock()
	defer d.mu.RUnlock()

	visited := make(map[string]bool)
	recStack := make(map[string]bool)

	var dfs func(nodeID string) bool
	dfs = func(nodeID string) bool {
		visited[nodeID] = true
		recStack[nodeID] = true

		rule, exists := d.rules[nodeID]
		if !exists {
			return false
		}

		for _, depID := range rule.Dependencies {
			if !visited[depID] {
				if dfs(depID) {
					return true
				}
			} else if recStack[depID] {
				return true // Cycle detected
			}
		}

		recStack[nodeID] = false
		return false
	}

	for nodeID := range d.rules {
		if !visited[nodeID] {
			if dfs(nodeID) {
				return errors.New("circular dependency detected in rule graph")
			}
		}
	}

	return nil
}

// TopologicalSort returns rules in dependency order
func (d *DAG) TopologicalSort() ([]*Rule, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	if err := d.DetectCycle(); err != nil {
		return nil, err
	}

	inDegree := make(map[string]int)
	for id, deg := range d.inDegree {
		inDegree[id] = deg
	}

	// Find all rules with no dependencies
	var queue []string
	for id, deg := range inDegree {
		if deg == 0 {
			queue = append(queue, id)
		}
	}

	var sorted []*Rule
	for len(queue) > 0 {
		// Sort by priority within same tier
		sort.Slice(queue, func(i, j int) bool {
			return d.rules[queue[i]].Priority > d.rules[queue[j]].Priority
		})

		nodeID := queue[0]
		queue = queue[1:]
		sorted = append(sorted, d.rules[nodeID])

		for _, dependent := range d.adjList[nodeID] {
			inDegree[dependent]--
			if inDegree[dependent] == 0 {
				queue = append(queue, dependent)
			}
		}
	}

	if len(sorted) != len(d.rules) {
		return nil, errors.New("circular dependency detected")
	}

	return sorted, nil
}

// GetRule returns a rule by ID
func (d *DAG) GetRule(id string) (*Rule, bool) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	rule, exists := d.rules[id]
	return rule, exists
}

// GetRulesValidAt returns rules valid at a specific time
func (d *DAG) GetRulesValidAt(t time.Time) []*Rule {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var valid []*Rule
	for _, rule := range d.rules {
		if rule.IsValidAt(t) {
			valid = append(valid, rule)
		}
	}
	return valid
}

// RuleCount returns number of rules
func (d *DAG) RuleCount() int {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return len(d.rules)
}

// ============================================================================
// DISCOUNT ENGINE
// ============================================================================

// Engine is the main discount resolution engine
type Engine struct {
	dag *DAG
	mu  sync.RWMutex
}

// NewEngine creates a new discount engine
func NewEngine() *Engine {
	return &Engine{
		dag: NewDAG(),
	}
}

// AddRule adds a rule to the engine
func (e *Engine) AddRule(rule *Rule) error {
	return e.dag.AddRule(rule)
}

// Validate validates the rule graph (detects cycles)
func (e *Engine) Validate() error {
	return e.dag.DetectCycle()
}

// RuleCount returns number of rules
func (e *Engine) RuleCount() int {
	return e.dag.RuleCount()
}

// Evaluate evaluates discounts for a cart
func (e *Engine) Evaluate(cart *Cart) (*CalculationManifest, error) {
	return e.EvaluateAt(cart, time.Now(), false)
}

// EvaluateAt evaluates discounts for a cart at a specific time (shadow evaluation)
func (e *Engine) EvaluateAt(cart *Cart, snapshotDate time.Time, isSimulation bool) (*CalculationManifest, error) {
	startTime := time.Now()

	manifest := &CalculationManifest{
		CartID:       cart.ID,
		EntryPrice:   cart.TotalPrice(),
		IsSimulation: isSimulation,
	}

	if isSimulation {
		manifest.SnapshotDate = &snapshotDate
	}

	// Get rules in topological order
	sortedRules, err := e.dag.TopologicalSort()
	if err != nil {
		return nil, err
	}

	// Filter rules valid at snapshot date
	var validRules []*Rule
	for _, rule := range sortedRules {
		if rule.IsValidAt(snapshotDate) {
			validRules = append(validRules, rule)
		}
	}

	// Separate additive and multiplicative stackable rules
	var additiveRules, multiplicativeRules, exclusiveRules []*Rule
	for _, rule := range validRules {
		switch rule.Mode {
		case RuleModeExclusive:
			exclusiveRules = append(exclusiveRules, rule)
		case RuleModeStackable:
			if rule.StackOrder == StackOrderAdditive {
				additiveRules = append(additiveRules, rule)
			} else {
				multiplicativeRules = append(multiplicativeRules, rule)
			}
		}
	}

	// Sort by priority within each group
	sortByPriority := func(rules []*Rule) {
		sort.Slice(rules, func(i, j int) bool {
			return rules[i].Priority > rules[j].Priority
		})
	}
	sortByPriority(additiveRules)
	sortByPriority(multiplicativeRules)
	sortByPriority(exclusiveRules)

	currentPrice := manifest.EntryPrice
	exclusiveTriggered := false

	// Apply rules in order: additive first, then multiplicative
	allRules := append(additiveRules, multiplicativeRules...)

	for _, rule := range allRules {
		if exclusiveTriggered {
			manifest.RulesSkipped = append(manifest.RulesSkipped, rule.ID)
			continue
		}

		// Check exclusive rules
		for _, exRule := range exclusiveRules {
			if e.shouldApplyRule(exRule, cart, currentPrice) {
				entryPrice := currentPrice
				currentPrice, _ = e.applyRule(exRule, cart, currentPrice)
				delta := entryPrice.Sub(currentPrice)

				manifest.RulesApplied = append(manifest.RulesApplied, RuleApplication{
					RuleID:      exRule.ID,
					RuleName:    exRule.Name,
					RuleType:    exRule.Type,
					EntryPrice:  entryPrice,
					Delta:       delta,
					ExitPrice:   currentPrice,
					AppliedAt:   time.Now(),
					Description: fmt.Sprintf("Exclusive rule %s applied", exRule.Name),
				})

				exclusiveTriggered = true
				break
			}
		}

		if exclusiveTriggered {
			manifest.RulesSkipped = append(manifest.RulesSkipped, rule.ID)
			continue
		}

		if e.shouldApplyRule(rule, cart, currentPrice) {
			entryPrice := currentPrice
			currentPrice, _ = e.applyRule(rule, cart, currentPrice)
			delta := entryPrice.Sub(currentPrice)

			manifest.RulesApplied = append(manifest.RulesApplied, RuleApplication{
				RuleID:      rule.ID,
				RuleName:    rule.Name,
				RuleType:    rule.Type,
				EntryPrice:  entryPrice,
				Delta:       delta,
				ExitPrice:   currentPrice,
				AppliedAt:   time.Now(),
				Description: fmt.Sprintf("Rule %s applied: %s", rule.Name, rule.Type),
			})
		} else {
			manifest.RulesSkipped = append(manifest.RulesSkipped, rule.ID)
		}
	}

	manifest.FinalPrice = currentPrice.Round()
	manifest.TotalDiscount = manifest.EntryPrice.Sub(manifest.FinalPrice)
	manifest.EvaluationTime = time.Since(startTime)

	return manifest, nil
}

// shouldApplyRule checks if a rule should be applied
func (e *Engine) shouldApplyRule(rule *Rule, cart *Cart, currentPrice Decimal) bool {
	if rule.Condition != nil {
		for _, item := range cart.Items {
			if rule.Condition(item) {
				return true
			}
		}
		return false
	}
	return true
}

// applyRule applies a single rule and returns new price
func (e *Engine) applyRule(rule *Rule, cart *Cart, currentPrice Decimal) (Decimal, error) {
	switch rule.Type {
	case RuleTypePercentage:
		discount := currentPrice.Mul(rule.Value).Div(NewDecimalFromInt(100))
		return currentPrice.Sub(discount), nil

	case RuleTypeFixed:
		return currentPrice.Sub(rule.Value), nil

	case RuleTypeBuyXGetY:
		return e.applyBuyXGetY(rule, cart, currentPrice)

	case RuleTypeBundle:
		discount := currentPrice.Mul(rule.Value).Div(NewDecimalFromInt(100))
		return currentPrice.Sub(discount), nil

	case RuleTypeSurge:
		// Surge increases price
		surcharge := currentPrice.Mul(rule.Value).Div(NewDecimalFromInt(100))
		return currentPrice.Add(surcharge), nil

	default:
		return currentPrice, nil
	}
}

// applyBuyXGetY applies Buy X Get Y Free logic
func (e *Engine) applyBuyXGetY(rule *Rule, cart *Cart, currentPrice Decimal) (Decimal, error) {
	totalQuantity := cart.ItemCount()
	if totalQuantity < rule.BuyQuantity+rule.GetQuantity {
		return currentPrice, nil
	}

	// Calculate how many free items
	sets := totalQuantity / (rule.BuyQuantity + rule.GetQuantity)
	freeItems := sets * rule.GetQuantity

	// Find cheapest items to make free
	var prices []Decimal
	for _, item := range cart.Items {
		for i := 0; i < item.Quantity; i++ {
			prices = append(prices, item.UnitPrice)
		}
	}
	sort.Slice(prices, func(i, j int) bool {
		return prices[i].LessThan(prices[j])
	})

	discount := NewDecimalFromInt(0)
	for i := 0; i < freeItems && i < len(prices); i++ {
		discount = discount.Add(prices[i])
	}

	return currentPrice.Sub(discount), nil
}

// EvaluateParallel evaluates multiple carts in parallel
func (e *Engine) EvaluateParallel(carts []*Cart) ([]*CalculationManifest, error) {
	results := make([]*CalculationManifest, len(carts))
	errors := make([]error, len(carts))

	var wg sync.WaitGroup
	for i, cart := range carts {
		wg.Add(1)
		go func(idx int, c *Cart) {
			defer wg.Done()
			manifest, err := e.Evaluate(c)
			results[idx] = manifest
			errors[idx] = err
		}(i, cart)
	}
	wg.Wait()

	for _, err := range errors {
		if err != nil {
			return results, err
		}
	}

	return results, nil
}