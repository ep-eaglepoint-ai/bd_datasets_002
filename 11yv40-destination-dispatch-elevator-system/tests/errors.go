package tests

import "errors"

// ErrNotImplemented is used as a placeholder error for unimplemented features.
var ErrNotImplemented = errors.New("not implemented")

// ErrInvalidFloor is returned when a requested floor is outside allowed bounds.
var ErrInvalidFloor = errors.New("invalid floor")
