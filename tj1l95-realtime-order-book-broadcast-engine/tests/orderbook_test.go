package orderbook_test

import (
	ob "tj1l95-realtime-order-book-broadcast-engine/repository_after"
	"math/rand"
	"sync"
	"testing"
	"time"
)

// Requirement 1: Thread-safe L2 state
func TestL2ThreadSafe(t *testing.T) {
	book := ob.NewL2Book()
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_ = book.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: int64(100+i), Quantity: 10, Type: ob.Add})
			_ = book.ApplyEvent(ob.OrderEvent{Side: ob.Ask, Price: int64(200+i), Quantity: 5, Type: ob.Add})
		} (i)
	}
	wg.Wait()
	snap := book.Snapshot(10)
	if len(snap.Bids) == 0 || len(snap.Asks) == 0 {
		t.Error("expected bids and asks")
	}
}

// Requirement 2: Aggregation logic add/update/delete
func TestAggregationLogic(t *testing.T) {
	book := ob.NewL2Book()
	_ = book.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: 100, Quantity: 10, Type: ob.Add})
	_ = book.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: 100, Quantity: 5, Type: ob.Add})
	_ = book.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: 100, Quantity: 12, Type: ob.Update})
	_ = book.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: 100, Quantity: 0, Type: ob.Delete})
	snap := book.Snapshot(10)
	if len(snap.Bids) != 0 {
		t.Error("expected price level to be purged")
	}
}

// Requirement 3 & 4: Snapshot + Delta protocol & sequence integrity
func TestSnapshotDeltaProtocol(t *testing.T) {
	engine := ob.NewEngine()
	client := engine.RegisterClient("c1", 4, 10)
	if client.State().Sequence != 0 {
		t.Error("expected initial sequence 0")
	}
	_ = engine.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: 101, Quantity: 10, Type: ob.Add})
	engine.Broadcast()
	delta := <-client.Buffer()
	if delta.Sequence == 0 {
		t.Error("expected sequence > 0")
	}
}

// Requirement 5: Adaptive Delta Merging
func TestAdaptiveDeltaMerging(t *testing.T) {
	engine := ob.NewEngine()
	client := engine.RegisterClient("c1", 4, 10)
	_ = engine.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: 101, Quantity: 10, Type: ob.Add})
	_ = engine.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: 101, Quantity: 20, Type: ob.Update})
	engine.Broadcast()
	delta := <-client.Buffer()
	if len(delta.Bids) != 1 || delta.Bids[0].Quantity != 20 {
		t.Error("expected merged delta with latest quantity")
	}
}

// Requirement 6: Backpressure management
func TestBackpressureConflation(t *testing.T) {
	engine := ob.NewEngine()
	client := engine.RegisterClient("slow", 1, 10)
	_ = engine.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: 101, Quantity: 10, Type: ob.Add})
	engine.Broadcast()
	_ = engine.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: 101, Quantity: 20, Type: ob.Update})
	engine.Broadcast()
	_ = engine.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: 101, Quantity: 30, Type: ob.Update})
	engine.Broadcast()
	// buffer size 1 -> should contain latest
	delta := <-client.Buffer()
	if delta.Bids[0].Quantity != 30 {
		t.Error("expected conflated latest delta")
	}
}

// Requirement 7: Convergence for fast and slow clients
func TestConvergenceFastSlow(t *testing.T) {
	engine := ob.NewEngine()
	fast := engine.RegisterClient("fast", 32, 10)
	slow := engine.RegisterClient("slow", 1, 10)
	stop := make(chan struct{})
	go ob.RunClient(fast, 0, stop)
	go ob.RunClient(slow, 2*time.Millisecond, stop)

	rng := rand.New(rand.NewSource(42))
	for i := 0; i < 5000; i++ {
		price := int64(100 + rng.Intn(20))
		qty := int64(rng.Intn(100)+1)
		_ = engine.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: price, Quantity: qty, Type: ob.Update})
		engine.Broadcast()
	}

	// Allow slow client to drain
	time.Sleep(20 * time.Millisecond)
	close(stop)

	// Drain remaining deltas for slow client
	for {
		select {
		case d := <-slow.Buffer():
			slow.ConsumeDelta(d)
		default:
			goto done
		}
	}

done:
	fs := fast.State()
	sl := slow.State()
	if fs.Sequence != sl.Sequence {
		t.Errorf("expected fast and slow clients to converge: fast=%d slow=%d", fs.Sequence, sl.Sequence)
	}
}

// Requirement 8: Concurrency stress (race detector compatible)
func TestConcurrencyStress(t *testing.T) {
	engine := ob.NewEngine()
	client := engine.RegisterClient("c", 32, 10)
	stop := make(chan struct{})
	go ob.RunClient(client, 0, stop)
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			price := int64(100 + i)
			_ = engine.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: price, Quantity: 1, Type: ob.Add})
			engine.Broadcast()
		} (i)
	}
	wg.Wait()
	close(stop)
}

// Requirement 9: Adversarial crossing
func TestAdversarialCrossing(t *testing.T) {
	engine := ob.NewEngine()
	_ = engine.ApplyEvent(ob.OrderEvent{Side: ob.Bid, Price: 110, Quantity: 10, Type: ob.Add})
	err := engine.ApplyEvent(ob.OrderEvent{Side: ob.Ask, Price: 105, Quantity: 10, Type: ob.Add})
	if err == nil {
		t.Error("expected crossing error")
	}
}




