package main

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

type PluginError struct {
	Code    int
	Message string
}

func (e *PluginError) Error() string {
	return fmt.Sprintf("Error %d: %s", e.Code, e.Message)
}

type Plugin interface {
	Execute(ctx context.Context, data string) error
}

type AnalyticsPlugin struct{}

func (a *AnalyticsPlugin) Execute(ctx context.Context, data string) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	if data == "bad_input" {
		return &PluginError{Code: 500, Message: "Processing failed"}
	}

	return nil
}

type PluginManager struct {
	plugins []Plugin
	mu      sync.RWMutex
	stats   map[string]int
}

func NewPluginManager() *PluginManager {
	return &PluginManager{
		plugins: []Plugin{&AnalyticsPlugin{}},
		stats:   make(map[string]int),
	}
}

func (pm *PluginManager) ProcessTransaction(ctx context.Context, txnID string, data string) error {
	resultChan := make(chan error, 1)

	go func() {
		for _, p := range pm.plugins {
			select {
			case <-ctx.Done():
				resultChan <- ctx.Err()
				return
			default:
			}

			err := p.Execute(ctx, data)
			if err != nil {
				resultChan <- err
				return
			}
		}

		pm.mu.Lock()
		pm.stats["processed_count"]++
		pm.mu.Unlock()

		resultChan <- nil
	}()

	select {
	case err := <-resultChan:
		return err
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (pm *PluginManager) GetStats(key string) int {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	return pm.stats[key]
}

func main() {
	pm := NewPluginManager()

	ctx1, cancel1 := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel1()

	err1 := pm.ProcessTransaction(ctx1, "tx1", "good_input")
	if err1 != nil {
		fmt.Printf("Transaction FAILED: %v\n", err1)
	} else {
		fmt.Println("Transaction SUCCESS")
	}

	ctx2, cancel2 := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel2()

	err2 := pm.ProcessTransaction(ctx2, "tx2", "bad_input")
	if err2 != nil {
		fmt.Printf("Transaction FAILED (expectedly): %v\n", err2)
		var pErr *PluginError
		if errors.As(err2, &pErr) {
			fmt.Printf("Successfully recovered PluginError: Code=%d, Message=%s\n", pErr.Code, pErr.Message)
		} else {
			fmt.Println("Error: Failed to recover PluginError via errors.As")
		}
	}

	fmt.Printf("Processed count: %d\n", pm.GetStats("processed_count"))
}
