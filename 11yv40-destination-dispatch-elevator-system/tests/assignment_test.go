package tests

import (
    "testing"
    "time"

    main "example.com/repository_after"
)

// These tests validate observable assignment behavior via the public API.

func TestDeterministicAssignmentChooseLowestIDInitially(t *testing.T) {
    c := main.NewControllerWithConfig(2, 1, 10, 8, 5*time.Millisecond, 10*time.Millisecond)

    id, err := c.RequestRide(2, 6)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if id != 0 {
        t.Fatalf("expected car 0 to be chosen, got %d", id)
    }
}

func TestDirectionalMomentumBlocking(t *testing.T) {
    c := main.NewControllerWithConfig(2, 1, 10, 8, 5*time.Millisecond, 10*time.Millisecond)

    // First request sets car 0 moving up.
    if _, err := c.RequestRide(2, 8); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    // Down request should prefer car 1 due to momentum rules.
    id, err := c.RequestRide(2, 1)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if id != 1 {
        t.Fatalf("expected car 1 due to momentum blocking car 0, got %d", id)
    }
}

func TestPenalizeFullCapacityAndTieBreakByID(t *testing.T) {
    c := main.NewControllerWithConfig(2, 1, 10, 1, 10*time.Millisecond, 50*time.Millisecond)
    c.Start()
    defer c.Stop()

    // Fill car 0 by boarding at floor 1.
    id1, err := c.RequestRide(1, 2)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if id1 != 0 {
        t.Fatalf("expected car 0 to be chosen, got %d", id1)
    }

    deadline := time.After(500 * time.Millisecond)
    for {
        states := c.CarStates()
        if len(states) == 2 && states[0].Load == 1 {
            break
        }
        select {
        case <-deadline:
            t.Fatalf("timeout waiting for car 0 to fill capacity")
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }

    // Next request should go to car 1 because car 0 is full.
    id2, err := c.RequestRide(1, 2)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if id2 != 1 {
        t.Fatalf("expected car 1 to be chosen, got %d", id2)
    }

    deadline = time.After(500 * time.Millisecond)
    for {
        states := c.CarStates()
        if len(states) == 2 && states[1].Load == 1 {
            break
        }
        select {
        case <-deadline:
            t.Fatalf("timeout waiting for car 1 to fill capacity")
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }

    // When both cars are full, RequestRide still returns a deterministic car ID.
    id3, err := c.RequestRide(1, 2)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if id3 != 0 {
        t.Fatalf("expected deterministic car 0, got %d", id3)
    }
}

func TestAssignmentAvoidsFullCars(t *testing.T) {
    c := main.NewControllerWithConfig(2, 1, 10, 1, 5*time.Millisecond, 10*time.Millisecond)
    c.Start()
    defer c.Stop()

    if _, err := c.RequestRide(1, 3); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    deadline := time.After(500 * time.Millisecond)
    for {
        states := c.CarStates()
        if len(states) == 2 && states[0].Load == 1 {
            break
        }
        select {
        case <-deadline:
            t.Fatalf("timeout waiting for car 0 to fill capacity")
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }

    id, err := c.RequestRide(1, 4)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if id != 1 {
        t.Fatalf("expected assignment to non-full car 1, got %d", id)
    }
}
