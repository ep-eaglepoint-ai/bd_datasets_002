package tests

import (
	"testing"

)

func TestRequestRideInvalidFloors(t *testing.T) {
	c := NewController()

	// below min
	if _, err := c.RequestRide(-1, 1); err == nil {
		t.Fatalf("expected error for from < minFloor, got nil")
	}

	// above max
	if _, err := c.RequestRide(1, 1000); err == nil {
		t.Fatalf("expected error for to > maxFloor, got nil")
	}
}

func TestRequestRideValidFloorsReturnsCar(t *testing.T) {
	c := NewController()

	id, err := c.RequestRide(1, 2)
	if err != nil {
		t.Fatalf("expected no error for valid floors, got %v", err)
	}
	if id < 0 {
		t.Fatalf("expected non-negative car ID, got %d", id)
	}
}


