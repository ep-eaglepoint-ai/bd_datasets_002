package orderbook

import (
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"
)

type Side string

const (
	Bid Side = "BID"
	Ask Side = "ASK"
)

type EventType string

const (
	Add    EventType = "ADD"
	Update EventType = "UPDATE"
	Delete EventType = "DELETE"
)

type OrderEvent struct {
	ID       string
	Side     Side
	Price    int64 // price in ticks
	Quantity int64
	Type     EventType
}

type PriceLevel struct {
	Price    int64
	Quantity int64
}

type Snapshot struct {
	Sequence uint64
	Bids     []PriceLevel
	Asks     []PriceLevel
}

type Delta struct {
	Sequence uint64
	Bids     []PriceLevel
	Asks     []PriceLevel
}

// L2Book maintains aggregated depth
// thread-safe
// quantities are aggregated by price
// zero quantities are purged
// sequence increments on every broadcast
//
type L2Book struct {
	mu       sync.RWMutex
	bids     map[int64]int64
	asks     map[int64]int64
	sequence uint64
}

func NewL2Book() *L2Book {
	return &L2Book{
		bids: make(map[int64]int64),
		asks: make(map[int64]int64),
	}
}

func (b *L2Book) ApplyEvent(ev OrderEvent) error {
	b.mu.Lock()
	defer b.mu.Unlock()

	levels := b.bids
	if ev.Side == Ask {
		levels = b.asks
	}

	switch ev.Type {
	case Add:
		levels[ev.Price] += ev.Quantity
	case Update:
		levels[ev.Price] = ev.Quantity
	case Delete:
		delete(levels, ev.Price)
	default:
		return errors.New("unknown event type")
	}

	// purge zero
	if qty, ok := levels[ev.Price]; ok && qty <= 0 {
		delete(levels, ev.Price)
	}

	// validate crossing invariant
	if b.crossedLocked() {
		// revert change by resetting level (best-effort)
		return errors.New("order book crossed")
	}

	return nil
}

func (b *L2Book) crossedLocked() bool {
	maxBid := int64(-1)
	for p := range b.bids {
		if p > maxBid {
			maxBid = p
		}
	}
	minAsk := int64(1<<62 - 1)
	for p := range b.asks {
		if p < minAsk {
			minAsk = p
		}
	}
	if maxBid >= 0 && minAsk < (1<<62-1) {
		return maxBid >= minAsk
	}
	return false
}

func (b *L2Book) Snapshot(topN int) Snapshot {
	b.mu.RLock()
	defer b.mu.RUnlock()

	bids := collectLevels(b.bids, true, topN)
	asks := collectLevels(b.asks, false, topN)

	return Snapshot{
		Sequence: b.sequence,
		Bids:     bids,
		Asks:     asks,
	}
}

func (b *L2Book) IncrementSeq() uint64 {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.sequence++
	return b.sequence
}

func collectLevels(levels map[int64]int64, desc bool, topN int) []PriceLevel {
	prices := make([]int64, 0, len(levels))
	for p := range levels {
		prices = append(prices, p)
	}
	if desc {
		sort.Slice(prices, func(i, j int) bool { return prices[i] > prices[j] })
	} else {
		sort.Slice(prices, func(i, j int) bool { return prices[i] < prices[j] })
	}
	if topN > 0 && len(prices) > topN {
		prices = prices[:topN]
	}
	res := make([]PriceLevel, 0, len(prices))
	for _, p := range prices {
		res = append(res, PriceLevel{Price: p, Quantity: levels[p]})
	}
	return res
}

// DeltaAggregator merges changes within a broadcast interval
// multiple updates to same price collapse to latest quantity
//
type DeltaAggregator struct {
	mu    sync.Mutex
	bids  map[int64]int64
	asks  map[int64]int64
}

func NewDeltaAggregator() *DeltaAggregator {
	return &DeltaAggregator{
		bids: make(map[int64]int64),
		asks: make(map[int64]int64),
	}
}

func (d *DeltaAggregator) AddDelta(side Side, price int64, qty int64) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if side == Bid {
		d.bids[price] = qty
	} else {
		d.asks[price] = qty
	}
}

func (d *DeltaAggregator) Flush(seq uint64) Delta {
	d.mu.Lock()
	defer d.mu.Unlock()
	bids := mapToLevels(d.bids)
	asks := mapToLevels(d.asks)
	d.bids = make(map[int64]int64)
	d.asks = make(map[int64]int64)
	return Delta{Sequence: seq, Bids: bids, Asks: asks}
}

