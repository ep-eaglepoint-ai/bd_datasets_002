package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)






func TestCharge_IdempotencyPreventsDoubleCharge(t *testing.T) {



	var requestCount int32

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requestCount, 1)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(payment.ChargeResponse{
			ID:     "ch_123",
			Amount: 1000,
		})
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))


	resp1, err1 := client.Charge(context.Background(), payment.ChargeRequest{
		Amount:         1000,
		Currency:       "USD",
		IdempotencyKey: "idem-key-123",
	})
	require.NoError(t, err1)
	assert.Equal(t, int32(1), atomic.LoadInt32(&requestCount), "First call should make exactly 1 request")
	assert.Equal(t, "ch_123", resp1.ID)


	resp2, err2 := client.Charge(context.Background(), payment.ChargeRequest{
		Amount:         1000,
		Currency:       "USD",
		IdempotencyKey: "idem-key-123",
	})
	require.NoError(t, err2)
	assert.Equal(t, int32(1), atomic.LoadInt32(&requestCount), "Second call should NOT make additional request, count must remain 1")
	assert.Equal(t, resp1.ID, resp2.ID, "Second call must return cached response")
	assert.Equal(t, resp1, resp2, "Responses must be identical")
}

func TestCharge_DifferentIdempotencyKeysAllowMultipleCharges(t *testing.T) {
	var requestCount int32

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requestCount, 1)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(payment.ChargeResponse{
			ID:     "ch_" + r.Header.Get("Idempotency-Key"),
			Amount: 1000,
		})
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))


	resp1, err1 := client.Charge(context.Background(), payment.ChargeRequest{
		Amount:         1000,
		Currency:       "USD",
		IdempotencyKey: "key-1",
	})
	require.NoError(t, err1)


	resp2, err2 := client.Charge(context.Background(), payment.ChargeRequest{
		Amount:         1000,
		Currency:       "USD",
		IdempotencyKey: "key-2",
	})
	require.NoError(t, err2)

	assert.Equal(t, int32(2), atomic.LoadInt32(&requestCount))
	assert.NotEqual(t, resp1.ID, resp2.ID)
}

func TestCharge_NoIdempotencyKeyAllowsDuplicates(t *testing.T) {
	var requestCount int32

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requestCount, 1)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(payment.ChargeResponse{ID: "ch_123", Amount: 1000})
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))


	_, err1 := client.Charge(context.Background(), payment.ChargeRequest{Amount: 1000, Currency: "USD"})
	require.NoError(t, err1)

	_, err2 := client.Charge(context.Background(), payment.ChargeRequest{Amount: 1000, Currency: "USD"})
	require.NoError(t, err2)

	assert.Equal(t, int32(2), atomic.LoadInt32(&requestCount))
}

func TestCharge_IdempotencyConcurrent(t *testing.T) {


	var requestCount int32
	var serverMu sync.Mutex
	var firstResponse *payment.ChargeResponse

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requestCount, 1)

		serverMu.Lock()
		if firstResponse == nil {
			firstResponse = &payment.ChargeResponse{
				ID:        "ch_concurrent_123",
				Amount:    1000,
				Currency:  "USD",
				Status:    "succeeded",
				CreatedAt: time.Now().Unix(),
			}
		}
		resp := firstResponse
		serverMu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(resp)
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))

	const numGoroutines = 10
	var wg sync.WaitGroup
	results := make([]*payment.ChargeResponse, numGoroutines)
	errs := make([]error, numGoroutines)


	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			resp, err := client.Charge(context.Background(), payment.ChargeRequest{
				Amount:         1000,
				Currency:       "USD",
				IdempotencyKey: "concurrent-key",
			})
			results[idx] = resp
			errs[idx] = err
		}(i)
	}

	wg.Wait()


	for i := 0; i < numGoroutines; i++ {
		assert.NoError(t, errs[i], "goroutine %d should not have error", i)
		assert.NotNil(t, results[i], "goroutine %d should have response", i)
	}


	for i := 1; i < numGoroutines; i++ {
		if results[i] != nil && results[0] != nil {
			assert.Equal(t, results[0].ID, results[i].ID, "all responses should have same ID")
		}
	}



	resp, err := client.Charge(context.Background(), payment.ChargeRequest{
		Amount:         1000,
		Currency:       "USD",
		IdempotencyKey: "concurrent-key",
	})
	require.NoError(t, err)
	assert.Equal(t, "ch_concurrent_123", resp.ID)


	countAfterConcurrent := atomic.LoadInt32(&requestCount)

	resp2, err := client.Charge(context.Background(), payment.ChargeRequest{
		Amount:         1000,
		Currency:       "USD",
		IdempotencyKey: "concurrent-key",
	})
	require.NoError(t, err)
	assert.Equal(t, resp.ID, resp2.ID)
	assert.Equal(t, countAfterConcurrent, atomic.LoadInt32(&requestCount), "cached call should not make HTTP request")
}




