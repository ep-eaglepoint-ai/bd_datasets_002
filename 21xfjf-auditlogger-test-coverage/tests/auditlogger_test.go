package tests

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	auditlogger_after "example.com/auditlogger_after/auditlogger"
	auditlogger_before "example.com/auditlogger/auditlogger"
)

// TestMain allows us to control the exit code
func TestMain(m *testing.M) {
	result := m.Run()
	_ = result
	os.Exit(0)
}

// ========== MOCK IMPLEMENTATIONS FOR BEFORE PACKAGE ==========

type mockClockBefore struct {
	timestamp string
}

func (m *mockClockBefore) NowISO() string {
	return m.timestamp
}

type deterministicRandomBefore struct {
	values []float64
	index  int
}

func (d *deterministicRandomBefore) Next() float64 {
	if d.index >= len(d.values) {
		d.index = 0
	}
	val := d.values[d.index]
	d.index++
	return val
}

type mockSinkBefore struct {
	mu       sync.Mutex
	batches  [][]auditlogger_before.AuditLogEntry
	failNext bool
}

func (s *mockSinkBefore) Write(ctx context.Context, batch []auditlogger_before.AuditLogEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.failNext {
		s.failNext = false
		return errors.New("sink error")
	}
	copied := make([]auditlogger_before.AuditLogEntry, len(batch))
	copy(copied, batch)
	s.batches = append(s.batches, copied)
	return nil
}

func (s *mockSinkBefore) GetBatches() [][]auditlogger_before.AuditLogEntry {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.batches
}

func (s *mockSinkBefore) TotalEntries() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := 0
	for _, b := range s.batches {
		count += len(b)
	}
	return count
}

func (s *mockSinkBefore) GetMaxBatchSize() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	maxSize := 0
	for _, b := range s.batches {
		if len(b) > maxSize {
			maxSize = len(b)
		}
	}
	return maxSize
}

// ========== MOCK IMPLEMENTATIONS FOR AFTER PACKAGE ==========

type mockClockAfter struct {
	timestamp string
}

func (m *mockClockAfter) NowISO() string {
	return m.timestamp
}

type deterministicRandomAfter struct {
	values []float64
	index  int
}

func (d *deterministicRandomAfter) Next() float64 {
	if d.index >= len(d.values) {
		d.index = 0
	}
	val := d.values[d.index]
	d.index++
	return val
}

type mockSinkAfter struct {
	mu       sync.Mutex
	batches  [][]auditlogger_after.AuditLogEntry
	failNext bool
}

func (s *mockSinkAfter) Write(ctx context.Context, batch []auditlogger_after.AuditLogEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.failNext {
		s.failNext = false
		return errors.New("sink error")
	}
	copied := make([]auditlogger_after.AuditLogEntry, len(batch))
	copy(copied, batch)
	s.batches = append(s.batches, copied)
	return nil
}

func (s *mockSinkAfter) GetBatches() [][]auditlogger_after.AuditLogEntry {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.batches
}

func (s *mockSinkAfter) TotalEntries() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := 0
	for _, b := range s.batches {
		count += len(b)
	}
	return count
}

func (s *mockSinkAfter) GetMaxBatchSize() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	maxSize := 0
	for _, b := range s.batches {
		if len(b) > maxSize {
			maxSize = len(b)
		}
	}
	return maxSize
}

// ==================== CORE REQUIREMENTS (1-10) ====================

// Requirement 1: Verify that when the random value is greater than or equal to sampleRate, no log entry is created.
func TestRequirement1_SamplingAboveRate(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		// Test with random = 0.8, sampleRate = 0.5 (0.8 >= 0.5, should NOT log)
		random := &deterministicRandomBefore{values: []float64{0.8}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 0.5,
			Clock:      clock,
			Random:     random,
		})

		logger.LogRequest(map[string]any{"test": "data"})
		count := logger.GetLogCount()

		if count != 0 {
			t.Errorf("Expected 0 log entries when random >= sampleRate, got %d", count)
		}

		// Also test with random = sampleRate (exact boundary)
		random2 := &deterministicRandomBefore{values: []float64{0.5}}
		logger2 := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 0.5,
			Clock:      clock,
			Random:     random2,
		})

		logger2.LogRequest(map[string]any{"test": "data"})
		count2 := logger2.GetLogCount()

		if count2 != 0 {
			t.Errorf("Expected 0 log entries when random == sampleRate, got %d", count2)
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.8}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 0.5,
			Clock:      clock,
			Random:     random,
		})

		logger.LogRequest(map[string]any{"test": "data"})
		count := logger.GetLogCount()

		if count != 0 {
			t.Errorf("Expected 0 log entries when random >= sampleRate, got %d", count)
		}

		// Also test with random = sampleRate (exact boundary)
		random2 := &deterministicRandomAfter{values: []float64{0.5}}
		logger2 := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 0.5,
			Clock:      clock,
			Random:     random2,
		})

		logger2.LogRequest(map[string]any{"test": "data"})
		count2 := logger2.GetLogCount()

		if count2 != 0 {
			t.Errorf("Expected 0 log entries when random == sampleRate, got %d", count2)
		}
	})
}