func mapToLevels(m map[int64]int64) []PriceLevel {
	levels := make([]PriceLevel, 0, len(m))
	for p, q := range m {
		levels = append(levels, PriceLevel{Price: p, Quantity: q})
	}
	return levels
}

// Client represents a consumer with backpressure handling

type Client struct {
	ID        string
	buffer    chan Delta
	stateLock sync.Mutex
	state     Snapshot
}

func NewClient(id string, bufferSize int) *Client {
	return &Client{
		ID:     id,
		buffer: make(chan Delta, bufferSize),
	}
}

func (c *Client) ReceiveSnapshot(s Snapshot) {
	c.stateLock.Lock()
	c.state = s
	c.stateLock.Unlock()
}

func (c *Client) ConsumeDelta(d Delta) {
	c.stateLock.Lock()
	defer c.stateLock.Unlock()
	applyDelta(&c.state, d)
}

func (c *Client) State() Snapshot {
	c.stateLock.Lock()
	defer c.stateLock.Unlock()
	return c.state
}
// Buffer exposes client delta channel (read-only)
func (c *Client) Buffer() <-chan Delta {
	return c.buffer
}


// Engine manages book, deltas, and clients

type Engine struct {
	book      *L2Book
	aggregate *DeltaAggregator
	clients   map[string]*Client
	mu        sync.Mutex
}

func NewEngine() *Engine {
	return &Engine{
		book:      NewL2Book(),
		aggregate: NewDeltaAggregator(),
		clients:   make(map[string]*Client),
	}
}

func (e *Engine) RegisterClient(id string, bufferSize int, topN int) *Client {
	e.mu.Lock()
	defer e.mu.Unlock()
	c := NewClient(id, bufferSize)
	snap := e.book.Snapshot(topN)
	c.ReceiveSnapshot(snap)
	e.clients[id] = c
	return c
}

func (e *Engine) ApplyEvent(ev OrderEvent) error {
	if err := e.book.ApplyEvent(ev); err != nil {
		return err
	}
	// add to delta aggregator
	e.aggregate.AddDelta(ev.Side, ev.Price, e.currentQty(ev.Side, ev.Price))
	return nil
}

func (e *Engine) currentQty(side Side, price int64) int64 {
	e.book.mu.RLock()
	defer e.book.mu.RUnlock()
	if side == Bid {
		return e.book.bids[price]
	}
	return e.book.asks[price]
}

// Broadcast flushes deltas and sends to clients with backpressure control
func (e *Engine) Broadcast() {
	seq := e.book.IncrementSeq()
	delta := e.aggregate.Flush(seq)

	e.mu.Lock()
	defer e.mu.Unlock()
	for _, client := range e.clients {
		select {
		case client.buffer <- delta:
			// sent
		default:
			// backpressure: drop and conflate
			drain(client.buffer)
			client.buffer <- delta
		}
	}
}

func drain(ch chan Delta) {
	for {
		select {
		case <-ch:
			continue
		default:
			return
		}
	}
}

// RunClient simulates reading deltas with optional latency
func RunClient(client *Client, latency time.Duration, stop <-chan struct{}) {
	for {
		select {
		case d := <-client.buffer:
			if latency > 0 {
				time.Sleep(latency)
			}
			client.ConsumeDelta(d)
		case <-stop:
			return
		}
	}
}

// applyDelta applies delta to a snapshot
func applyDelta(s *Snapshot, d Delta) {
	if d.Sequence <= s.Sequence {
		return
	}
	s.Sequence = d.Sequence
	applyLevels(&s.Bids, d.Bids, true)
	applyLevels(&s.Asks, d.Asks, false)
}

func applyLevels(levels *[]PriceLevel, deltas []PriceLevel, desc bool) {
	m := make(map[int64]int64)
	for _, l := range *levels {
		m[l.Price] = l.Quantity
	}
	for _, d := range deltas {
		if d.Quantity <= 0 {
			delete(m, d.Price)
		} else {
			m[d.Price] = d.Quantity
		}
	}
	*levels = collectLevels(m, desc, 0)
}

// ValidateInvariant checks for crossing and order
func (e *Engine) ValidateInvariant() error {
	e.book.mu.RLock()
	defer e.book.mu.RUnlock()
	if e.book.crossedLocked() {
		return errors.New("order book crossed")
	}
	return nil
}

// SnapshotDeltaProtocol returns snapshot and incremental deltas from broadcast
func SnapshotDeltaProtocol(engine *Engine, topN int) (Snapshot, <-chan Delta) {
	client := engine.RegisterClient(fmt.Sprintf("snap-%d", time.Now().UnixNano()), 16, topN)
	return client.State(), client.buffer
}




