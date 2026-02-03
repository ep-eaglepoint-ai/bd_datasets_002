package payment

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

var (
	ErrInvalidAPIKey    = errors.New("invalid API key")
	ErrInvalidAmount    = errors.New("amount must be positive")
	ErrChargeNotFound   = errors.New("charge not found")
	ErrRefundFailed     = errors.New("refund failed")
	ErrInvalidSignature = errors.New("invalid webhook signature")
	ErrTimeout          = errors.New("request timeout")
	ErrDuplicateCharge  = errors.New("duplicate charge detected")
)

type ChargeRequest struct {
	Amount         int64  `json:"amount"`
	Currency       string `json:"currency"`
	Description    string `json:"description"`
	IdempotencyKey string `json:"idempotency_key"`
}

type ChargeResponse struct {
	ID        string `json:"id"`
	Amount    int64  `json:"amount"`
	Currency  string `json:"currency"`
	Status    string `json:"status"`
	CreatedAt int64  `json:"created_at"`
}

type RefundResponse struct {
	ID       string `json:"id"`
	ChargeID string `json:"charge_id"`
	Amount   int64  `json:"amount"`
	Status   string `json:"status"`
}

type Client struct {
	apiKey        string
	baseURL       string
	httpClient    *http.Client
	timeout       time.Duration
	maxRetries    int
	webhookSecret string

	mu            sync.Mutex
	processedKeys map[string]*ChargeResponse
	inflight      map[string]chan struct{}
}

type Option func(*Client)

func WithTimeout(d time.Duration) Option {
	return func(c *Client) {
		c.timeout = d
		c.httpClient.Timeout = d
	}
}

func WithRetries(n int) Option {
	return func(c *Client) {
		c.maxRetries = n
	}
}

func WithBaseURL(url string) Option {
	return func(c *Client) {
		c.baseURL = url
	}
}

func WithWebhookSecret(secret string) Option {
	return func(c *Client) {
		c.webhookSecret = secret
	}
}

func NewClient(apiKey string, opts ...Option) *Client {
	c := &Client{
		apiKey:        apiKey,
		baseURL:       "https://api.payment.example.com",
		timeout:       30 * time.Second,
		maxRetries:    3,
		processedKeys: make(map[string]*ChargeResponse),
		inflight:      make(map[string]chan struct{}),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}

	for _, opt := range opts {
		opt(c)
	}

	return c
}

func (c *Client) Charge(ctx context.Context, req ChargeRequest) (*ChargeResponse, error) {
	if c.apiKey == "" {
		return nil, ErrInvalidAPIKey
	}

	if req.Amount <= 0 {
		return nil, ErrInvalidAmount
	}

	if req.IdempotencyKey != "" {
		c.mu.Lock()
		if existing, ok := c.processedKeys[req.IdempotencyKey]; ok {
			c.mu.Unlock()
			return existing, nil
		}
		if waitCh, ok := c.inflight[req.IdempotencyKey]; ok {
			c.mu.Unlock()
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-waitCh:
				return c.Charge(ctx, req)
			}
		}
		ch := make(chan struct{})
		c.inflight[req.IdempotencyKey] = ch
		c.mu.Unlock()

		defer func() {
			c.mu.Lock()
			delete(c.inflight, req.IdempotencyKey)
			close(ch)
			c.mu.Unlock()
		}()
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	var resp *ChargeResponse
	var lastErr error

	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(time.Duration(attempt*100) * time.Millisecond):
			}
		}

		resp, lastErr = c.doChargeRequest(ctx, body, req.IdempotencyKey)
		if lastErr == nil {
			break
		}

		if errors.Is(lastErr, ErrInvalidAPIKey) || errors.Is(lastErr, ErrInvalidAmount) {
			return nil, lastErr
		}
	}

	if lastErr != nil {
		return nil, lastErr
	}

	if req.IdempotencyKey != "" {
		c.mu.Lock()
		c.processedKeys[req.IdempotencyKey] = resp
		c.mu.Unlock()
	}

	return resp, nil
}

func (c *Client) doChargeRequest(ctx context.Context, body []byte, idempotencyKey string) (*ChargeResponse, error) {
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/v1/charges", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	if idempotencyKey != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return nil, ErrTimeout
		}
		if IsTimeoutError(err) {
			return nil, ErrTimeout
		}
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrInvalidAPIKey
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(respBody))
	}

	var chargeResp ChargeResponse
	if err := json.Unmarshal(respBody, &chargeResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &chargeResp, nil
}

func (c *Client) Refund(ctx context.Context, chargeID string, amount int64) (*RefundResponse, error) {
	if c.apiKey == "" {
		return nil, ErrInvalidAPIKey
	}

	if chargeID == "" {
		return nil, ErrChargeNotFound
	}

	if amount <= 0 {
		return nil, ErrInvalidAmount
	}

	reqBody := map[string]interface{}{
		"charge_id": chargeID,
		"amount":    amount,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	var resp *RefundResponse
	var lastErr error

	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(time.Duration(attempt*100) * time.Millisecond):
			}
		}

		resp, lastErr = c.doRefundRequest(ctx, body)
		if lastErr == nil {
			break
		}

		if errors.Is(lastErr, ErrInvalidAPIKey) || errors.Is(lastErr, ErrChargeNotFound) {
			return nil, lastErr
		}
	}

	if lastErr != nil {
		return nil, fmt.Errorf("refund failed after %d attempts: %w", c.maxRetries+1, lastErr)
	}

	return resp, nil
}

func (c *Client) doRefundRequest(ctx context.Context, body []byte) (*RefundResponse, error) {
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/v1/refunds", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return nil, ErrTimeout
		}
		if IsTimeoutError(err) {
			return nil, ErrTimeout
		}
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrInvalidAPIKey
	}

	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrChargeNotFound
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("refund request failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var refundResp RefundResponse
	if err := json.Unmarshal(respBody, &refundResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &refundResp, nil
}

func (c *Client) VerifyWebhook(payload []byte, signature string) bool {
	if c.webhookSecret == "" {
		return false
	}

	mac := hmac.New(sha256.New, []byte(c.webhookSecret))
	mac.Write(payload)
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	return subtle.ConstantTimeCompare([]byte(signature), []byte(expectedSig)) == 1
}

func (c *Client) GetTimeout() time.Duration {
	return c.timeout
}

func (c *Client) GetMaxRetries() int {
	return c.maxRetries
}

func IsTimeoutError(err error) bool {
	var e interface{ Timeout() bool }
	if errors.As(err, &e) {
		return e.Timeout()
	}
	return false
}