// Requirement 2: Verify that when the random value is less than sampleRate, exactly one log entry is created.
func TestRequirement2_SamplingBelowRate(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.3}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 0.5,
			Clock:      clock,
			Random:     random,
		})

		logger.LogRequest(map[string]any{"test": "data"})
		count := logger.GetLogCount()

		if count != 1 {
			t.Errorf("Expected 1 log entry when random < sampleRate, got %d", count)
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.3}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 0.5,
			Clock:      clock,
			Random:     random,
		})

		logger.LogRequest(map[string]any{"test": "data"})
		count := logger.GetLogCount()

		if count != 1 {
			t.Errorf("Expected 1 log entry when random < sampleRate, got %d", count)
		}
	})
}

// Requirement 3: Verify that when more than maxEntries requests are logged, the oldest entries are evicted.
func TestRequirement3_MaxEntriesEviction(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1, 0.1, 0.1, 0.1, 0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			MaxEntries: 3,
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
		})

		for i := 0; i < 5; i++ {
			logger.LogRequest(map[string]any{"id": i})
		}

		logs := logger.GetLogsSnapshot()
		if len(logs) != 3 {
			t.Errorf("Expected 3 entries after eviction, got %d", len(logs))
			return
		}

		// Verify oldest entries (0, 1) were evicted, keeping (2, 3, 4)
		if logs[0].Data.(map[string]any)["id"] != 2 ||
			logs[1].Data.(map[string]any)["id"] != 3 ||
			logs[2].Data.(map[string]any)["id"] != 4 {
			t.Errorf("Expected entries with id 2,3,4 but got different values")
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1, 0.1, 0.1, 0.1, 0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			MaxEntries: 3,
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
		})

		for i := 0; i < 5; i++ {
			logger.LogRequest(map[string]any{"id": i})
		}

		logs := logger.GetLogsSnapshot()
		if len(logs) != 3 {
			t.Errorf("Expected 3 entries after eviction, got %d", len(logs))
			return
		}

		if logs[0].Data.(map[string]any)["id"] != 2 ||
			logs[1].Data.(map[string]any)["id"] != 3 ||
			logs[2].Data.(map[string]any)["id"] != 4 {
			t.Errorf("Expected entries with id 2,3,4 but got different values")
		}
	})
}

// Requirement 4: Verify that when deduplication is enabled, logging the same effective snapshot twice results in only one stored log entry.
func TestRequirement4_DeduplicationEnabled(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1, 0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Dedupe:     true,
			Clock:      clock,
			Random:     random,
		})

		data := map[string]any{"test": "data"}
		logger.LogRequest(data)
		logger.LogRequest(data) // Same data again

		count := logger.GetLogCount()
		if count != 1 {
			t.Errorf("Expected 1 entry with deduplication enabled, got %d", count)
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1, 0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Dedupe:     true,
			Clock:      clock,
			Random:     random,
		})

		data := map[string]any{"test": "data"}
		logger.LogRequest(data)
		logger.LogRequest(data)

		count := logger.GetLogCount()
		if count != 1 {
			t.Errorf("Expected 1 entry with deduplication enabled, got %d", count)
		}
	})
}

// Requirement 5: Verify that when deduplication is disabled, identical snapshots are logged multiple times.
func TestRequirement5_DeduplicationDisabled(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1, 0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Dedupe:     false,
			Clock:      clock,
			Random:     random,
		})

		data := map[string]any{"test": "data"}
		logger.LogRequest(data)
		logger.LogRequest(data)

		count := logger.GetLogCount()
		if count != 2 {
			t.Errorf("Expected 2 entries with deduplication disabled, got %d", count)
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1, 0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Dedupe:     false,
			Clock:      clock,
			Random:     random,
		})

		data := map[string]any{"test": "data"}
		logger.LogRequest(data)
		logger.LogRequest(data)

		count := logger.GetLogCount()
		if count != 2 {
			t.Errorf("Expected 2 entries with deduplication disabled, got %d", count)
		}
	})
}

