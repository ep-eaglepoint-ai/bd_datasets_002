package tests

import (
	"strings"
	"testing"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
)

// ============================================================================
// Criterion 17: Fuzz testing must exercise webhook signature verification
// ============================================================================

func FuzzVerifyWebhook(f *testing.F) {
	// Add seed corpus
	f.Add([]byte(`{"event":"test"}`), "valid-signature", "secret123")
	f.Add([]byte{}, "", "")
	f.Add([]byte(`{"amount":1000}`), "abc123def456", "webhook-secret")
	f.Add([]byte(`null`), strings.Repeat("a", 64), "key")
	f.Add([]byte(`{"event":"charge.succeeded"}`), "0123456789abcdef", "my-secret")

	f.Fuzz(func(t *testing.T, payload []byte, signature, secret string) {
		client := NewTestClient("test-api-key", payment.WithWebhookSecret(secret))

		// Should not panic
		result := client.VerifyWebhook(payload, signature)

		// Compute whether the signature is valid
		if secret == "" {
			// If secret is empty, should always return false
			assert.False(t, result, "Empty secret must return false")
			return
		}

		// Compute expected signature
		correctSig := generateValidSignature(payload, secret)

		// Assert the function returns the correct boolean
		if signature == correctSig {
			assert.True(t, result, "Valid signature must return true")
		} else {
			assert.False(t, result, "Invalid signature must return false")
		}
	})
}




