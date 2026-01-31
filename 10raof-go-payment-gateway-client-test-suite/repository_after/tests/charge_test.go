package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"sync/atomic"
	"testing"
	"time"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)





func TestCharge_Success_HTTPStatusCreated(t *testing.T) {
	expectedResponse := payment.ChargeResponse{
		ID:        "ch_123",
		Amount:    1000,
		Currency:  "USD",
		Status:    "succeeded",
		CreatedAt: time.Now().Unix(),
	}

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/v1/charges", r.URL.Path)
		assert.Equal(t, "Bearer test-api-key", r.Header.Get("Authorization"))
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(expectedResponse)
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))
	resp, err := client.Charge(context.Background(), payment.ChargeRequest{
		Amount:      1000,
		Currency:    "USD",
		Description: "Test charge",
	})

	require.NoError(t, err)
	assert.Equal(t, expectedResponse.ID, resp.ID)
	assert.Equal(t, expectedResponse.Amount, resp.Amount)
}

func TestCharge_Success_HTTPStatusOK(t *testing.T) {
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(payment.ChargeResponse{ID: "ch_ok", Amount: 1000})
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))
	resp, err := client.Charge(context.Background(), payment.ChargeRequest{Amount: 1000, Currency: "USD"})

	require.NoError(t, err)
	assert.Equal(t, "ch_ok", resp.ID)
}

func TestCharge_WithIdempotencyKey_SetsHeader(t *testing.T) {
	var idempotencyKeyReceived string

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		idempotencyKeyReceived = r.Header.Get("Idempotency-Key")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(payment.ChargeResponse{ID: "ch_123", Amount: 1000})
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))
	_, err := client.Charge(context.Background(), payment.ChargeRequest{
		Amount:         1000,
		Currency:       "USD",
		IdempotencyKey: "unique-key-123",
	})

	require.NoError(t, err)
	assert.Equal(t, "unique-key-123", idempotencyKeyReceived)
}

func TestCharge_InvalidJSONResponse(t *testing.T) {
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("invalid json"))
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL), payment.WithRetries(0))
	_, err := client.Charge(context.Background(), payment.ChargeRequest{Amount: 1000, Currency: "USD"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to unmarshal response")
}

func TestCharge_ServerError_ReturnsError(t *testing.T) {
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("internal server error"))
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL), payment.WithRetries(0))
	_, err := client.Charge(context.Background(), payment.ChargeRequest{Amount: 1000, Currency: "USD"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "unexpected status code: 500")
}

func TestCharge_ContextCancellationDuringBackoff(t *testing.T) {
	var attemptCount int32

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&attemptCount, 1)
		w.WriteHeader(http.StatusServiceUnavailable)
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL), payment.WithRetries(10))

	ctx, cancel := context.WithTimeout(context.Background(), 150*time.Millisecond)
	defer cancel()

	_, err := client.Charge(ctx, payment.ChargeRequest{Amount: 1000, Currency: "USD"})

	require.Error(t, err)

	assert.Less(t, atomic.LoadInt32(&attemptCount), int32(10))
}

func TestCharge_RequestBodyCorrect(t *testing.T) {
	var receivedBody payment.ChargeRequest

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		json.NewDecoder(r.Body).Decode(&receivedBody)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(payment.ChargeResponse{ID: "ch_123"})
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))
	_, err := client.Charge(context.Background(), payment.ChargeRequest{
		Amount:         2500,
		Currency:       "EUR",
		Description:    "Test payment",
		IdempotencyKey: "key-123",
	})

	require.NoError(t, err)
	assert.Equal(t, int64(2500), receivedBody.Amount)
	assert.Equal(t, "EUR", receivedBody.Currency)
	assert.Equal(t, "Test payment", receivedBody.Description)
	assert.Equal(t, "key-123", receivedBody.IdempotencyKey)
}




