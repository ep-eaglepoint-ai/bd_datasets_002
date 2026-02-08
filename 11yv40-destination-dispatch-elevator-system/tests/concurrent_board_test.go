package tests

import (
    "sync"
    "testing"
    "time"

    main "example.com/repository_after"
)

// TestConcurrentRequestRideDoesNotOverfill ensures concurrent RequestRide calls
// never exceed MaxCapacity.
func TestConcurrentRequestRideDoesNotOverfill(t *testing.T) {
    c := main.NewControllerWithConfig(1, 1, 10, 5, 10*time.Millisecond, 200*time.Millisecond)
    c.Start()
    defer c.Stop()

    if _, err := c.RequestRide(1, 3); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    openDeadline := time.After(500 * time.Millisecond)
    for {
        states := c.CarStates()
        if len(states) == 1 && states[0].Floor == 1 && states[0].DoorsOpen && states[0].Load == 1 {
            break
        }
        select {
        case <-openDeadline:
            t.Fatalf("timeout waiting for doors to open and load to increase")
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }

    var wg sync.WaitGroup
    attempts := 20
    wg.Add(attempts)
    for i := 0; i < attempts; i++ {
        go func() {
            defer wg.Done()
            _, _ = c.RequestRide(1, 2)
        }()
    }
    maxObserved := 0
    sampleDeadline := time.After(150 * time.Millisecond)
    for {
        states := c.CarStates()
        if len(states) == 1 && states[0].Load > maxObserved {
            maxObserved = states[0].Load
        }
        select {
        case <-sampleDeadline:
            goto done
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }
done:
    wg.Wait()

    if maxObserved > c.CarStates()[0].MaxCapacity {
        t.Fatalf("capacity invariant violated: observed load %d > max %d", maxObserved, c.CarStates()[0].MaxCapacity)
    }
}
