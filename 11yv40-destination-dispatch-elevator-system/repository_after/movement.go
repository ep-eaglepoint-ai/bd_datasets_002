package repository_after

import "time"

func (c *Controller) runCar(car *Car) {
    defer c.wg.Done()
    ticker := time.NewTicker(c.tick)
    defer ticker.Stop()

    for {
        select {
        case <-c.stopCh:
            return
        case now := <-ticker.C:
            car.mu.Lock()

            // Door dwell: keep doors open until the dwell time elapses.
            if car.doorsOpen {
                if now.Before(car.doorUntil) {
                    car.mu.Unlock()
                    continue
                }
                car.doorsOpen = false
            }

            // If we should stop at this floor, open doors and board/alight.
            if car.shouldStopAtCurrent() {
                car.openDoors(now, c.doorDwell)
                car.mu.Unlock()
                continue
            }

            // Re-evaluate direction if idle or no remaining stops in current direction.
            if car.direction == Idle {
                car.direction = car.nextDirection()
            } else if car.direction == Up && !car.hasStopsAbove() {
                car.direction = car.nextDirection()
            } else if car.direction == Down && !car.hasStopsBelow() {
                car.direction = car.nextDirection()
            }

            // Move one floor in the current direction.
            if car.direction == Up {
                if car.floor < c.maxFloor {
                    car.floor++
                } else {
                    car.direction = Down
                }
            } else if car.direction == Down {
                if car.floor > c.minFloor {
                    car.floor--
                } else {
                    car.direction = Up
                }
            }

            car.mu.Unlock()
        }
    }
}

func (c *Car) shouldStopAtCurrent() bool {
    pickupCount := c.pickups[c.floor]
    dropoffCount := c.dropoffs[c.floor]

    if dropoffCount > 0 {
        c.load -= dropoffCount
        if c.load < 0 {
            c.load = 0
        }
        delete(c.dropoffs, c.floor)
    }

    boarded := 0
    if pickupCount > 0 && c.load < c.maxCapacity {
        available := c.maxCapacity - c.load
        if pickupCount <= available {
            c.load += pickupCount
            boarded = pickupCount
            delete(c.pickups, c.floor)
        } else {
            c.load += available
            boarded = available
            c.pickups[c.floor] = pickupCount - available
        }
    }

    // Doors should open if any boarding or alighting occurred.
    return dropoffCount > 0 || boarded > 0
}

func (c *Car) openDoors(now time.Time, dwell time.Duration) {
    c.doorsOpen = true
    if dwell <= 0 {
        c.doorUntil = now
        return
    }
    c.doorUntil = now.Add(dwell)
}

func (c *Car) nextDirection() Direction {
    hasAbove := false
    hasBelow := false
    for floor := range c.pickups {
        if floor > c.floor {
            hasAbove = true
        } else if floor < c.floor {
            hasBelow = true
        }
    }
    for floor := range c.dropoffs {
        if floor > c.floor {
            hasAbove = true
        } else if floor < c.floor {
            hasBelow = true
        }
    }
    if hasAbove {
        return Up
    }
    if hasBelow {
        return Down
    }
    return Idle
}

func (c *Car) hasStopsAbove() bool {
    for floor := range c.pickups {
        if floor > c.floor {
            return true
        }
    }
    for floor := range c.dropoffs {
        if floor > c.floor {
            return true
        }
    }
    return false
}

func (c *Car) hasStopsBelow() bool {
    for floor := range c.pickups {
        if floor < c.floor {
            return true
        }
    }
    for floor := range c.dropoffs {
        if floor < c.floor {
            return true
        }
    }
    return false
}
