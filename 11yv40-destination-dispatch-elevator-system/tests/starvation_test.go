package tests

import (
    "testing"
    "time"

    main "example.com/repository_after"
)

// TestQueuedRequestEventuallyAssigned verifies queued requests are scheduled
// once capacity frees.
func TestQueuedRequestEventuallyAssigned(t *testing.T) {
    c := main.NewControllerWithConfig(1, 1, 5, 1, 10*time.Millisecond, 10*time.Millisecond)
    c.Start()
    defer c.Stop()

    if _, err := c.RequestRide(1, 3); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    // Wait for the first pickup to fill capacity at floor 1.
    filledDeadline := time.After(2 * time.Second)
    for {
        states := c.CarStates()
        if len(states) == 1 && states[0].Load == 1 {
            break
        }
        select {
        case <-filledDeadline:
            t.Fatalf("timeout waiting for car to fill capacity")
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }

    id, err := c.RequestRide(1, 2)
    if err != nil {
        t.Fatalf("expected car ID even when full, got error: %v", err)
    }
    if id != 0 {
        t.Fatalf("expected car 0, got %d", id)
    }

    dropoffDeadline := time.After(2 * time.Second)
    for {
        states := c.CarStates()
        if len(states) == 1 && states[0].Floor >= 3 && states[0].Load == 0 {
            break
        }
        select {
        case <-dropoffDeadline:
            t.Fatalf("timeout waiting for first request to complete")
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }

    pickupDeadline := time.After(2 * time.Second)
    for {
        states := c.CarStates()
        if len(states) == 1 && states[0].Load == 1 {
            break
        }
        select {
        case <-pickupDeadline:
            t.Fatalf("timeout waiting for queued request to be picked up")
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }
}
