package repository_after

import (
    "sync"
    "time"
)

// Direction indicates car travel direction.
type Direction int

const (
    Down Direction = -1
    Idle Direction = 0
    Up   Direction = 1
)

// Car represents the internal mutable state of an elevator car.
type Car struct {
    mu sync.Mutex

    id          int
    floor       int
    direction   Direction
    load        int
    maxCapacity int

    doorsOpen bool
    doorUntil time.Time

    pickups  map[int]int
    dropoffs map[int]int
}

func newCar(id int, floor int, maxCapacity int) *Car {
    return &Car{
        id:          id,
        floor:       floor,
        direction:   Idle,
        load:        0,
        maxCapacity: maxCapacity,
        pickups:     make(map[int]int),
        dropoffs:    make(map[int]int),
    }
}

// snapshot returns an immutable copy of the car state used by the controller.
func (c *Car) snapshot() carSnapshot {
    c.mu.Lock()
    defer c.mu.Unlock()
    return carSnapshot{
        id:          c.id,
        floor:       c.floor,
        direction:   c.direction,
        load:        c.load,
        maxCapacity: c.maxCapacity,
        doorsOpen:   c.doorsOpen,
        pickups:     copyStops(c.pickups),
        dropoffs:    copyStops(c.dropoffs),
    }
}

type carSnapshot struct {
    id          int
    floor       int
    direction   Direction
    load        int
    maxCapacity int
    doorsOpen   bool
    pickups     map[int]int
    dropoffs    map[int]int
}

func copyStops(in map[int]int) map[int]int {
    out := make(map[int]int, len(in))
    for k, v := range in {
        out[k] = v
    }
    return out
}
