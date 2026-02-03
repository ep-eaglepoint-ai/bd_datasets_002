package tests

import (
	"strings"
	"testing"

	"github.com/example/payment-gateway/payment"
	"github.com/stretchr/testify/assert"
)





func FuzzVerifyWebhook(f *testing.F) {

	f.Add([]byte(`{"event":"test"}`), "valid-signature", "secret123")
	f.Add([]byte{}, "", "")
	f.Add([]byte(`{"amount":1000}`), "abc123def456", "webhook-secret")
	f.Add([]byte(`null`), strings.Repeat("a", 64), "key")
	f.Add([]byte(`{"event":"charge.succeeded"}`), "0123456789abcdef", "my-secret")

	f.Fuzz(func(t *testing.T, payload []byte, signature, secret string) {
		client := NewTestClient("test-api-key", payment.WithWebhookSecret(secret))


		result := client.VerifyWebhook(payload, signature)


		if secret == "" {

			assert.False(t, result, "Empty secret must return false")
			return
		}


		correctSig := generateValidSignature(payload, secret)


		if signature == correctSig {
			assert.True(t, result, "Valid signature must return true")
		} else {
			assert.False(t, result, "Invalid signature must return false")
		}
	})
}




