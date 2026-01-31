package tests

import (
    "sync"
    "testing"

)

// TestConcurrentRequestAndBoard ensures that concurrent RequestAndBoard calls
// cannot exceed car MaxCapacity.
func TestConcurrentRequestAndBoard(t *testing.T) {
    c := NewController()
    // create a car with MaxCapacity 5
    c.AddCar(Car{ID: 0, Floor: 0, Direction: 0, Load: 0, MaxCapacity: 5})

    var wg sync.WaitGroup
    attempts := 20
    wg.Add(attempts)
    var mu sync.Mutex
    success := 0
    for i := 0; i < attempts; i++ {
        go func() {
            defer wg.Done()
            if id, err := c.RequestAndBoard(0, 1); err == nil && id >= 0 {
                mu.Lock()
                success++
                mu.Unlock()
            }
        }()
    }
    wg.Wait()

    car, ok := c.CarByID(0)
    if !ok {
        t.Fatalf("car missing")
    }
    if car.Load > car.MaxCapacity {
        t.Fatalf("capacity invariant violated: load %d > max %d", car.Load, car.MaxCapacity)
    }
    if success > car.MaxCapacity {
        t.Fatalf("too many successful boards: %d > %d", success, car.MaxCapacity)
    }
}
