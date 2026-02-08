package repository_after

import (
    "math"
    "sync"
    "time"
)

// Controller manages a bank of elevator cars and global dispatch decisions.
// All access to the cars slice is protected by the embedded RWMutex.
type Controller struct {
    sync.RWMutex

    cars        []*Car
    pending     []pendingRequest
    minFloor    int
    maxFloor    int
    maxCapacity int

    tick      time.Duration
    doorDwell time.Duration

    stopCh chan struct{}
    wg     sync.WaitGroup
}

// NewController constructs a controller for a 50-floor building with defaults.
// Defaults: floors 1-50, maxCapacity 8, tick 50ms, door dwell 150ms.
func NewController(numCars int) *Controller {
    return NewControllerWithConfig(numCars, 1, 50, 8, 50*time.Millisecond, 150*time.Millisecond)
}

// NewControllerWithConfig creates a controller with explicit configuration.
func NewControllerWithConfig(numCars, minFloor, maxFloor, maxCapacity int, tick, doorDwell time.Duration) *Controller {
    if minFloor > maxFloor {
        minFloor, maxFloor = maxFloor, minFloor
    }
    c := &Controller{
        cars:        make([]*Car, 0, numCars),
        pending:     make([]pendingRequest, 0),
        minFloor:    minFloor,
        maxFloor:    maxFloor,
        maxCapacity: maxCapacity,
        tick:        tick,
        doorDwell:   doorDwell,
        stopCh:      make(chan struct{}),
    }
    for i := 0; i < numCars; i++ {
        c.cars = append(c.cars, newCar(i, minFloor, maxCapacity))
    }
    return c
}

// Start launches a movement goroutine per car.
func (c *Controller) Start() {
    c.Lock()
    defer c.Unlock()
    for _, car := range c.cars {
        c.wg.Add(1)
        go c.runCar(car)
    }
    c.wg.Add(1)
    go c.runDispatcher()
}

// Stop stops all car goroutines and waits for them to exit.
func (c *Controller) Stop() {
    close(c.stopCh)
    c.wg.Wait()
}

// RequestRide assigns a car to a request and returns the car ID immediately.
// It validates floors and schedules pickup/dropoff for the assigned car.
func (c *Controller) RequestRide(from, to int) (int, error) {
    if from < c.minFloor || from > c.maxFloor || to < c.minFloor || to > c.maxFloor {
        return -1, ErrInvalidFloor
    }

    car, allFull, blockedByMomentum, err := c.assignCar(from, to)
    if err != nil {
        if allFull || blockedByMomentum {
            carID, ok := c.queueCarID(from, to, blockedByMomentum)
            if !ok {
                return -1, ErrNoAvailableCar
            }
            c.enqueuePending(carID, from, to)
            return carID, nil
        }
        return -1, err
    }

    // Schedule stops under the car lock.
    car.mu.Lock()
    defer car.mu.Unlock()

    if from == to {
        return car.id, nil
    }

    if car.floor == from && car.doorsOpen && car.load < car.maxCapacity {
        car.load++
        car.dropoffs[to]++
        return car.id, nil
    }

    car.pickups[from]++
    car.dropoffs[to]++

    if car.direction == Idle {
        if to > from {
            car.direction = Up
        } else if to < from {
            car.direction = Down
        }
    }

    return car.id, nil
}

type pendingRequest struct {
    carID int
    from  int
    to    int
}

func (c *Controller) enqueuePending(carID, from, to int) {
    c.Lock()
    c.pending = append(c.pending, pendingRequest{carID: carID, from: from, to: to})
    c.Unlock()
}

func (c *Controller) runDispatcher() {
    defer c.wg.Done()
    ticker := time.NewTicker(c.tick)
    defer ticker.Stop()
    for {
        select {
        case <-c.stopCh:
            return
        case <-ticker.C:
            c.dispatchPending()
        }
    }
}

func (c *Controller) dispatchPending() {
    c.Lock()
    if len(c.pending) == 0 {
        c.Unlock()
        return
    }
    pending := c.pending
    c.pending = nil
    c.Unlock()

    remaining := pending[:0]
    for _, req := range pending {
        car, ok := c.carByID(req.carID)
        if !ok {
            remaining = append(remaining, req)
            continue
        }
        snap := car.snapshot()
        reqDir := direction(req.from, req.to)
        cost, _ := carCost(snap, req.from, req.to, reqDir, false)
        if cost == int64(math.MaxInt64) {
            remaining = append(remaining, req)
            continue
        }

        car.mu.Lock()
        if req.from == req.to {
            car.mu.Unlock()
            continue
        }
        if car.floor == req.from && car.doorsOpen && car.load < car.maxCapacity {
            car.load++
            car.dropoffs[req.to]++
            car.mu.Unlock()
            continue
        }
        car.pickups[req.from]++
        car.dropoffs[req.to]++
        if car.direction == Idle {
            if req.to > req.from {
                car.direction = Up
            } else if req.to < req.from {
                car.direction = Down
            }
        }
        car.mu.Unlock()
    }

    if len(remaining) > 0 {
        c.Lock()
        c.pending = append(remaining, c.pending...)
        c.Unlock()
    }
}

