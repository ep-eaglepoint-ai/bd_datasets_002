package tests

import (
	"strings"
	"testing"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
)







func TestVerifyWebhook_ValidSignature(t *testing.T) {
	secret := "webhook-secret-123"
	payload := []byte(`{"event":"charge.succeeded","charge_id":"ch_123"}`)
	signature := generateValidSignature(payload, secret)

	client := NewTestClient("test-api-key", payment.WithWebhookSecret(secret))
	result := client.VerifyWebhook(payload, signature)

	assert.True(t, result)
}

func TestVerifyWebhook_EmptyPayload(t *testing.T) {
	secret := "webhook-secret-123"
	payload := []byte{}
	signature := generateValidSignature(payload, secret)

	client := NewTestClient("test-api-key", payment.WithWebhookSecret(secret))
	result := client.VerifyWebhook(payload, signature)

	assert.True(t, result)
}

func TestVerifyWebhook_RejectsInvalidSignatures(t *testing.T) {
	secret := "webhook-secret-123"
	payload := []byte(`{"event":"charge.succeeded","charge_id":"ch_123"}`)
	validSignature := generateValidSignature(payload, secret)

	client := NewTestClient("test-api-key", payment.WithWebhookSecret(secret))

	tests := []struct {
		name      string
		signature string
	}{
		{"wrong value", "completely-wrong-signature"},
		{"wrong length short", "abc123"},
		{"wrong length long", validSignature + "extra-characters-appended"},
		{"truncated", validSignature[:len(validSignature)/2]},
		{"empty string", ""},
		{"single character", "a"},
		{"valid length but wrong", strings.Repeat("a", len(validSignature))},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := client.VerifyWebhook(payload, tt.signature)
			assert.False(t, result, "Invalid signature '%s' must return false", tt.name)
		})
	}


	assert.True(t, client.VerifyWebhook(payload, validSignature), "Valid signature should return true")
}

func TestVerifyWebhook_RejectsCraftedPayloads(t *testing.T) {
	secret := "webhook-secret-123"
	originalPayload := []byte(`{"event":"charge.succeeded","amount":1000}`)
	originalSignature := generateValidSignature(originalPayload, secret)

	client := NewTestClient("test-api-key", payment.WithWebhookSecret(secret))

	assert.True(t, client.VerifyWebhook(originalPayload, originalSignature))

	craftedPayloads := []struct {
		name    string
		payload []byte
	}{
		{"modified amount", []byte(`{"event":"charge.succeeded","amount":9999}`)},
		{"added field", []byte(`{"event":"charge.succeeded","amount":1000,"extra":"field"}`)},
		{"removed field", []byte(`{"event":"charge.succeeded"}`)},
		{"changed event type", []byte(`{"event":"refund.succeeded","amount":1000}`)},
		{"whitespace added", []byte(`{"event": "charge.succeeded", "amount": 1000}`)},
		{"empty payload", []byte(``)},
		{"null payload", []byte(`null`)},
	}

	for _, tt := range craftedPayloads {
		t.Run(tt.name, func(t *testing.T) {
			result := client.VerifyWebhook(tt.payload, originalSignature)
			assert.False(t, result, "Crafted payload '%s' with original signature must return false", tt.name)
		})
	}
}

func TestVerifyWebhook_EmptySecret_ReturnsFalse(t *testing.T) {
	client := NewTestClient("test-api-key")

	testCases := []struct {
		name      string
		payload   []byte
		signature string
	}{
		{"valid-looking payload and signature", []byte(`{"event":"test"}`), "abc123def456"},
		{"empty payload and signature", []byte{}, ""},
		{"null payload", nil, "signature"},
		{"payload with computed signature", []byte(`{"event":"test"}`), generateValidSignature([]byte(`{"event":"test"}`), "some-secret")},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := client.VerifyWebhook(tc.payload, tc.signature)
			assert.False(t, result, "VerifyWebhook must return false when webhook secret is empty")
		})
	}
}




