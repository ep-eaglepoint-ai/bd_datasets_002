package tests

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
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

	assert.Error(t, err)
	assert.ErrorIs(t, err, payment.ErrTimeout)
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

	assert.Error(t, err)
	assert.ErrorIs(t, err, payment.ErrTimeout)
}

type timeoutError struct {
	timeout bool
}

func (e timeoutError) Error() string { return "timeout error" }
func (e timeoutError) Timeout() bool { return e.timeout }

func TestIsTimeoutError_Direct(t *testing.T) {
	assert.False(t, payment.IsTimeoutError(errors.New("generic")))
	assert.True(t, payment.IsTimeoutError(timeoutError{timeout: true}))
	assert.False(t, payment.IsTimeoutError(timeoutError{timeout: false}))
}
