package tests

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/example/payment-gateway/payment"
)

func createTestServer(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	return server
}

func generateValidSignature(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

type TestGateway interface {
	Charge(ctx context.Context, req payment.ChargeRequest) (*payment.ChargeResponse, error)
	Refund(ctx context.Context, chargeID string, amount int64) (*payment.RefundResponse, error)
	VerifyWebhook(payload []byte, signature string) bool
	GetTimeout() time.Duration
	GetMaxRetries() int
}

func NewTestClient(apiKey string, opts ...payment.Option) TestGateway {
	return payment.NewClient(apiKey, opts...)
}
