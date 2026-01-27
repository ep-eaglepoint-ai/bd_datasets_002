package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
)

// ============================================================================
// Criterion 13: Invalid API key must return ErrInvalidAPIKey immediately
// Criterion 14 & 16: Table-driven tests for amount validation edge cases
// ============================================================================

func TestCharge_EmptyAPIKey_ReturnsErrInvalidAPIKey(t *testing.T) {
	// Criterion 13: When NewClient is called with empty string API key,
	// any Charge call must return ErrInvalidAPIKey without making any HTTP request
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
	// Criterion 14 & 16: Amount values of 0, -1, -100, and valid positive values
	// must be tested in a single table-driven test function using t.Run for each case
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




