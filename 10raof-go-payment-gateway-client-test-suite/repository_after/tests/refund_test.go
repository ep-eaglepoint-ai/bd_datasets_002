package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
)

func TestRefund_Success(t *testing.T) {
	expectedResponse := payment.RefundResponse{
		ID:       "rf_123",
		ChargeID: "ch_456",
		Amount:   500,
		Status:   "succeeded",
	}

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/v1/refunds", r.URL.Path)
		assert.Equal(t, "Bearer test-api-key", r.Header.Get("Authorization"))
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(expectedResponse)
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))
	resp, err := client.Refund(context.Background(), "ch_456", 500)

	assert.NoError(t, err)
	assert.Equal(t, expectedResponse.ID, resp.ID)
	assert.Equal(t, expectedResponse.ChargeID, resp.ChargeID)
	assert.Equal(t, expectedResponse.Amount, resp.Amount)
}

func TestRefund_HTTPStatusCreated(t *testing.T) {
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(payment.RefundResponse{ID: "rf_created", ChargeID: "ch_123", Amount: 500})
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))
	resp, err := client.Refund(context.Background(), "ch_123", 500)

	assert.NoError(t, err)
	assert.Equal(t, "rf_created", resp.ID)
}

func TestRefund_InvalidJSONResponse(t *testing.T) {
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("invalid json"))
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL), payment.WithRetries(0))
	_, err := client.Refund(context.Background(), "ch_123", 500)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to unmarshal response")
}

func TestRefund_ContextCancellation(t *testing.T) {
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(500 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	_, err := client.Refund(ctx, "ch_123", 500)

	assert.Error(t, err)
}

func TestRefund_RequestBodyCorrect(t *testing.T) {
	var receivedBody map[string]interface{}

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		json.NewDecoder(r.Body).Decode(&receivedBody)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(payment.RefundResponse{ID: "rf_123"})
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))
	_, err := client.Refund(context.Background(), "ch_456", 750)

	assert.NoError(t, err)
	assert.Equal(t, "ch_456", receivedBody["charge_id"])
	assert.Equal(t, float64(750), receivedBody["amount"])
}
