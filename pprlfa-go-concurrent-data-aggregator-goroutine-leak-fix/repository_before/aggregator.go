package aggregator

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

type DataSource struct {
	ID   string
	URL  string
}

type Result struct {
	SourceID string
	Data     []byte
	Error    error
}

type AggregatedResult struct {
	Results []Result
	Errors  []error
}

func fetchFromSource(source DataSource) ([]byte, error) {
	time.Sleep(100 * time.Millisecond)
	if source.ID == "source_3" {
		return nil, errors.New("connection timeout")
	}
	return []byte(fmt.Sprintf("data from %s", source.ID)), nil
}

func FetchAndAggregate(ctx context.Context, sources []DataSource, timeout time.Duration) (*AggregatedResult, error) {
	resultChan := make(chan Result)
	
	var wg sync.WaitGroup
	
	for _, source := range sources {
		wg.Add(1)
		go func(s DataSource) {
			data, err := fetchFromSource(s)
			resultChan <- Result{
				SourceID: s.ID,
				Data:     data,
				Error:    err,
			}
			wg.Done()
		}(source)
	}
	
	go func() {
		wg.Wait()
		close(resultChan)
	}()
	
	aggregated := &AggregatedResult{
		Results: make([]Result, 0),
		Errors:  make([]error, 0),
	}
	
	timeoutTimer := time.NewTimer(timeout)
	
	for {
		select {
		case result, ok := <-resultChan:
			if !ok {
				return aggregated, nil
			}
			if result.Error != nil {
				aggregated.Errors = append(aggregated.Errors, result.Error)
			} else {
				aggregated.Results = append(aggregated.Results, result)
			}
		case <-timeoutTimer.C:
			return aggregated, errors.New("aggregation timeout")
		}
	}
}

func ProcessBatch(ctx context.Context, batches [][]DataSource) ([]AggregatedResult, error) {
	resultChan := make(chan AggregatedResult)
	errChan := make(chan error)
	
	for _, batch := range batches {
		go func(b []DataSource) {
			result, err := FetchAndAggregate(ctx, b, 5*time.Second)
			if err != nil {
				errChan <- err
				return
			}
			resultChan <- *result
		}(batch)
	}
	
	results := make([]AggregatedResult, 0)
	var firstErr error
	
	for i := 0; i < len(batches); i++ {
		select {
		case result := <-resultChan:
			results = append(results, result)
		case err := <-errChan:
			if firstErr == nil {
				firstErr = err
			}
		case <-ctx.Done():
			return results, ctx.Err()
		}
	}
	
	return results, firstErr
}

func StreamResults(ctx context.Context, sources []DataSource, out chan<- Result) error {
	for _, source := range sources {
		go func(s DataSource) {
			data, err := fetchFromSource(s)
			out <- Result{
				SourceID: s.ID,
				Data:     data,
				Error:    err,
			}
		}(source)
	}
	return nil
}

