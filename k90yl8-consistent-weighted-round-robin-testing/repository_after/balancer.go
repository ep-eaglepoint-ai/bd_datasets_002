package repository

import (
	"sync"
)

// Node defines a backend target with a dynamic weight and health status.
type Node struct {
	ID      string
	Weight  int
	Healthy bool
}

// DynamicWeightedBalancer manages the stateful IWRR selection logic.
type DynamicWeightedBalancer struct {
	nodes         []*Node
	currentIndex  int
	currentWeight int
	maxWeight     int
	gcdWeight     int
	mu            sync.Mutex
}

// NewDynamicWeightedBalancer initializes the balancer for a given set of nodes.
func NewDynamicWeightedBalancer(nodes []*Node) *DynamicWeightedBalancer {
	b := &DynamicWeightedBalancer{
		nodes:        nodes,
		currentIndex: -1,
	}
	b.recalculateGains()
	return b
}

// recalculateGains updates internal GCD and MaxWeight parameters.
func (b *DynamicWeightedBalancer) recalculateGains() {
	maxW := 0
	g := 0
	for _, n := range b.nodes {
		if n.Weight > maxW {
			maxW = n.Weight
		}
		if g == 0 {
			g = n.Weight
		} else if n.Weight > 0 {
			g = gcd(g, n.Weight)
		}
	}
	b.maxWeight = maxW
	b.gcdWeight = g
	if b.gcdWeight == 0 {
		b.gcdWeight = 1
	}
}

func gcd(a, b int) int {
	for b != 0 {
		a, b = b, a%b
	}
	return a
}

// UpdateWeights allows for live reconfiguration of node weights and health.
func (b *DynamicWeightedBalancer) UpdateWeights(newNodes []*Node) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.nodes = newNodes
	b.recalculateGains()
	if len(b.nodes) > 0 && b.currentIndex >= len(b.nodes) {
		b.currentIndex = b.currentIndex % len(b.nodes)
	}
}

// GetNextNode selects the next node using Interleaved Weighted Round Robin logic.
func (b *DynamicWeightedBalancer) GetNextNode() string {
	b.mu.Lock()
	defer b.mu.Unlock()

	n := len(b.nodes)
	if n == 0 {
		return ""
	}

	if b.maxWeight == 0 {
		return ""
	}

	for i := 0; i < n*b.maxWeight; i++ {
		b.currentIndex = (b.currentIndex + 1) % n
		if b.currentIndex == 0 {
			b.currentWeight = b.currentWeight - b.gcdWeight
			if b.currentWeight <= 0 {
				b.currentWeight = b.maxWeight
				if b.currentWeight == 0 {
					return ""
				}
			}
		}

		node := b.nodes[b.currentIndex]
		if node.Healthy && node.Weight >= b.currentWeight {
			return node.ID
		}
	}
	return ""
}

// GetCurrentState returns internal state for testing purposes
func (b *DynamicWeightedBalancer) GetCurrentState() (int, int, int, int) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.currentIndex, b.currentWeight, b.maxWeight, b.gcdWeight
}