package main

import (
	"crypto/sha256"
	"encoding/binary"
	"errors"
	"math"
	"net/url"
	"sync"
)

// Constants for Base62 encoding
const (
	keyLength = 7
	charset   = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
)

// URLShortener provides a thread-safe URL shortening service.
type URLShortener struct {
	mu    sync.RWMutex
	Store map[string]string // Exported for white-box testing
}

var (
	// Service Global singleton instance - Exported for white-box testing
	Service = &URLShortener{
		Store: make(map[string]string),
	}
	// ErrInvalidURL indicates the provided URL is malformed or not absolute.
	ErrInvalidURL = errors.New("invalid URL: must be an absolute URL with scheme and host")
)

// Shorten accepts a URL and returns a 7-character thread-safe unique key.
// Returns an empty string if validaton fails.
func Shorten(originalURL string) string {
	key, err := Service.Shorten(originalURL)
	if err != nil {
		return ""
	}
	return key
}

// Resolve retrieves the original URL for a given short key.
func Resolve(shortKey string) string {
	return Service.Resolve(shortKey)
}

// Shorten generates a unique key for the URL, handling collisions and concurrency.
func (s *URLShortener) Shorten(originalURL string) (string, error) {
	// 1. Validation: Strict absolute URL check
	u, err := url.Parse(originalURL)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return "", ErrInvalidURL
	}
	// Note: We deliberately use the original string for storage to preserve exact formatting.

	// 2. Generation & Collision Handling
	salt := 0
	for {
		// Generate candidate key from URL + salt
		key := GenerateKey(originalURL, salt)

		// Check existence (Read Lock)
		s.mu.RLock()
		existingURL, exists := s.Store[key]
		s.mu.RUnlock()

		if !exists {
			// Try to acquire Write Lock to store
			s.mu.Lock()
			// Double-check existence after acquiring lock
			existingURL, exists = s.Store[key]
			if exists {
				// Another goroutine filled this slot
				if existingURL == originalURL {
					s.mu.Unlock()
					return key, nil
				}
				// True collision (race condition style), retry loop
				s.mu.Unlock()
				salt++
				continue
			}

			// Store the new mapping
			s.Store[key] = originalURL
			s.mu.Unlock()
			return key, nil
		}

		// Slot exists, check if it's the same URL (Idempotency)
		if existingURL == originalURL {
			return key, nil
		}

		// Collision: Same key, different URL. Increment salt and retry.
		salt++
		
		// Safety valve (optional, but practical for infinite loops)
		if salt > 100000 {
			return "", errors.New("failed to generate unique key after many attempts")
		}
	}
}

// Resolve is thread-safe.
func (s *URLShortener) Resolve(key string) string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.Store[key]
}

// GenerateKey creates a 7-char Base62 key from SHA256(url + salt).
func GenerateKey(input string, salt int) string {
	h := sha256.New()
	h.Write([]byte(input))
	
	// If salt > 0, mix it into the hash
	if salt > 0 {
		b := make([]byte, 8)
		binary.LittleEndian.PutUint64(b, uint64(salt))
		h.Write(b)
	}
	
	sum := h.Sum(nil)
	// Use first 8 bytes as a uint64 seed
	val := binary.BigEndian.Uint64(sum[:8])

	// Modulo 62^7 to ensure it fits in 7 chars
	// 62^7 = 3521614606208
	limit := uint64(math.Pow(62, float64(keyLength)))
	val = val % limit

	// Base62 Encoding
	b := make([]byte, keyLength)
	for i := 0; i < keyLength; i++ {
		rem := val % 62
		val /= 62
		b[keyLength-1-i] = charset[rem]
	}
	return string(b)
}

func main() {
    // Empty main function to allow simple execution if needed, 
    // though this is primarily a library for the task.
}
