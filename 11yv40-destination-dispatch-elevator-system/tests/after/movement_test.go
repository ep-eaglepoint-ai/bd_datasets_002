package after

import (
    "testing"
    "time"

    "tests/elevator"
)

func TestMovementSim(t *testing.T) {
    c := elevator.NewController()
    // Start car at floor 0 with 3 up stops.
    c.AddCar(elevator.Car{ID: 0, Floor: 0, Direction: 1, Load: 0, MaxCapacity: 10, PendingUpStops: 3})

    tick := 20 * time.Millisecond
    stop := c.StartMovement(tick)
    defer stop()

    start := time.Now()

    // Wait until car reaches floor 3 or timeout
    deadline := time.After(2 * time.Second)
    for {
        if car, ok := c.CarByID(0); ok {
            if car.Floor >= 3 {
                break
            }
        }
        select {
        case <-deadline:
            t.Fatalf("timeout waiting for movement")
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }

    elapsed := time.Since(start)
    expected := 3 * tick
    if elapsed < expected {
        t.Fatalf("movement too fast: elapsed %v, expected >= %v", elapsed, expected)
    }
}
