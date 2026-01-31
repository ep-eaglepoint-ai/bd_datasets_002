package tests

import (
	"testing"
	"time"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
)

func TestNewClient_DefaultValues(t *testing.T) {
	client := NewTestClient("test-api-key")

	assert.NotNil(t, client)

	assert.Equal(t, 30*time.Second, client.GetTimeout())
	assert.Equal(t, 3, client.GetMaxRetries())
}

func TestNewClient_WithAllOptions(t *testing.T) {
	client := NewTestClient("test-api-key",
		payment.WithTimeout(10*time.Second),
		payment.WithRetries(5),
		payment.WithBaseURL("https://api.example.com"),
		payment.WithWebhookSecret("webhook-secret"),
	)

	assert.Equal(t, 10*time.Second, client.GetTimeout())
	assert.Equal(t, 5, client.GetMaxRetries())

}

func TestWithTimeout(t *testing.T) {
	client := NewTestClient("key", payment.WithTimeout(5*time.Second))
	assert.Equal(t, 5*time.Second, client.GetTimeout())
}

func TestWithRetries(t *testing.T) {
	client := NewTestClient("key", payment.WithRetries(7))
	assert.Equal(t, 7, client.GetMaxRetries())
}

func TestGetTimeout(t *testing.T) {
	client := NewTestClient("key", payment.WithTimeout(15*time.Second))
	assert.Equal(t, 15*time.Second, client.GetTimeout())
}

func TestGetMaxRetries(t *testing.T) {
	client := NewTestClient("key", payment.WithRetries(10))
	assert.Equal(t, 10, client.GetMaxRetries())
}
