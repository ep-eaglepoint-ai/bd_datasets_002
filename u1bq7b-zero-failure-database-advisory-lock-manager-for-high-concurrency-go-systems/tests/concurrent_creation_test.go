package dblock_test

import (
	"sync"
	"testing"

	"dblock-demo/dblock"
)

func TestBasic_ConcurrentHelperCreation(t *testing.T) {
	var wg sync.WaitGroup
	helpers := make([]*dblock.DatabaseLockHelper, 100)
	
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			helpers[idx] = dblock.NewDatabaseLockHelper(nil, "test")
		}(i)
	}
	wg.Wait()

	for i, h := range helpers {
		if h == nil {
			t.Errorf("Helper %d is nil", i)
		}
	}
}
