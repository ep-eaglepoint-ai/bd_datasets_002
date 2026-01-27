package tests

import (
	"testing"
	"time"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
)

// ============================================================================
// NewClient and Option Functions Tests
// ============================================================================

func TestNewClient_DefaultValues(t *testing.T) {
	client := NewTestClient("test-api-key")

	assert.NotNil(t, client)
	// Cannot check unexported fields from external package:
	// apiKey, baseURL, webhookSecret, httpClient, processedKeys

	// Can check exposed getters
	assert.Equal(t, 30*time.Second, client.GetTimeout())
	assert.Equal(t, 3, client.GetMaxRetries())
}

func TestNewClient_WithAllOptions(t *testing.T) {
	client := NewTestClient("test-api-key",
		payment.WithTimeout(10*time.Second),
		payment.WithRetries(5),
		payment.WithBaseURL("https://custom.api.com"),
		payment.WithWebhookSecret("webhook-secret"),
	)

	assert.Equal(t, 10*time.Second, client.GetTimeout())
	assert.Equal(t, 5, client.GetMaxRetries())
	// BaseURL and WebhookSecret cannot be verified directly via getters
	// They are verified via functional tests (Charge/VerifyWebhook)
}

func TestWithTimeout(t *testing.T) {
	client := NewTestClient("key", payment.WithTimeout(5*time.Second))
	assert.Equal(t, 5*time.Second, client.GetTimeout())
}

func TestWithRetries(t *testing.T) {
	client := NewTestClient("key", payment.WithRetries(7))
	assert.Equal(t, 7, client.GetMaxRetries())
}

// WithBaseURL and WithWebhookSecret tests are removed as they check unexported fields
// and are covered by functional tests in other files.

func TestGetTimeout(t *testing.T) {
	client := NewTestClient("key", payment.WithTimeout(15*time.Second))
	assert.Equal(t, 15*time.Second, client.GetTimeout())
}

func TestGetMaxRetries(t *testing.T) {
	client := NewTestClient("key", payment.WithRetries(10))
	assert.Equal(t, 10, client.GetMaxRetries())
}