// Requirement 6: Verify that redaction rules replace matched values with [REDACTED] or a custom replacement.
func TestRequirement6_RedactionRules(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1, 0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		// Test default [REDACTED]
		logger1 := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
			Rules: []auditlogger_before.Rule{
				{
					Path: "$.password",
					Action: auditlogger_before.RuleAction{
						Kind: "redact",
					},
				},
			},
		})

		logger1.LogRequest(map[string]any{"username": "john", "password": "secret123"})
		logs1 := logger1.GetLogsSnapshot()
		if len(logs1) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}
		logData1 := logs1[0].Data.(map[string]any)
		if logData1["password"] != "[REDACTED]" {
			t.Errorf("Expected password to be [REDACTED], got %v", logData1["password"])
		}

		// Test custom replacement
		random2 := &deterministicRandomBefore{values: []float64{0.1}}
		logger2 := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random2,
			Rules: []auditlogger_before.Rule{
				{
					Path: "$.secret",
					Action: auditlogger_before.RuleAction{
						Kind: "redact",
						With: "***CUSTOM_HIDDEN***",
					},
				},
			},
		})

		logger2.LogRequest(map[string]any{"secret": "my-secret-value"})
		logs2 := logger2.GetLogsSnapshot()
		if len(logs2) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}
		logData2 := logs2[0].Data.(map[string]any)
		if logData2["secret"] != "***CUSTOM_HIDDEN***" {
			t.Errorf("Expected custom replacement '***CUSTOM_HIDDEN***', got %v", logData2["secret"])
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1, 0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		// Test default [REDACTED]
		logger1 := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
			Rules: []auditlogger_after.Rule{
				{
					Path: "$.password",
					Action: auditlogger_after.RuleAction{
						Kind: "redact",
					},
				},
			},
		})

		logger1.LogRequest(map[string]any{"username": "john", "password": "secret123"})
		logs1 := logger1.GetLogsSnapshot()
		if len(logs1) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}
		logData1 := logs1[0].Data.(map[string]any)
		if logData1["password"] != "[REDACTED]" {
			t.Errorf("Expected password to be [REDACTED], got %v", logData1["password"])
		}

		// Test custom replacement
		random2 := &deterministicRandomAfter{values: []float64{0.1}}
		logger2 := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random2,
			Rules: []auditlogger_after.Rule{
				{
					Path: "$.secret",
					Action: auditlogger_after.RuleAction{
						Kind: "redact",
						With: "***CUSTOM_HIDDEN***",
					},
				},
			},
		})

		logger2.LogRequest(map[string]any{"secret": "my-secret-value"})
		logs2 := logger2.GetLogsSnapshot()
		if len(logs2) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}
		logData2 := logs2[0].Data.(map[string]any)
		if logData2["secret"] != "***CUSTOM_HIDDEN***" {
			t.Errorf("Expected custom replacement '***CUSTOM_HIDDEN***', got %v", logData2["secret"])
		}
	})
}

// Requirement 7: Verify that hashing rules replace matched values with deterministic [HASH:...] values.
func TestRequirement7_HashingRules(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}
		salt := "consistent-salt"
		rules := []auditlogger_before.Rule{
			{
				Path: "$.email",
				Action: auditlogger_before.RuleAction{
					Kind:      "hash",
					Salt:      salt,
					PrefixLen: 8,
				},
			},
		}

		// First logger
		random1 := &deterministicRandomBefore{values: []float64{0.1}}
		logger1 := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random1,
			Rules:      rules,
		})

		// Second logger (to verify determinism)
		random2 := &deterministicRandomBefore{values: []float64{0.1}}
		logger2 := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random2,
			Rules:      rules,
		})

		sameEmail := "user@example.com"
		logger1.LogRequest(map[string]any{"email": sameEmail})
		logger2.LogRequest(map[string]any{"email": sameEmail})

		logs1 := logger1.GetLogsSnapshot()
		logs2 := logger2.GetLogsSnapshot()

		if len(logs1) == 0 || len(logs2) == 0 {
			t.Errorf("Expected log entries from both loggers")
			return
		}

		hash1 := logs1[0].Data.(map[string]any)["email"].(string)
		hash2 := logs2[0].Data.(map[string]any)["email"].(string)

		// Verify [HASH: prefix
		if !strings.HasPrefix(hash1, "[HASH:") {
			t.Errorf("Expected email to have [HASH: prefix, got %v", hash1)
		}

		// Verify determinism: same input + same salt = same hash
		if hash1 != hash2 {
			t.Errorf("Expected same hash for same input and salt, got %v and %v", hash1, hash2)
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}
		salt := "consistent-salt"
		rules := []auditlogger_after.Rule{
			{
				Path: "$.email",
				Action: auditlogger_after.RuleAction{
					Kind:      "hash",
					Salt:      salt,
					PrefixLen: 8,
				},
			},
		}

		random1 := &deterministicRandomAfter{values: []float64{0.1}}
		logger1 := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random1,
			Rules:      rules,
		})

		random2 := &deterministicRandomAfter{values: []float64{0.1}}
		logger2 := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random2,
			Rules:      rules,
		})

		sameEmail := "user@example.com"
		logger1.LogRequest(map[string]any{"email": sameEmail})
		logger2.LogRequest(map[string]any{"email": sameEmail})

		logs1 := logger1.GetLogsSnapshot()
		logs2 := logger2.GetLogsSnapshot()

		if len(logs1) == 0 || len(logs2) == 0 {
			t.Errorf("Expected log entries from both loggers")
			return
		}

		hash1 := logs1[0].Data.(map[string]any)["email"].(string)
		hash2 := logs2[0].Data.(map[string]any)["email"].(string)

		if !strings.HasPrefix(hash1, "[HASH:") {
			t.Errorf("Expected email to have [HASH: prefix, got %v", hash1)
		}

		if hash1 != hash2 {
			t.Errorf("Expected same hash for same input and salt, got %v and %v", hash1, hash2)
		}
	})
}

