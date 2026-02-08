package tests

import (
    "testing"
    "time"

    main "example.com/repository_after"
)

func TestDoorDwellPreventsMovement(t *testing.T) {
    c := main.NewControllerWithConfig(1, 1, 10, 8, 20*time.Millisecond, 100*time.Millisecond)
    c.Start()
    defer c.Stop()

    // Request a ride to set a pending stop and open doors on first pickup.
    if _, err := c.RequestRide(1, 3); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    // Wait briefly to allow the car to open doors at floor 1.
    time.Sleep(30 * time.Millisecond)

    states := c.CarStates()
    if len(states) != 1 {
        t.Fatalf("expected 1 car, got %d", len(states))
    }
    floor := states[0].Floor

    // During dwell, car should remain on the same floor.
    time.Sleep(40 * time.Millisecond)
    states = c.CarStates()
    if states[0].Floor != floor {
        t.Fatalf("expected car to remain at floor %d during dwell, got %d", floor, states[0].Floor)
    }
}
