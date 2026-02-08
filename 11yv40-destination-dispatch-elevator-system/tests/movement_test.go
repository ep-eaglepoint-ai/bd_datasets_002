package tests

import (
    "testing"
    "time"

    main "example.com/repository_after"
)

func TestMovementSim(t *testing.T) {
    tick := 20 * time.Millisecond
    c := main.NewControllerWithConfig(1, 1, 10, 8, tick, 10*time.Millisecond)
    c.Start()
    defer c.Stop()

    if _, err := c.RequestRide(1, 4); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    start := time.Now()
    deadline := time.After(2 * time.Second)
    for {
        states := c.CarStates()
        if len(states) == 1 && states[0].Floor >= 4 {
            break
        }
        select {
        case <-deadline:
            t.Fatalf("timeout waiting for movement")
        default:
            time.Sleep(5 * time.Millisecond)
        }
    }

    elapsed := time.Since(start)
    if elapsed < 3*tick {
        t.Fatalf("movement too fast: elapsed %v, expected >= %v", elapsed, 3*tick)
    }
}
