package tests

import (
    "testing"
    "time"

)

func TestDoorDwellPreventsMovement(t *testing.T) {
    c := NewController()
    // Car at floor 0 with one up stop but doors are opened for dwell.
    c.AddCar(Car{ID: 0, Floor: 0, Direction: 1, Load: 0, MaxCapacity: 10, PendingUpStops: 2})

    // Open doors for 5 ticks.
    opened := c.OpenDoors(0, 5)
    if !opened {
        t.Fatalf("failed to open doors for car 0")
    }

    tick := 20 * time.Millisecond
    stop := c.StartMovement(tick)
    defer stop()

    // Wait a little longer than 3 ticks and ensure car hasn't moved.
    time.Sleep(3 * tick)

    car, ok := c.CarByID(0)
    if !ok {
        t.Fatalf("car 0 missing")
    }
    if car.Floor != 0 {
        t.Fatalf("expected car to remain at floor 0 during dwell, got %d", car.Floor)
    }

    // After dwell ends, car should resume movement; wait until it reaches floor 2.
    deadline := time.After(2 * time.Second)
    for {
        car, _ = c.CarByID(0)
        if car.Floor >= 2 {
            break
        }
        select {
        case <-deadline:
            t.Fatalf("timeout waiting for car to move after dwell")
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }
}
