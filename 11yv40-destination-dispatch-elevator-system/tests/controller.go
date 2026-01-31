package tests

import "sync"

// Controller manages elevator cars and their state. It embeds an RWMutex
// to protect concurrent access to the cars slice.
type Controller struct {
    sync.RWMutex
    cars []Car
    minFloor int
    maxFloor int
}

// NewController returns an initialized Controller.
func NewController() *Controller {
    return &Controller{cars: make([]Car, 0), minFloor: 0, maxFloor: 100}
}

// AddCar appends a car to the controller state (write-locked).
func (c *Controller) AddCar(car Car) {
    c.Lock()
    c.cars = append(c.cars, car)
    c.Unlock()
}

// NumCars returns the number of cars (read-locked).
func (c *Controller) NumCars() int {
    c.RLock()
    n := len(c.cars)
    c.RUnlock()
    return n
}

// Cars returns a copy of the cars slice to keep callers from mutating
// the controller's internal state directly. Access is read-locked.
func (c *Controller) Cars() []Car {
    c.RLock()
    defer c.RUnlock()
    out := make([]Car, len(c.cars))
    copy(out, c.cars)
    return out
}

// CarByID returns a copy of the car with the given ID if present.
func (c *Controller) CarByID(id int) (Car, bool) {
    c.RLock()
    defer c.RUnlock()
    for _, car := range c.cars {
        if car.ID == id {
            return car, true
        }
    }
    return Car{}, false
}

// RequestRide validates the requested floors and returns an assigned car ID
// immediately. This function does not wait for movement or perform assignment
// heuristics; it returns a car ID (naive choice) or an error for invalid floors.
func (c *Controller) RequestRide(from, to int) (int, error) {
    // Validate floors quickly under read lock
    if from < c.minFloor || from > c.maxFloor || to < c.minFloor || to > c.maxFloor {
        return -1, ErrInvalidFloor
    }

    // Try to assign deterministically to an existing car.
    if id, ok := c.assignCar(from, to); ok {
        return id, nil
    }

    // If no cars exist, create one (write lock) and return its ID.
    c.Lock()
    defer c.Unlock()
    newID := 0
    if len(c.cars) > 0 {
        newID = c.cars[len(c.cars)-1].ID + 1
    }
    car := Car{ID: newID, Floor: from, Direction: 0, Load: 0, MaxCapacity: 10}
    c.cars = append(c.cars, car)
    return car.ID, nil
}

// OpenDoors instructs the controller to open the doors for the specified car
// for `ticks` movement ticks. This is useful to simulate dwell; while doors
// are open the car will not move.
func (c *Controller) OpenDoors(carID int, ticks int) bool {
    c.Lock()
    defer c.Unlock()
    for i := range c.cars {
        if c.cars[i].ID == carID {
            c.cars[i].DoorDwellTicks = ticks
            c.cars[i].DoorsOpen = ticks > 0
            return true
        }
    }
    return false
}

const maxCost = int(1<<60)

func sign(x int) int {
    if x < 0 {
        return -1
    }
    if x > 0 {
        return 1
    }
    return 0
}

// assignCar picks the best car deterministically according to a simple cost
// function. It does not mutate controller state. Returns (id, true) if a
// suitable car exists, otherwise (0, false).
func (c *Controller) assignCar(from, to int) (int, bool) {
    reqDir := sign(to - from)

    c.RLock()
    defer c.RUnlock()
    if len(c.cars) == 0 {
        return 0, false
    }

    bestCost := maxCost
    bestID := -1
    for _, car := range c.cars {
        // Base cost is distance
        d := car.Floor - from
        if d < 0 {
            d = -d
        }
        cost := d

        // Capacity constraint: if full, set infinite cost
        if car.Load >= car.MaxCapacity {
            cost = maxCost
        } else {
            // Enforce strict directional momentum: if a car is moving UP and
            // has pending UP stops, it must not accept DOWN requests.
            if car.Direction == 1 && reqDir == -1 && car.PendingUpStops > 0 {
                cost = maxCost
            } else if car.Direction == -1 && reqDir == 1 && car.PendingDownStops > 0 {
                cost = maxCost
            } else {
                // Penalize direction mismatch unless car is idle
                if car.Direction != 0 && reqDir != 0 && car.Direction != reqDir {
                    cost += 1000000
                }
            }
        }

        // Tie-break deterministically by lower ID
        if cost < bestCost || (cost == bestCost && car.ID < bestID) || bestID == -1 {
            bestCost = cost
            bestID = car.ID
        }
    }

    if bestID == -1 {
        return 0, false
    }
    return bestID, true
}

// assignCarLocked picks the best car deterministically while the caller holds
// the write lock. It mirrors assignCar but must be called with c.Lock() held.
func (c *Controller) assignCarLocked(from, to int) (int, bool) {
    reqDir := sign(to - from)

    if len(c.cars) == 0 {
        return 0, false
    }

    bestCost := maxCost
    bestID := -1
    for _, car := range c.cars {
        // Base cost is distance
        d := car.Floor - from
        if d < 0 {
            d = -d
        }
        cost := d

        // Capacity constraint: if full, set infinite cost
        if car.Load >= car.MaxCapacity {
            cost = maxCost
        } else {
            // Enforce strict directional momentum
            if car.Direction == 1 && reqDir == -1 && car.PendingUpStops > 0 {
                cost = maxCost
            } else if car.Direction == -1 && reqDir == 1 && car.PendingDownStops > 0 {
                cost = maxCost
            } else {
                if car.Direction != 0 && reqDir != 0 && car.Direction != reqDir {
                    cost += 1000000
                }
            }
        }

        if cost < bestCost || (cost == bestCost && car.ID < bestID) || bestID == -1 {
            bestCost = cost
            bestID = car.ID
        }
    }

    if bestID == -1 {
        return 0, false
    }
    return bestID, true
}

// RequestAndBoard atomically assigns a car for the request and increments
// its load if capacity allows. This prevents a race between assignment and
// boarding. Returns assigned car ID or error.
func (c *Controller) RequestAndBoard(from, to int) (int, error) {
    if from < c.minFloor || from > c.maxFloor || to < c.minFloor || to > c.maxFloor {
        return -1, ErrInvalidFloor
    }

    c.Lock()
    defer c.Unlock()

    // Try to pick a car while holding the lock.
    if len(c.cars) == 0 {
        // create first car with load 1
        newID := 0
        car := Car{ID: newID, Floor: from, Direction: 0, Load: 1, MaxCapacity: 10}
        c.cars = append(c.cars, car)
        return car.ID, nil
    }

    if id, ok := c.assignCarLocked(from, to); ok {
        // find car and increment load atomically
        for i := range c.cars {
            if c.cars[i].ID == id {
                if c.cars[i].Load >= c.cars[i].MaxCapacity {
                    // capacity exhausted
                    return -1, ErrNotImplemented
                }
                c.cars[i].Load++
                return id, nil
            }
        }
    }

    // No suitable car found - create a new one and set load to 1
    newID := c.cars[len(c.cars)-1].ID + 1
    car := Car{ID: newID, Floor: from, Direction: 0, Load: 1, MaxCapacity: 10}
    c.cars = append(c.cars, car)
    return car.ID, nil
}