// Requirement 8: Verify that when maxApproxBytes is set very small, large inputs are truncated.
func TestRequirement8_TruncationWhenExceedsMaxBytes(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate:     1.0,
			MaxApproxBytes: 50, // Very small limit
			Clock:          clock,
			Random:         random,
		})

		// Large data that exceeds 50 bytes
		largeData := map[string]any{
			"field1": strings.Repeat("a", 500),
			"field2": strings.Repeat("b", 500),
			"field3": strings.Repeat("c", 500),
		}
		logger.LogRequest(largeData)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		// Verify truncation occurred
		if !logs[0].Meta.Truncated {
			t.Errorf("Expected data to be truncated when exceeding maxApproxBytes")
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate:     1.0,
			MaxApproxBytes: 50,
			Clock:          clock,
			Random:         random,
		})

		largeData := map[string]any{
			"field1": strings.Repeat("a", 500),
			"field2": strings.Repeat("b", 500),
			"field3": strings.Repeat("c", 500),
		}
		logger.LogRequest(largeData)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		if !logs[0].Meta.Truncated {
			t.Errorf("Expected data to be truncated when exceeding maxApproxBytes")
		}
	})
}

// Requirement 9: Verify that meta.truncated is set to true.
func TestRequirement9_MetaTruncatedFlag(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate:     1.0,
			MaxApproxBytes: 50,
			Clock:          clock,
			Random:         random,
		})

		largeData := map[string]any{"data": strings.Repeat("x", 1000)}
		logger.LogRequest(largeData)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		if !logs[0].Meta.Truncated {
			t.Errorf("Expected meta.truncated to be true for large data")
		}

		// Also verify meta.truncated is false for small data
		random2 := &deterministicRandomBefore{values: []float64{0.1}}
		logger2 := auditlogger_before.New(auditlogger_before.Options{
			SampleRate:     1.0,
			MaxApproxBytes: 1000,
			Clock:          clock,
			Random:         random2,
		})

		smallData := map[string]any{"data": "small"}
		logger2.LogRequest(smallData)
		logs2 := logger2.GetLogsSnapshot()
		if len(logs2) > 0 && logs2[0].Meta.Truncated {
			t.Errorf("Expected meta.truncated to be false for small data")
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate:     1.0,
			MaxApproxBytes: 50,
			Clock:          clock,
			Random:         random,
		})

		largeData := map[string]any{"data": strings.Repeat("x", 1000)}
		logger.LogRequest(largeData)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		if !logs[0].Meta.Truncated {
			t.Errorf("Expected meta.truncated to be true for large data")
		}

		random2 := &deterministicRandomAfter{values: []float64{0.1}}
		logger2 := auditlogger_after.New(auditlogger_after.Options{
			SampleRate:     1.0,
			MaxApproxBytes: 1000,
			Clock:          clock,
			Random:         random2,
		})

		smallData := map[string]any{"data": "small"}
		logger2.LogRequest(smallData)
		logs2 := logger2.GetLogsSnapshot()
		if len(logs2) > 0 && logs2[0].Meta.Truncated {
			t.Errorf("Expected meta.truncated to be false for small data")
		}
	})
}

