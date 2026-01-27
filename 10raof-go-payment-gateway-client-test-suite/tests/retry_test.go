package tests

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"sync/atomic"
	"testing"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// Criterion 11: Retry logic must attempt the configured number of retries
// Criterion 12: Non-retryable errors must not trigger retries
// ============================================================================

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

	require.NoError(t, err, "Final result must be successful")
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

	require.NoError(t, err, "Final result must be successful")
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




