package repository_after

import (
    "fmt"
    "time"
)

func main() {
    controller := NewController(2)
    controller.Start()
    defer controller.Stop()

    if id, err := controller.RequestRide(1, 20); err == nil {
        fmt.Println("assigned car:", id)
    }

    time.Sleep(500 * time.Millisecond)
}
