package tests

import (
    "testing"
    "time"

    main "example.com/repository_after"
)

func TestAllCarsFullDeterministicFallback(t *testing.T) {
    c := main.NewControllerWithConfig(2, 1, 10, 1, 5*time.Millisecond, 10*time.Millisecond)
    c.Start()
    defer c.Stop()

    // Fill both cars with one request each.
    if _, err := c.RequestRide(1, 2); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if _, err := c.RequestRide(1, 2); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    deadline := time.After(200 * time.Millisecond)
    for {
        states := c.CarStates()
        if len(states) == 2 && states[0].Load == 1 && states[1].Load == 1 {
            break
        }
        select {
        case <-deadline:
            t.Fatalf("timeout waiting for cars to fill capacity")
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }

    id, err := c.RequestRide(1, 2)
    if err != nil {
        t.Fatalf("expected car ID even when all cars are full, got error: %v", err)
    }
    if id < 0 {
        t.Fatalf("expected non-negative car ID, got %d", id)
    }
}
