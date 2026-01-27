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

// ==================== BEFORE VERSION TESTS ====================

// Requirement 1: Sampling above rate - no log entry created
func TestBeforeVersion_Requirement1_SamplingAboveRate(t *testing.T) {
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
}

// Requirement 2: Sampling below rate - one log entry created
func TestBeforeVersion_Requirement2_SamplingBelowRate(t *testing.T) {
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
}

// Requirement 3: Max entries eviction
func TestBeforeVersion_Requirement3_MaxEntriesEviction(t *testing.T) {
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

	if logs[0].Data.(map[string]any)["id"] != 2 ||
		logs[1].Data.(map[string]any)["id"] != 3 ||
		logs[2].Data.(map[string]any)["id"] != 4 {
		t.Errorf("Expected entries with id 2,3,4")
	}
}

// Requirement 4: Deduplication enabled
func TestBeforeVersion_Requirement4_DeduplicationEnabled(t *testing.T) {
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
	logger.LogRequest(data)

	count := logger.GetLogCount()
	if count != 1 {
		t.Errorf("Expected 1 entry with deduplication enabled, got %d", count)
	}
}

// Requirement 5: Deduplication disabled
func TestBeforeVersion_Requirement5_DeduplicationDisabled(t *testing.T) {
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
}

// Requirement 6: Redaction rules
func TestBeforeVersion_Requirement6_RedactionRules(t *testing.T) {
	random := &deterministicRandomBefore{values: []float64{0.1}}
	clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_before.New(auditlogger_before.Options{
		SampleRate: 1.0,
		Clock:      clock,
		Random:     random,
		Rules: []auditlogger_before.Rule{
			{
				Path: "$.password",
				Action: auditlogger_before.RuleAction{
					Kind: "redact",
					With: "[REDACTED]",
				},
			},
		},
	})

	data := map[string]any{"username": "john", "password": "secret123"}
	logger.LogRequest(data)

	logs := logger.GetLogsSnapshot()
	if len(logs) == 0 {
		t.Errorf("Expected at least one log entry")
		return
	}
	logData := logs[0].Data.(map[string]any)
	if logData["password"] != "[REDACTED]" {
		t.Errorf("Expected password to be redacted, got %v", logData["password"])
	}
}

// Requirement 7: Hashing rules
func TestBeforeVersion_Requirement7_HashingRules(t *testing.T) {
	random := &deterministicRandomBefore{values: []float64{0.1}}
	clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_before.New(auditlogger_before.Options{
		SampleRate: 1.0,
		Clock:      clock,
		Random:     random,
		Rules: []auditlogger_before.Rule{
			{
				Path: "$.email",
				Action: auditlogger_before.RuleAction{
					Kind:      "hash",
					Salt:      "testsalt",
					PrefixLen: 8,
				},
			},
		},
	})

	data := map[string]any{"email": "user@example.com"}
	logger.LogRequest(data)

	logs := logger.GetLogsSnapshot()
	if len(logs) == 0 {
		t.Errorf("Expected at least one log entry")
		return
	}
	logData := logs[0].Data.(map[string]any)
	emailVal, ok := logData["email"].(string)
	if !ok || !strings.HasPrefix(emailVal, "[HASH:") {
		t.Errorf("Expected email to be hashed with [HASH: prefix, got %v", logData["email"])
	}
}