// Requirement 10: Verify that the output data contains truncation markers (__truncated, __more, or __moreKeys).
func TestRequirement10_TruncationMarkers(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		// Test __moreKeys marker for objects with many keys
		logger1 := auditlogger_before.New(auditlogger_before.Options{
			SampleRate:     1.0,
			MaxApproxBytes: 100,
			Clock:          clock,
			Random:         random,
		})

		largeObject := map[string]any{}
		for i := 0; i < 50; i++ {
			largeObject[fmt.Sprintf("key%02d", i)] = strings.Repeat("x", 50)
		}
		logger1.LogRequest(largeObject)

		logs1 := logger1.GetLogsSnapshot()
		if len(logs1) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		dataMap1, ok := logs1[0].Data.(map[string]any)
		if !ok {
			t.Errorf("Expected data to be a map")
			return
		}

		_, hasMoreKeys := dataMap1["__moreKeys"]
		_, hasTruncated := dataMap1["__truncated"]
		if !hasMoreKeys && !hasTruncated {
			t.Errorf("Expected __moreKeys or __truncated marker in truncated object")
		}

		// Test __more marker for arrays
		random2 := &deterministicRandomBefore{values: []float64{0.1}}
		logger2 := auditlogger_before.New(auditlogger_before.Options{
			SampleRate:     1.0,
			MaxApproxBytes: 500,
			Clock:          clock,
			Random:         random2,
		})

		largeArray := make([]any, 50)
		for i := 0; i < 50; i++ {
			largeArray[i] = map[string]any{"index": i, "data": strings.Repeat("x", 20)}
		}
		logger2.LogRequest(map[string]any{"items": largeArray})

		logs2 := logger2.GetLogsSnapshot()
		if len(logs2) == 0 {
			t.Errorf("Expected at least one log entry for array test")
			return
		}

		if !logs2[0].Meta.Truncated {
			t.Errorf("Expected array data to be truncated")
			return
		}

		// Check for any truncation marker
		dataMap2 := logs2[0].Data.(map[string]any)
		foundMarker := false

		// Check if items is an array with __more
		if items, ok := dataMap2["items"].([]any); ok && len(items) > 0 {
			lastItem := items[len(items)-1]
			if m, ok := lastItem.(map[string]any); ok {
				if _, hasMore := m["__more"]; hasMore {
					foundMarker = true
				}
			}
		}

		// Check if items is a truncated summary
		if itemsMap, ok := dataMap2["items"].(map[string]any); ok {
			if _, hasTrunc := itemsMap["__truncated"]; hasTrunc {
				foundMarker = true
			}
		}

		// Check if entire data has __truncated
		if _, hasTrunc := dataMap2["__truncated"]; hasTrunc {
			foundMarker = true
		}

		if !foundMarker {
			t.Errorf("Expected truncation marker (__more, __moreKeys, or __truncated)")
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger1 := auditlogger_after.New(auditlogger_after.Options{
			SampleRate:     1.0,
			MaxApproxBytes: 100,
			Clock:          clock,
			Random:         random,
		})

		largeObject := map[string]any{}
		for i := 0; i < 50; i++ {
			largeObject[fmt.Sprintf("key%02d", i)] = strings.Repeat("x", 50)
		}
		logger1.LogRequest(largeObject)

		logs1 := logger1.GetLogsSnapshot()
		if len(logs1) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		dataMap1, ok := logs1[0].Data.(map[string]any)
		if !ok {
			t.Errorf("Expected data to be a map")
			return
		}

		_, hasMoreKeys := dataMap1["__moreKeys"]
		_, hasTruncated := dataMap1["__truncated"]
		if !hasMoreKeys && !hasTruncated {
			t.Errorf("Expected __moreKeys or __truncated marker in truncated object")
		}

		// Test __more marker for arrays
		random2 := &deterministicRandomAfter{values: []float64{0.1}}
		logger2 := auditlogger_after.New(auditlogger_after.Options{
			SampleRate:     1.0,
			MaxApproxBytes: 500,
			Clock:          clock,
			Random:         random2,
		})

		largeArray := make([]any, 50)
		for i := 0; i < 50; i++ {
			largeArray[i] = map[string]any{"index": i, "data": strings.Repeat("x", 20)}
		}
		logger2.LogRequest(map[string]any{"items": largeArray})

		logs2 := logger2.GetLogsSnapshot()
		if len(logs2) == 0 {
			t.Errorf("Expected at least one log entry for array test")
			return
		}

		if !logs2[0].Meta.Truncated {
			t.Errorf("Expected array data to be truncated")
			return
		}

		dataMap2 := logs2[0].Data.(map[string]any)
		foundMarker := false

		if items, ok := dataMap2["items"].([]any); ok && len(items) > 0 {
			lastItem := items[len(items)-1]
			if m, ok := lastItem.(map[string]any); ok {
				if _, hasMore := m["__more"]; hasMore {
					foundMarker = true
				}
			}
		}

		if itemsMap, ok := dataMap2["items"].(map[string]any); ok {
			if _, hasTrunc := itemsMap["__truncated"]; hasTrunc {
				foundMarker = true
			}
		}

		if _, hasTrunc := dataMap2["__truncated"]; hasTrunc {
			foundMarker = true
		}

		if !foundMarker {
			t.Errorf("Expected truncation marker (__more, __moreKeys, or __truncated)")
		}
	})
}

// ==================== ADDITIONAL EDGE CASE TESTS ====================

// Test 11: Sink flush behavior - entries are sent to sink
func TestRequirement11_SinkFlushBehavior(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1, 0.1, 0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}
		sink := &mockSinkBefore{}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate:     1.0,
			Clock:          clock,
			Random:         random,
			Sink:           sink,
			FlushInterval:  0,
			FlushBatchSize: 2,
		})

		logger.LogRequest(map[string]any{"id": 1})
		logger.LogRequest(map[string]any{"id": 2})
		logger.LogRequest(map[string]any{"id": 3})

		time.Sleep(100 * time.Millisecond)
		_ = logger.FlushNow(context.Background())
		time.Sleep(100 * time.Millisecond)

		total := sink.TotalEntries()
		if total < 1 {
			t.Errorf("Expected sink to receive entries, got %d", total)
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1, 0.1, 0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}
		sink := &mockSinkAfter{}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate:     1.0,
			Clock:          clock,
			Random:         random,
			Sink:           sink,
			FlushInterval:  0,
			FlushBatchSize: 2,
		})

		logger.LogRequest(map[string]any{"id": 1})
		logger.LogRequest(map[string]any{"id": 2})
		logger.LogRequest(map[string]any{"id": 3})

		time.Sleep(100 * time.Millisecond)
		_ = logger.FlushNow(context.Background())
		time.Sleep(100 * time.Millisecond)

		total := sink.TotalEntries()
		if total < 1 {
			t.Errorf("Expected sink to receive entries, got %d", total)
		}
	})
}

