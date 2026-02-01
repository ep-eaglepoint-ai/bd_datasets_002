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

func TestChargeAndRefundFlow(t *testing.T) {
	chargeID := "ch_integration_123"

	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.URL.Path {
		case "/v1/charges":
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(payment.ChargeResponse{
				ID:        chargeID,
				Amount:    5000,
				Currency:  "USD",
				Status:    "succeeded",
				CreatedAt: time.Now().Unix(),
			})
		case "/v1/refunds":
			var body map[string]interface{}
			json.NewDecoder(r.Body).Decode(&body)
			if body["charge_id"] == chargeID {
				w.WriteHeader(http.StatusOK)
				json.NewEncoder(w).Encode(payment.RefundResponse{
					ID:       "rf_456",
					ChargeID: chargeID,
					Amount:   2500,
					Status:   "succeeded",
				})
			} else {
				w.WriteHeader(http.StatusNotFound)
			}
		}
	})

	client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))

	chargeResp, err := client.Charge(context.Background(), payment.ChargeRequest{
		Amount:      5000,
		Currency:    "USD",
		Description: "Integration test",
	})
	assert.NoError(t, err)
	assert.Equal(t, chargeID, chargeResp.ID)

	refundResp, err := client.Refund(context.Background(), chargeResp.ID, 2500)
	assert.NoError(t, err)
	assert.Equal(t, chargeResp.ID, refundResp.ChargeID)
}

func TestWebhookVerificationFlow(t *testing.T) {
	secret := "webhook-secret-xyz"
	client := NewTestClient("test-api-key", payment.WithWebhookSecret(secret))

	webhookPayload := []byte(`{"event":"charge.succeeded","data":{"id":"ch_123"}}`)
	signature := generateValidSignature(webhookPayload, secret)

	assert.True(t, client.VerifyWebhook(webhookPayload, signature))

	tamperedPayload := []byte(`{"event":"charge.succeeded","data":{"id":"ch_999"}}`)
	assert.False(t, client.VerifyWebhook(tamperedPayload, signature))
}