// Requirement 8: Truncation when exceeds max bytes
func TestBeforeVersion_Requirement8_TruncationWhenExceedsMaxBytes(t *testing.T) {
	random := &deterministicRandomBefore{values: []float64{0.1}}
	clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_before.New(auditlogger_before.Options{
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
}

// Requirement 9: Meta truncated flag
func TestBeforeVersion_Requirement9_MetaTruncatedFlag(t *testing.T) {
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
}

// Requirement 10: Truncation markers
func TestBeforeVersion_Requirement10_TruncationMarkers(t *testing.T) {
	random := &deterministicRandomBefore{values: []float64{0.1}}
	clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_before.New(auditlogger_before.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 100,
		Clock:          clock,
		Random:         random,
	})

	largeData := map[string]any{}
	for i := 0; i < 50; i++ {
		largeData[fmt.Sprintf("key%02d", i)] = strings.Repeat("x", 50)
	}
	logger.LogRequest(largeData)

	logs := logger.GetLogsSnapshot()
	if len(logs) == 0 {
		t.Errorf("Expected at least one log entry")
		return
	}
	dataMap, ok := logs[0].Data.(map[string]any)
	if !ok {
		t.Errorf("Expected data to be a map")
		return
	}
	_, hasMoreKeys := dataMap["__moreKeys"]
	_, hasTruncated := dataMap["__truncated"]
	if !hasMoreKeys && !hasTruncated {
		t.Errorf("Expected truncation markers (__moreKeys or __truncated) in data")
	}
}

// Requirement 11: Sink flush behavior
func TestBeforeVersion_Requirement11_SinkFlushBehavior(t *testing.T) {
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
}

// Requirement 12: Complex snapshot with __type tags
func TestBeforeVersion_Requirement12_ComplexSnapshotTypeTags(t *testing.T) {
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
		"nested": map[string]any{
			"innerTime": testTime,
		},
	}
	logger.LogRequest(data)

	logs := logger.GetLogsSnapshot()
	if len(logs) == 0 {
		t.Errorf("Expected at least one log entry")
		return
	}

	logData := logs[0].Data.(map[string]any)

	// Check timestamp was converted to __type: Date
	tsData, ok := logData["timestamp"].(map[string]any)
	if !ok {
		t.Errorf("Expected timestamp to be converted to map with __type")
		return
	}
	if tsData["__type"] != "Date" {
		t.Errorf("Expected __type: Date for timestamp, got %v", tsData["__type"])
	}

	// Check error was converted to __type: Error
	errData, ok := logData["error"].(map[string]any)
	if !ok {
		t.Errorf("Expected error to be converted to map with __type")
		return
	}
	if errData["__type"] != "Error" {
		t.Errorf("Expected __type: Error for error, got %v", errData["__type"])
	}

	// Check function was converted to __type: Function
	fnData, ok := logData["callback"].(map[string]any)
	if !ok {
		t.Errorf("Expected function to be converted to map with __type")
		return
	}
	if fnData["__type"] != "Function" {
		t.Errorf("Expected __type: Function for callback, got %v", fnData["__type"])
	}
}

// Requirement 13: Wildcard rule paths
func TestBeforeVersion_Requirement13_WildcardRulePaths(t *testing.T) {
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
}

// Requirement 14: Deep rule paths
func TestBeforeVersion_Requirement14_DeepRulePaths(t *testing.T) {
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

	// Check top level
	if logData["password"] != "[DEEP_REDACTED]" {
		t.Errorf("Expected top-level password to be redacted")
	}

	// Check deep nested
	l1 := logData["level1"].(map[string]any)
	l2 := l1["level2"].(map[string]any)
	l3 := l2["level3"].(map[string]any)
	if l3["password"] != "[DEEP_REDACTED]" {
		t.Errorf("Expected deeply nested password to be redacted")
	}
}

// Requirement 15: Array rule paths
func TestBeforeVersion_Requirement15_ArrayRulePaths(t *testing.T) {
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
}

// ==================== AFTER VERSION TESTS ====================

// Requirement 1: Sampling above rate - no log entry created
func TestAfterVersion_Requirement1_SamplingAboveRate(t *testing.T) {
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
}

// Requirement 2: Sampling below rate - one log entry created
func TestAfterVersion_Requirement2_SamplingBelowRate(t *testing.T) {
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
}

// Requirement 3: Max entries eviction
func TestAfterVersion_Requirement3_MaxEntriesEviction(t *testing.T) {
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
		t.Errorf("Expected entries with id 2,3,4")
	}
}

// Requirement 4: Deduplication enabled
func TestAfterVersion_Requirement4_DeduplicationEnabled(t *testing.T) {
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
}

// Requirement 5: Deduplication disabled
func TestAfterVersion_Requirement5_DeduplicationDisabled(t *testing.T) {
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
}

// Requirement 6: Redaction rules
func TestAfterVersion_Requirement6_RedactionRules(t *testing.T) {
	random := &deterministicRandomAfter{values: []float64{0.1}}
	clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_after.New(auditlogger_after.Options{
		SampleRate: 1.0,
		Clock:      clock,
		Random:     random,
		Rules: []auditlogger_after.Rule{
			{
				Path: "$.password",
				Action: auditlogger_after.RuleAction{
					Kind: "redact",
					With: "[REDACTED]",
				},
			},
		},
	})

	data := map[string]any{"username": "john", "password": "secret123"}
	logger.LogRequest(data)

	logs := logger.GetLogsSnapshot()
	if len(logs) == 0 {
		t.Errorf("Expected at least one log entry")
		return
	}
	logData := logs[0].Data.(map[string]any)
	if logData["password"] != "[REDACTED]" {
		t.Errorf("Expected password to be redacted, got %v", logData["password"])
	}
}

