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
)

func TestRefund_EmptyAPIKey_ReturnsErrInvalidAPIKey(t *testing.T) {

	var requestMade bool
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		requestMade = true
		w.WriteHeader(http.StatusOK)
	})

	client := NewTestClient("", payment.WithBaseURL(server.URL))
	_, err := client.Refund(context.Background(), "ch_123", 500)

	assert.ErrorIs(t, err, payment.ErrInvalidAPIKey)
	assert.False(t, requestMade, "No HTTP request should be made for empty API key")
}

func TestRefund_EmptyChargeID_ReturnsErrChargeNotFound(t *testing.T) {

	var requestMade bool
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		requestMade = true
		w.WriteHeader(http.StatusOK)
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))
	_, err := client.Refund(context.Background(), "", 500)

	assert.ErrorIs(t, err, payment.ErrChargeNotFound)
	assert.False(t, requestMade, "No HTTP request should be made for empty chargeID")
}

func TestRefund_AmountValidation_TableDriven(t *testing.T) {

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(payment.RefundResponse{ID: "rf_123", ChargeID: "ch_123", Amount: 500})
	})

	tests := []struct {
		name        string
		amount      int64
		expectError bool
		errorType   error
	}{
		{
			name:        "zero amount returns ErrInvalidAmount",
			amount:      0,
			expectError: true,
			errorType:   payment.ErrInvalidAmount,
		},
		{
			name:        "negative one returns ErrInvalidAmount",
			amount:      -1,
			expectError: true,
			errorType:   payment.ErrInvalidAmount,
		},
		{
			name:        "negative hundred returns ErrInvalidAmount",
			amount:      -100,
			expectError: true,
			errorType:   payment.ErrInvalidAmount,
		},
		{
			name:        "positive amount succeeds",
			amount:      500,
			expectError: false,
			errorType:   nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))
			_, err := client.Refund(context.Background(), "ch_123", tt.amount)

			if tt.expectError {
				assert.ErrorIs(t, err, tt.errorType)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestRefund_HTTP404_ReturnsErrChargeNotFound_NoRetries(t *testing.T) {

	var requestCount int32

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requestCount, 1)
		w.WriteHeader(http.StatusNotFound)
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL), payment.WithRetries(5))
	_, err := client.Refund(context.Background(), "ch_nonexistent", 500)

	assert.True(t, errors.Is(err, payment.ErrChargeNotFound), "Error must satisfy errors.Is(err, ErrChargeNotFound)")
	assert.Equal(t, int32(1), atomic.LoadInt32(&requestCount), "No retries should be attempted for 404")
}

func TestRefund_ErrorPropagation_ServerErrors(t *testing.T) {

	tests := []struct {
		name       string
		statusCode int
	}{
		{"HTTP 500 Internal Server Error", http.StatusInternalServerError},
		{"HTTP 502 Bad Gateway", http.StatusBadGateway},
		{"HTTP 503 Service Unavailable", http.StatusServiceUnavailable},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.statusCode)
				w.Write([]byte("server error"))
			})

			client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL), payment.WithRetries(0))
			_, err := client.Refund(context.Background(), "ch_123", 500)

			assert.Error(t, err, "Refund MUST return non-nil error for status %d", tt.statusCode)
			assert.Contains(t, err.Error(), "refund failed", "Error should contain failure details")
		})
	}
}
