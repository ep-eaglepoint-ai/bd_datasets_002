package tests

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)





func TestCharge_Timeout_ReturnsErrTimeout(t *testing.T) {
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	})


	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL), payment.WithRetries(0))
	_, err := client.Charge(ctx, payment.ChargeRequest{Amount: 1000, Currency: "USD"})

	require.Error(t, err)
	assert.True(t, errors.Is(err, payment.ErrTimeout) || errors.Is(err, context.DeadlineExceeded),
		"Error should be ErrTimeout or context.DeadlineExceeded, got: %v", err)
}

func TestRefund_Timeout_ReturnsErrTimeout(t *testing.T) {
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	})

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL), payment.WithRetries(0))
	_, err := client.Refund(ctx, "ch_123", 500)

	require.Error(t, err)
	assert.True(t, errors.Is(err, payment.ErrTimeout) || errors.Is(err, context.DeadlineExceeded),
		"Error should be ErrTimeout or context.DeadlineExceeded, got: %v", err)
}