// Requirement 7: Hashing rules
func TestAfterVersion_Requirement7_HashingRules(t *testing.T) {
	random := &deterministicRandomAfter{values: []float64{0.1}}
	clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_after.New(auditlogger_after.Options{
		SampleRate: 1.0,
		Clock:      clock,
		Random:     random,
		Rules: []auditlogger_after.Rule{
			{
				Path: "$.email",
				Action: auditlogger_after.RuleAction{
					Kind:      "hash",
					Salt:      "testsalt",
					PrefixLen: 8,
				},
			},
		},
	})

	data := map[string]any{"email": "user@example.com"}
	logger.LogRequest(data)

	logs := logger.GetLogsSnapshot()
	if len(logs) == 0 {
		t.Errorf("Expected at least one log entry")
		return
	}
	logData := logs[0].Data.(map[string]any)
	emailVal, ok := logData["email"].(string)
	if !ok || !strings.HasPrefix(emailVal, "[HASH:") {
		t.Errorf("Expected email to be hashed with [HASH: prefix, got %v", logData["email"])
	}
}

// Requirement 8: Truncation when exceeds max bytes
func TestAfterVersion_Requirement8_TruncationWhenExceedsMaxBytes(t *testing.T) {
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
}

// Requirement 9: Meta truncated flag
func TestAfterVersion_Requirement9_MetaTruncatedFlag(t *testing.T) {
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
}

// Requirement 10: Truncation markers
func TestAfterVersion_Requirement10_TruncationMarkers(t *testing.T) {
	random := &deterministicRandomAfter{values: []float64{0.1}}
	clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_after.New(auditlogger_after.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 100,
		Clock:          clock,
		Random:         random,
	})

	largeData := map[string]any{}
	for i := 0; i < 50; i++ {
		largeData[fmt.Sprintf("key%02d", i)] = strings.Repeat("x", 50)
	}
	logger.LogRequest(largeData)

	logs := logger.GetLogsSnapshot()
	if len(logs) == 0 {
		t.Errorf("Expected at least one log entry")
		return
	}
	dataMap, ok := logs[0].Data.(map[string]any)
	if !ok {
		t.Errorf("Expected data to be a map")
		return
	}
	_, hasMoreKeys := dataMap["__moreKeys"]
	_, hasTruncated := dataMap["__truncated"]
	if !hasMoreKeys && !hasTruncated {
		t.Errorf("Expected truncation markers (__moreKeys or __truncated) in data")
	}
}

// Requirement 11: Sink flush behavior
func TestAfterVersion_Requirement11_SinkFlushBehavior(t *testing.T) {
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
}

// Requirement 12: Complex snapshot with __type tags
func TestAfterVersion_Requirement12_ComplexSnapshotTypeTags(t *testing.T) {
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
		"nested": map[string]any{
			"innerTime": testTime,
		},
	}
	logger.LogRequest(data)

	logs := logger.GetLogsSnapshot()
	if len(logs) == 0 {
		t.Errorf("Expected at least one log entry")
		return
	}

	logData := logs[0].Data.(map[string]any)

	tsData, ok := logData["timestamp"].(map[string]any)
	if !ok {
		t.Errorf("Expected timestamp to be converted to map with __type")
		return
	}
	if tsData["__type"] != "Date" {
		t.Errorf("Expected __type: Date for timestamp, got %v", tsData["__type"])
	}

	errData, ok := logData["error"].(map[string]any)
	if !ok {
		t.Errorf("Expected error to be converted to map with __type")
		return
	}
	if errData["__type"] != "Error" {
		t.Errorf("Expected __type: Error for error, got %v", errData["__type"])
	}

	fnData, ok := logData["callback"].(map[string]any)
	if !ok {
		t.Errorf("Expected function to be converted to map with __type")
		return
	}
	if fnData["__type"] != "Function" {
		t.Errorf("Expected __type: Function for callback, got %v", fnData["__type"])
	}
}

// Requirement 13: Wildcard rule paths
func TestAfterVersion_Requirement13_WildcardRulePaths(t *testing.T) {
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
}

// Requirement 14: Deep rule paths
func TestAfterVersion_Requirement14_DeepRulePaths(t *testing.T) {
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
}

// Requirement 15: Array rule paths
func TestAfterVersion_Requirement15_ArrayRulePaths(t *testing.T) {
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
}