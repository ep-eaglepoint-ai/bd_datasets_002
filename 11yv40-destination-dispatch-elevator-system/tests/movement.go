package tests

import (
    "sync"
    "time"
)

// StartMovement starts a goroutine that moves cars one floor per tick.
// It returns a stop function that stops the goroutine and waits for it to exit.
// Movement obeys directional momentum and does not teleport cars.
func (c *Controller) StartMovement(tick time.Duration) func() {
    stop := make(chan struct{})
    var wg sync.WaitGroup
    wg.Add(1)
    go func() {
        defer wg.Done()
        ticker := time.NewTicker(tick)
        defer ticker.Stop()
        for {
            select {
            case <-ticker.C:
                c.Lock()
                for i := range c.cars {
                    car := &c.cars[i]

                    // Handle door dwell first: if doors are open, decrement ticks
                    // and skip movement while DoorsOpen is true.
                    if car.DoorDwellTicks > 0 {
                        car.DoorDwellTicks--
                        car.DoorsOpen = true
                        if car.DoorDwellTicks == 0 {
                            car.DoorsOpen = false
                            // after dwell, if there are pending stops, set direction
                            if car.PendingUpStops > 0 {
                                car.Direction = 1
                            } else if car.PendingDownStops > 0 {
                                car.Direction = -1
                            } else {
                                car.Direction = 0
                            }
                        }
                        continue
                    }

                    // Determine desired movement for this tick
                    if car.Direction == 1 && car.PendingUpStops > 0 {
                        car.Floor++
                        car.PendingUpStops--
                        if car.PendingUpStops == 0 {
                            if car.PendingDownStops > 0 {
                                car.Direction = -1
                            } else {
                                car.Direction = 0
                            }
                        }
                    } else if car.Direction == -1 && car.PendingDownStops > 0 {
                        car.Floor--
                        car.PendingDownStops--
                        if car.PendingDownStops == 0 {
                            if car.PendingUpStops > 0 {
                                car.Direction = 1
                            } else {
                                car.Direction = 0
                            }
                        }
                    } else if car.Direction == 0 {
                        // Idle cars can start moving if they have pending stops
                        if car.PendingUpStops > 0 {
                            car.Direction = 1
                        } else if car.PendingDownStops > 0 {
                            car.Direction = -1
                        }
                    }
                }
                c.Unlock()
            case <-stop:
                return
            }
        }
    }()

    return func() {
        close(stop)
        wg.Wait()
    }
}