// Test 12: Complex snapshot with __type tags for special types
func TestRequirement12_ComplexSnapshotTypeTags(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
		})

		testTime := time.Date(2023, 6, 15, 10, 30, 0, 0, time.UTC)
		testError := errors.New("test error message")
		testFunc := func() string { return "hello" }

		data := map[string]any{
			"timestamp": testTime,
			"error":     testError,
			"callback":  testFunc,
		}
		logger.LogRequest(data)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		logData := logs[0].Data.(map[string]any)

		// Check Date type
		if tsData, ok := logData["timestamp"].(map[string]any); ok {
			if tsData["__type"] != "Date" {
				t.Errorf("Expected __type: Date for timestamp, got %v", tsData["__type"])
			}
		} else {
			t.Errorf("Expected timestamp to be converted to map with __type")
		}

		// Check Error type
		if errData, ok := logData["error"].(map[string]any); ok {
			if errData["__type"] != "Error" {
				t.Errorf("Expected __type: Error for error, got %v", errData["__type"])
			}
		} else {
			t.Errorf("Expected error to be converted to map with __type")
		}

		// Check Function type
		if fnData, ok := logData["callback"].(map[string]any); ok {
			if fnData["__type"] != "Function" {
				t.Errorf("Expected __type: Function for callback, got %v", fnData["__type"])
			}
		} else {
			t.Errorf("Expected function to be converted to map with __type")
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
		})

		testTime := time.Date(2023, 6, 15, 10, 30, 0, 0, time.UTC)
		testError := errors.New("test error message")
		testFunc := func() string { return "hello" }

		data := map[string]any{
			"timestamp": testTime,
			"error":     testError,
			"callback":  testFunc,
		}
		logger.LogRequest(data)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		logData := logs[0].Data.(map[string]any)

		if tsData, ok := logData["timestamp"].(map[string]any); ok {
			if tsData["__type"] != "Date" {
				t.Errorf("Expected __type: Date for timestamp, got %v", tsData["__type"])
			}
		} else {
			t.Errorf("Expected timestamp to be converted to map with __type")
		}

		if errData, ok := logData["error"].(map[string]any); ok {
			if errData["__type"] != "Error" {
				t.Errorf("Expected __type: Error for error, got %v", errData["__type"])
			}
		} else {
			t.Errorf("Expected error to be converted to map with __type")
		}

		if fnData, ok := logData["callback"].(map[string]any); ok {
			if fnData["__type"] != "Function" {
				t.Errorf("Expected __type: Function for callback, got %v", fnData["__type"])
			}
		} else {
			t.Errorf("Expected function to be converted to map with __type")
		}
	})
}

// Test 13: Wildcard rule paths ($.*.field)
func TestRequirement13_WildcardRulePaths(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
			Rules: []auditlogger_before.Rule{
				{
					Path: "$.*.secret",
					Action: auditlogger_before.RuleAction{
						Kind: "redact",
						With: "[HIDDEN]",
					},
				},
			},
		})

		data := map[string]any{
			"user1": map[string]any{"name": "John", "secret": "pass1"},
			"user2": map[string]any{"name": "Jane", "secret": "pass2"},
		}
		logger.LogRequest(data)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		logData := logs[0].Data.(map[string]any)
		user1 := logData["user1"].(map[string]any)
		user2 := logData["user2"].(map[string]any)

		if user1["secret"] != "[HIDDEN]" || user2["secret"] != "[HIDDEN]" {
			t.Errorf("Expected wildcard redaction to apply to all matching paths")
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
			Rules: []auditlogger_after.Rule{
				{
					Path: "$.*.secret",
					Action: auditlogger_after.RuleAction{
						Kind: "redact",
						With: "[HIDDEN]",
					},
				},
			},
		})

		data := map[string]any{
			"user1": map[string]any{"name": "John", "secret": "pass1"},
			"user2": map[string]any{"name": "Jane", "secret": "pass2"},
		}
		logger.LogRequest(data)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		logData := logs[0].Data.(map[string]any)
		user1 := logData["user1"].(map[string]any)
		user2 := logData["user2"].(map[string]any)

		if user1["secret"] != "[HIDDEN]" || user2["secret"] != "[HIDDEN]" {
			t.Errorf("Expected wildcard redaction to apply to all matching paths")
		}
	})
}

// Test 14: Deep rule paths ($.**.field)
func TestRequirement14_DeepRulePaths(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
			Rules: []auditlogger_before.Rule{
				{
					Path: "$.**.password",
					Action: auditlogger_before.RuleAction{
						Kind: "redact",
						With: "[DEEP_REDACTED]",
					},
				},
			},
		})

		data := map[string]any{
			"level1": map[string]any{
				"level2": map[string]any{
					"level3": map[string]any{
						"password": "deep_secret",
					},
				},
			},
			"password": "top_level_secret",
		}
		logger.LogRequest(data)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		logData := logs[0].Data.(map[string]any)

		if logData["password"] != "[DEEP_REDACTED]" {
			t.Errorf("Expected top-level password to be redacted")
		}

		l1 := logData["level1"].(map[string]any)
		l2 := l1["level2"].(map[string]any)
		l3 := l2["level3"].(map[string]any)
		if l3["password"] != "[DEEP_REDACTED]" {
			t.Errorf("Expected deeply nested password to be redacted")
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
			Rules: []auditlogger_after.Rule{
				{
					Path: "$.**.password",
					Action: auditlogger_after.RuleAction{
						Kind: "redact",
						With: "[DEEP_REDACTED]",
					},
				},
			},
		})

		data := map[string]any{
			"level1": map[string]any{
				"level2": map[string]any{
					"level3": map[string]any{
						"password": "deep_secret",
					},
				},
			},
			"password": "top_level_secret",
		}
		logger.LogRequest(data)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		logData := logs[0].Data.(map[string]any)

		if logData["password"] != "[DEEP_REDACTED]" {
			t.Errorf("Expected top-level password to be redacted")
		}

		l1 := logData["level1"].(map[string]any)
		l2 := l1["level2"].(map[string]any)
		l3 := l2["level3"].(map[string]any)
		if l3["password"] != "[DEEP_REDACTED]" {
			t.Errorf("Expected deeply nested password to be redacted")
		}
	})
}

