package after

import (
    "testing"

    "tests/elevator"
)

func TestAllCarsFullDeterministicFallback(t *testing.T) {
    c := elevator.NewController()

    c.AddCar(elevator.Car{ID: 0, Floor: 0, Direction: 0, Load: 10, MaxCapacity: 10})
    c.AddCar(elevator.Car{ID: 1, Floor: 5, Direction: 0, Load: 10, MaxCapacity: 10})

    id1, err := c.RequestRide(2, 3)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    id2, err := c.RequestRide(2, 3)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    if id1 != id2 {
        t.Fatalf("expected deterministic fallback (same car id), got %d and %d", id1, id2)
    }
}
