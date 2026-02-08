package tests

import (
    "testing"
    "time"

    main "example.com/repository_after"
)

func TestRequestRideInvalidFloors(t *testing.T) {
    c := main.NewControllerWithConfig(1, 1, 10, 8, 5*time.Millisecond, 10*time.Millisecond)

    if _, err := c.RequestRide(0, 1); err == nil {
        t.Fatalf("expected error for from < minFloor, got nil")
    }
    if _, err := c.RequestRide(1, 11); err == nil {
        t.Fatalf("expected error for to > maxFloor, got nil")
    }
}

func TestRequestRideValidFloorsReturnsCar(t *testing.T) {
    c := main.NewControllerWithConfig(1, 1, 10, 8, 5*time.Millisecond, 10*time.Millisecond)

    id, err := c.RequestRide(1, 2)
    if err != nil {
        t.Fatalf("expected no error for valid floors, got %v", err)
    }
    if id < 0 {
        t.Fatalf("expected non-negative car ID, got %d", id)
    }
}

func TestRequestRideBoardsWhenDoorsOpenAtFloor(t *testing.T) {
    tick := 50 * time.Millisecond
    dwell := 200 * time.Millisecond
    c := main.NewControllerWithConfig(1, 1, 10, 2, tick, dwell)
    c.Start()
    defer c.Stop()

    if _, err := c.RequestRide(1, 3); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    deadline := time.After(500 * time.Millisecond)
    for {
        states := c.CarStates()
        if len(states) == 1 && states[0].Floor == 1 && states[0].DoorsOpen {
            break
        }
        select {
        case <-deadline:
            t.Fatalf("timeout waiting for doors to open at floor 1")
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }

    before := c.CarStates()[0]
    if _, err := c.RequestRide(1, 4); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    time.Sleep(10 * time.Millisecond)

    after := c.CarStates()[0]
    if after.Floor != before.Floor {
        t.Fatalf("expected no movement while doors open, got floor %d from %d", after.Floor, before.Floor)
    }
    if after.Load <= before.Load {
        t.Fatalf("expected load to increase while doors open, got %d from %d", after.Load, before.Load)
    }
}