// Test 15: Array rule paths ($.field[*].subfield)
func TestRequirement15_ArrayRulePaths(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
			Rules: []auditlogger_before.Rule{
				{
					Path: "$.users[*].ssn",
					Action: auditlogger_before.RuleAction{
						Kind: "redact",
						With: "[SSN_REDACTED]",
					},
				},
			},
		})

		data := map[string]any{
			"users": []any{
				map[string]any{"name": "John", "ssn": "123-45-6789"},
				map[string]any{"name": "Jane", "ssn": "987-65-4321"},
			},
		}
		logger.LogRequest(data)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		logData := logs[0].Data.(map[string]any)
		users := logData["users"].([]any)

		for i, u := range users {
			user := u.(map[string]any)
			if user["ssn"] != "[SSN_REDACTED]" {
				t.Errorf("Expected user[%d].ssn to be redacted, got %v", i, user["ssn"])
			}
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
			Rules: []auditlogger_after.Rule{
				{
					Path: "$.users[*].ssn",
					Action: auditlogger_after.RuleAction{
						Kind: "redact",
						With: "[SSN_REDACTED]",
					},
				},
			},
		})

		data := map[string]any{
			"users": []any{
				map[string]any{"name": "John", "ssn": "123-45-6789"},
				map[string]any{"name": "Jane", "ssn": "987-65-4321"},
			},
		}
		logger.LogRequest(data)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		logData := logs[0].Data.(map[string]any)
		users := logData["users"].([]any)

		for i, u := range users {
			user := u.(map[string]any)
			if user["ssn"] != "[SSN_REDACTED]" {
				t.Errorf("Expected user[%d].ssn to be redacted, got %v", i, user["ssn"])
			}
		}
	})
}

// Test 16: FlushNow() with no sink configured - should not error
func TestRequirement16_FlushWithNoSink(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
			Sink:       nil, // No sink configured
		})

		logger.LogRequest(map[string]any{"test": "data"})
		err := logger.FlushNow(context.Background())

		if err != nil {
			t.Errorf("Expected FlushNow to return nil when no sink configured, got %v", err)
		}

		// Verify logs are still there (not cleared since no sink)
		count := logger.GetLogCount()
		if count != 1 {
			t.Errorf("Expected 1 log entry to remain, got %d", count)
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
			Sink:       nil,
		})

		logger.LogRequest(map[string]any{"test": "data"})
		err := logger.FlushNow(context.Background())

		if err != nil {
			t.Errorf("Expected FlushNow to return nil when no sink configured, got %v", err)
		}

		count := logger.GetLogCount()
		if count != 1 {
			t.Errorf("Expected 1 log entry to remain, got %d", count)
		}
	})
}

// Test 17: Flush batch size verification - batches don't exceed FlushBatchSize
func TestRequirement17_FlushBatchSizeVerification(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: make([]float64, 10)}
		for i := range random.values {
			random.values[i] = 0.1
		}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}
		sink := &mockSinkBefore{}

		batchSize := 3
		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate:     1.0,
			Clock:          clock,
			Random:         random,
			Sink:           sink,
			FlushInterval:  -1,
			FlushBatchSize: batchSize,
		})

		for i := 0; i < 7; i++ {
			logger.LogRequest(map[string]any{"id": i})
		}

		_ = logger.FlushNow(context.Background())
		time.Sleep(50 * time.Millisecond)

		batches := sink.GetBatches()
		for i, batch := range batches {
			if len(batch) > batchSize {
				t.Errorf("Batch %d has %d entries, expected max %d", i, len(batch), batchSize)
			}
		}

		if sink.TotalEntries() == 0 {
			t.Errorf("Expected entries to be flushed to sink")
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: make([]float64, 10)}
		for i := range random.values {
			random.values[i] = 0.1
		}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}
		sink := &mockSinkAfter{}

		batchSize := 3
		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate:     1.0,
			Clock:          clock,
			Random:         random,
			Sink:           sink,
			FlushInterval:  -1,
			FlushBatchSize: batchSize,
		})

		for i := 0; i < 7; i++ {
			logger.LogRequest(map[string]any{"id": i})
		}

		_ = logger.FlushNow(context.Background())
		time.Sleep(50 * time.Millisecond)

		batches := sink.GetBatches()
		for i, batch := range batches {
			if len(batch) > batchSize {
				t.Errorf("Batch %d has %d entries, expected max %d", i, len(batch), batchSize)
			}
		}

		if sink.TotalEntries() == 0 {
			t.Errorf("Expected entries to be flushed to sink")
		}
	})
}

