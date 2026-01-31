package after

import (
    "sync"
    "testing"

    "tests/elevator"
)

func TestConcurrentReadersNoRace(t *testing.T) {
    c := elevator.NewController()
    if c == nil {
        t.Fatalf("NewController returned nil")
    }

    for i := 0; i < 10; i++ {
        c.AddCar(elevator.Car{ID: i, Floor: i})
    }

    var wg sync.WaitGroup
    readers := 50
    loops := 1000
    wg.Add(readers)
    for r := 0; r < readers; r++ {
        go func() {
            defer wg.Done()
            for i := 0; i < loops; i++ {
                _ = c.NumCars()
                _ = c.Cars()
                c.CarByID(i % 10)
            }
        }()
    }
    wg.Wait()
}
