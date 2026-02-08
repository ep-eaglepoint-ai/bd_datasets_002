package tests

import (
    "reflect"
    "sync"
    "testing"
    "time"

    main "example.com/repository_after"
)

func TestConcurrentReadersNoRace(t *testing.T) {
    c := main.NewControllerWithConfig(5, 1, 10, 8, 5*time.Millisecond, 10*time.Millisecond)

    var wg sync.WaitGroup
    readers := 50
    loops := 1000
    wg.Add(readers)
    for r := 0; r < readers; r++ {
        go func() {
            defer wg.Done()
            for i := 0; i < loops; i++ {
                _ = c.CarStates()
            }
        }()
    }
    wg.Wait()
}

func TestControllerEmbedsRWMutex(t *testing.T) {
    c := main.NewControllerWithConfig(1, 1, 10, 8, 5*time.Millisecond, 10*time.Millisecond)
    typ := reflect.TypeOf(*c)
    field, ok := typ.FieldByName("RWMutex")
    if !ok {
        t.Fatalf("expected Controller to embed RWMutex")
    }
    if field.Anonymous != true {
        t.Fatalf("expected RWMutex to be embedded")
    }
}