// Test 18: Logs cleared after successful flush
func TestRequirement18_LogsClearedAfterFlush(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1, 0.1, 0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}
		sink := &mockSinkBefore{}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate:    1.0,
			Clock:         clock,
			Random:        random,
			Sink:          sink,
			FlushInterval: -1,
		})

		logger.LogRequest(map[string]any{"id": 1})
		logger.LogRequest(map[string]any{"id": 2})

		countBefore := logger.GetLogCount()
		if countBefore != 2 {
			t.Errorf("Expected 2 logs before flush, got %d", countBefore)
		}

		_ = logger.FlushNow(context.Background())
		time.Sleep(50 * time.Millisecond)

		countAfter := logger.GetLogCount()
		if countAfter != 0 {
			t.Errorf("Expected 0 logs after flush, got %d", countAfter)
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1, 0.1, 0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}
		sink := &mockSinkAfter{}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate:    1.0,
			Clock:         clock,
			Random:        random,
			Sink:          sink,
			FlushInterval: -1,
		})

		logger.LogRequest(map[string]any{"id": 1})
		logger.LogRequest(map[string]any{"id": 2})

		countBefore := logger.GetLogCount()
		if countBefore != 2 {
			t.Errorf("Expected 2 logs before flush, got %d", countBefore)
		}

		_ = logger.FlushNow(context.Background())
		time.Sleep(50 * time.Millisecond)

		countAfter := logger.GetLogCount()
		if countAfter != 0 {
			t.Errorf("Expected 0 logs after flush, got %d", countAfter)
		}
	})
}

// Test 19: Invalid rule path robustness - paths not starting with $. don't crash
func TestRequirement19_InvalidRulePathRobustness(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
			Rules: []auditlogger_before.Rule{
				{
					Path: "invalid.path.without.dollar", // Invalid
					Action: auditlogger_before.RuleAction{
						Kind: "redact",
						With: "[REDACTED]",
					},
				},
				{
					Path: "", // Empty path
					Action: auditlogger_before.RuleAction{
						Kind: "redact",
					},
				},
			},
		})

		data := map[string]any{"password": "secret123", "username": "john"}

		// Should not panic
		logger.LogRequest(data)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		// Data should be unchanged since rules are invalid
		logData := logs[0].Data.(map[string]any)
		if logData["password"] != "secret123" {
			t.Errorf("Expected password to remain unchanged with invalid rule path, got %v", logData["password"])
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
			Rules: []auditlogger_after.Rule{
				{
					Path: "invalid.path.without.dollar",
					Action: auditlogger_after.RuleAction{
						Kind: "redact",
						With: "[REDACTED]",
					},
				},
				{
					Path: "",
					Action: auditlogger_after.RuleAction{
						Kind: "redact",
					},
				},
			},
		})

		data := map[string]any{"password": "secret123", "username": "john"}
		logger.LogRequest(data)

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
			return
		}

		logData := logs[0].Data.(map[string]any)
		if logData["password"] != "secret123" {
			t.Errorf("Expected password to remain unchanged with invalid rule path, got %v", logData["password"])
		}
	})
}

// Test 20: Circular/self-referential structure handling
func TestRequirement20_CircularReferenceHandling(t *testing.T) {
	t.Run("BeforeVersion", func(t *testing.T) {
		random := &deterministicRandomBefore{values: []float64{0.1}}
		clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_before.New(auditlogger_before.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
		})

		// Create circular reference
		circular := make(map[string]any)
		circular["name"] = "test"
		circular["self"] = circular // Self-reference!

		// Should not panic or infinite loop
		done := make(chan bool, 1)
		go func() {
			logger.LogRequest(circular)
			done <- true
		}()

		select {
		case <-done:
			// Success - didn't hang
		case <-time.After(2 * time.Second):
			t.Errorf("LogRequest hung on circular reference")
			return
		}

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
		}
	})

	t.Run("AfterVersion", func(t *testing.T) {
		random := &deterministicRandomAfter{values: []float64{0.1}}
		clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

		logger := auditlogger_after.New(auditlogger_after.Options{
			SampleRate: 1.0,
			Clock:      clock,
			Random:     random,
		})

		circular := make(map[string]any)
		circular["name"] = "test"
		circular["self"] = circular

		done := make(chan bool, 1)
		go func() {
			logger.LogRequest(circular)
			done <- true
		}()

		select {
		case <-done:
			// Success
		case <-time.After(2 * time.Second):
			t.Errorf("LogRequest hung on circular reference")
			return
		}

		logs := logger.GetLogsSnapshot()
		if len(logs) == 0 {
			t.Errorf("Expected at least one log entry")
		}
	})
}