package elevator

// Car is a lightweight value type representing an elevator car.
// Fields are simple and accessed via controller-provided methods.
type Car struct {
    ID         int
    Floor      int
    Direction  int // -1 down, 0 idle, 1 up
    Load       int // current load
    MaxCapacity int // capacity limit
    // Pending stops in each direction used to enforce directional momentum.
    PendingUpStops   int
    PendingDownStops int
    // DoorsOpen indicates doors are currently open (dwell). While true, car must not move.
    DoorsOpen bool
    // DoorDwellTicks remaining ticks to keep doors open (decremented by movement goroutine).
    DoorDwellTicks int
}
