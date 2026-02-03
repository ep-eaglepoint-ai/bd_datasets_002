package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
)






func TestCharge_EmptyAPIKey_ReturnsErrInvalidAPIKey(t *testing.T) {


	var requestMade bool
	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		requestMade = true
		w.WriteHeader(http.StatusOK)
	})

	client := NewTestClient("", payment.WithBaseURL(server.URL))
	_, err := client.Charge(context.Background(), payment.ChargeRequest{
		Amount:   1000,
		Currency: "USD",
	})

	assert.ErrorIs(t, err, payment.ErrInvalidAPIKey)
	assert.False(t, requestMade, "No HTTP request should be made for empty API key")
}

func TestCharge_AmountValidation_TableDriven(t *testing.T) {


	server := createTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(payment.ChargeResponse{ID: "ch_123", Amount: 1000})
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
			amount:      1000,
			expectError: false,
			errorType:   nil,
		},
		{
			name:        "minimum positive amount succeeds",
			amount:      1,
			expectError: false,
			errorType:   nil,
		},
		{
			name:        "large positive amount succeeds",
			amount:      9999999999,
			expectError: false,
			errorType:   nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewTestClient("test-api-key", payment.WithBaseURL(server.URL))
			_, err := client.Charge(context.Background(), payment.ChargeRequest{
				Amount:   tt.amount,
				Currency: "USD",
			})

			if tt.expectError {
				assert.ErrorIs(t, err, tt.errorType)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}




