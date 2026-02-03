package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"testing"

	"github.com/example/payment-gateway/payment"
)

func TestCharge_RaceConditionSafety(t *testing.T) {
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(payment.ChargeResponse{ID: "ch_race", Amount: 1000})
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))

	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			_, _ = client.Charge(context.Background(), payment.ChargeRequest{
				Amount:         1000,
				Currency:       "USD",
				IdempotencyKey: "race-key-" + string(rune('a'+idx%26)),
			})
		}(i)
	}
	wg.Wait()
}

func TestRefund_RaceConditionSafety(t *testing.T) {
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(payment.RefundResponse{ID: "rf_race", ChargeID: "ch_123", Amount: 500})
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))

	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = client.Refund(context.Background(), "ch_123", 500)
		}()
	}
	wg.Wait()
}




