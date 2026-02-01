package tests

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"sync/atomic"
	"testing"
	"time"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
)

func TestCharge_RetryLogic_AttemptsConfiguredRetries(t *testing.T) {
	const maxRetries = 3
	var requestCount int32

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		count := atomic.AddInt32(&requestCount, 1)
		if count <= maxRetries {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(payment.ChargeResponse{ID: "ch_success", Amount: 1000})
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL), payment.WithRetries(maxRetries))
	resp, err := client.Charge(context.Background(), payment.ChargeRequest{Amount: 1000, Currency: "USD"})

	assert.NoError(t, err, "Final result must be successful")
	assert.Equal(t, "ch_success", resp.ID)
	assert.Equal(t, int32(maxRetries+1), atomic.LoadInt32(&requestCount),
		"Total request count must equal %d (initial + %d retries)", maxRetries+1, maxRetries)
}

func TestRefund_RetryLogic_AttemptsConfiguredRetries(t *testing.T) {
	const maxRetries = 2
	var requestCount int32

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		count := atomic.AddInt32(&requestCount, 1)
		if count <= maxRetries {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(payment.RefundResponse{ID: "rf_success", ChargeID: "ch_123", Amount: 500})
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL), payment.WithRetries(maxRetries))
	resp, err := client.Refund(context.Background(), "ch_123", 500)

	assert.NoError(t, err, "Final result must be successful")
	assert.Equal(t, "rf_success", resp.ID)
	assert.Equal(t, int32(maxRetries+1), atomic.LoadInt32(&requestCount))
}

func TestCharge_NonRetryableError_NoRetries(t *testing.T) {
	var requestCount int32

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requestCount, 1)
		w.WriteHeader(http.StatusUnauthorized)
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL), payment.WithRetries(5))
	_, err := client.Charge(context.Background(), payment.ChargeRequest{Amount: 1000, Currency: "USD"})

	assert.True(t, errors.Is(err, payment.ErrInvalidAPIKey), "Error must be ErrInvalidAPIKey")
	assert.Equal(t, int32(1), atomic.LoadInt32(&requestCount), "Server request count must be 1")
}

func TestRefund_NonRetryableError_NoRetries(t *testing.T) {
	var requestCount int32

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requestCount, 1)
		w.WriteHeader(http.StatusUnauthorized)
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL), payment.WithRetries(5))
	_, err := client.Refund(context.Background(), "ch_123", 500)

	assert.True(t, errors.Is(err, payment.ErrInvalidAPIKey), "Error must be ErrInvalidAPIKey")
	assert.Equal(t, int32(1), atomic.LoadInt32(&requestCount), "Server request count must be 1")
}

func TestCharge_RetryLoop_ContextCancel(t *testing.T) {
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	})

	client := NewTestClient("key", payment.WithBaseURL(server.URL), payment.WithRetries(10))

	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		time.Sleep(150 * time.Millisecond)
		cancel()
	}()

	_, err := client.Charge(ctx, payment.ChargeRequest{Amount: 1000, Currency: "USD"})
	assert.Error(t, err)
	assert.ErrorIs(t, err, context.Canceled)
}

func TestRefund_RetryLoop_ContextCancel(t *testing.T) {
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	})

	client := NewTestClient("key", payment.WithBaseURL(server.URL), payment.WithRetries(10))

	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		time.Sleep(150 * time.Millisecond)
		cancel()
	}()

	_, err := client.Refund(ctx, "ch_123", 500)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), context.Canceled.Error())
}
