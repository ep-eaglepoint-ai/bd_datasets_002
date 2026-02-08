package repository_after

import "errors"

// ErrInvalidFloor indicates the requested floor is outside allowed bounds.
var ErrInvalidFloor = errors.New("invalid floor")

// ErrNoAvailableCar indicates no car can accept the request at this time.
var ErrNoAvailableCar = errors.New("no available car")
