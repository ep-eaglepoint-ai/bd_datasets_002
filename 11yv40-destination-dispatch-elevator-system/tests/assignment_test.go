package tests

import (
    "testing"

)

// This test constructs multiple cars and verifies deterministic assignment.
func TestDeterministicAssignmentChooseClosestMatchingDirection(t *testing.T) {
    c := NewController()

    // Car 0: floor 0, going up
    c.AddCar(Car{ID: 0, Floor: 0, Direction: 1, Load: 0, MaxCapacity: 10})
    // Car 1: floor 5, going down
    c.AddCar(Car{ID: 1, Floor: 5, Direction: -1, Load: 0, MaxCapacity: 10})

    // Request from 2 to 6 (up). Car 0 is closer and moving up -> should be chosen.
    id, err := c.RequestRide(2, 6)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if id != 0 {
        t.Fatalf("expected car 0 to be chosen, got %d", id)
    }
}

func TestDirectionalMomentumBlocking(t *testing.T) {
    c := NewController()

    // Car 0 is at floor 3, moving UP and has pending UP stops -> should not accept DOWN requests.
    c.AddCar(Car{ID: 0, Floor: 3, Direction: 1, Load: 0, MaxCapacity: 10, PendingUpStops: 2})
    // Car 1 is further away but moving DOWN and can accept a DOWN request.
    c.AddCar(Car{ID: 1, Floor: 6, Direction: -1, Load: 0, MaxCapacity: 10})

    // Request from floor 2 to 0 (DOWN). Car0 is closer but should be blocked by momentum, so car1 chosen.
    id, err := c.RequestRide(2, 0)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if id != 1 {
        t.Fatalf("expected car 1 due to momentum blocking car 0, got %d", id)
    }
}

func TestDeterministicAssignmentPenalizeFullCapacityAndTieBreakByID(t *testing.T) {
    c := NewController()

    // Car 0: floor 1, idle
    c.AddCar(Car{ID: 0, Floor: 1, Direction: 0, Load: 0, MaxCapacity: 10})
    // Car 1: floor 3, idle
    c.AddCar(Car{ID: 1, Floor: 3, Direction: 0, Load: 10, MaxCapacity: 10}) // full

    // Request from 2 to 4 (up). Car1 is full and must be excluded; Car0 is chosen.
    id, err := c.RequestRide(2, 4)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if id != 0 {
        t.Fatalf("expected car 0 to be chosen due to car1 full, got %d", id)
    }

    // Add another car at same distance as car0 to test tie-break by lower ID.
    c.AddCar(Car{ID: 2, Floor: 3, Direction: 0, Load: 0, MaxCapacity: 10})
    // Now car0 (floor1, distance1) and car2 (floor3, distance1) are tied; expect lower ID (0).
    id2, err := c.RequestRide(2, 0)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if id2 != 0 {
        t.Fatalf("expected tie-break to choose car 0, got %d", id2)
    }
}