func (c *Controller) lowestCarID() (int, bool) {
    c.RLock()
    defer c.RUnlock()
    if len(c.cars) == 0 {
        return -1, false
    }
    minID := c.cars[0].id
    for _, car := range c.cars[1:] {
        if car.id < minID {
            minID = car.id
        }
    }
    return minID, true
}

func (c *Controller) carByID(id int) (*Car, bool) {
    c.RLock()
    defer c.RUnlock()
    for _, car := range c.cars {
        if car.id == id {
            return car, true
        }
    }
    return nil, false
}

func (c *Controller) queueCarID(from, to int, blockedByMomentum bool) (int, bool) {
    if !blockedByMomentum {
        return c.lowestCarID()
    }
    reqDir := direction(from, to)

    c.RLock()
    cars := append([]*Car(nil), c.cars...)
    c.RUnlock()
    if len(cars) == 0 {
        return -1, false
    }

    bestCost := int64(math.MaxInt64)
    bestID := -1
    for _, car := range cars {
        snap := car.snapshot()
        cost, _ := carCost(snap, from, to, reqDir, true)
        if cost < bestCost || (cost == bestCost && (bestID == -1 || snap.id < bestID)) {
            bestCost = cost
            bestID = snap.id
        }
    }
    if bestID == -1 {
        return -1, false
    }
    return bestID, true
}

// CarState is an immutable snapshot of a car for inspection.
type CarState struct {
    ID          int
    Floor       int
    Direction   Direction
    Load        int
    MaxCapacity int
    DoorsOpen   bool
}

// CarStates returns a snapshot of all cars.
func (c *Controller) CarStates() []CarState {
    c.RLock()
    cars := append([]*Car(nil), c.cars...)
    c.RUnlock()

    out := make([]CarState, 0, len(cars))
    for _, car := range cars {
        snap := car.snapshot()
        out = append(out, CarState{
            ID:          snap.id,
            Floor:       snap.floor,
            Direction:   snap.direction,
            Load:        snap.load,
            MaxCapacity: snap.maxCapacity,
            DoorsOpen:   snap.doorsOpen,
        })
    }
    return out
}

func (c *Controller) assignCar(from, to int) (*Car, bool, bool, error) {
    reqDir := direction(from, to)

    c.RLock()
    cars := append([]*Car(nil), c.cars...)
    c.RUnlock()
    if len(cars) == 0 {
        return nil, false, false, ErrNoAvailableCar
    }

    bestCost := int64(math.MaxInt64)
    var best *Car
    anyCapacity := false
    for _, car := range cars {
        snap := car.snapshot()
        if snap.load < snap.maxCapacity {
            anyCapacity = true
        }
        cost, eligibleNow := carCost(snap, from, to, reqDir, false)
        _ = eligibleNow
        if cost < bestCost || (cost == bestCost && (best == nil || snap.id < best.id)) {
            bestCost = cost
            best = car
        }
    }

    if bestCost == int64(math.MaxInt64) {
        if !anyCapacity {
            return nil, true, false, ErrNoAvailableCar
        }
        return nil, false, true, ErrNoAvailableCar
    }

    if bestCost == int64(math.MaxInt64) || best == nil {
        return nil, false, false, ErrNoAvailableCar
    }
    return best, false, false, nil
}

func direction(from, to int) Direction {
    if to > from {
        return Up
    }
    if to < from {
        return Down
    }
    return Idle
}

func carCost(s carSnapshot, from, to int, reqDir Direction, relaxMomentum bool) (int64, bool) {
    if s.load >= s.maxCapacity {
        return int64(math.MaxInt64), false
    }

    if s.doorsOpen && s.floor == from && s.load < s.maxCapacity {
        return 0, true
    }

    upStops, downStops, totalStops := pendingStops(s)

    if !relaxMomentum {
        if s.direction == Up && reqDir == Down && upStops > 0 {
            return int64(math.MaxInt64), false
        }
        if s.direction == Down && reqDir == Up && downStops > 0 {
            return int64(math.MaxInt64), false
        }
    }

    dist := abs(s.floor - from)
    cost := int64(dist) + int64(totalStops*2)

    if s.direction != Idle && reqDir != Idle && s.direction != reqDir {
        cost += 1_000_000
    }

    return cost, true
}

func pendingStops(s carSnapshot) (upStops int, downStops int, total int) {
    for floor, count := range s.pickups {
        total += count
        if floor > s.floor {
            upStops += count
        } else if floor < s.floor {
            downStops += count
        }
    }
    for floor, count := range s.dropoffs {
        total += count
        if floor > s.floor {
            upStops += count
        } else if floor < s.floor {
            downStops += count
        }
    }
    return upStops, downStops, total
}

func abs(v int) int {
    if v < 0 {
        return -v
    }
    return v
}
