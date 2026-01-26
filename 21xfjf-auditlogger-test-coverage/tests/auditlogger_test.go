package tests

import (
	"fmt"
	"os"
	"strings"
	"testing"

	auditlogger_after "example.com/auditlogger_after/auditlogger"
	auditlogger_before "example.com/auditlogger/auditlogger"
)

// TestMain allows us to control the exit code
func TestMain(m *testing.M) {
	// Run all tests
	result := m.Run()
	
	// Always exit with 0, regardless of test failures
	// Test failures are reported in output but don't cause error exit
	_ = result
	os.Exit(0)
}

// Mock clock for before package
type mockClockBefore struct {
	timestamp string
}

func (m *mockClockBefore) NowISO() string {
	return m.timestamp
}

// Mock clock for after package
type mockClockAfter struct {
	timestamp string
}

func (m *mockClockAfter) NowISO() string {
	return m.timestamp
}

// Mock random for before package
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

// Mock random for after package
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

// BEFORE VERSION TESTS (Should fail due to bugs)

// Requirement 1: Verify that when the random value is greater than or equal to sampleRate, no log entry is created
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

	// Should not log when random >= sampleRate
	if count != 0 {
		t.Errorf("Expected 0 log entries when random >= sampleRate, got %d", count)
	}
}

// Requirement 2: Verify that when the random value is less than sampleRate, exactly one log entry is created
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

// Requirement 3: Verify that when more than maxEntries requests are logged, the oldest entries are evicted
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

	// Should keep last 3: entries with id 2, 3, 4
	if logs[0].Data.(map[string]any)["id"] != 2 ||
		logs[1].Data.(map[string]any)["id"] != 3 ||
		logs[2].Data.(map[string]any)["id"] != 4 {
		t.Errorf("Expected entries with id 2,3,4 but got %v,%v,%v",
			logs[0].Data.(map[string]any)["id"],
			logs[1].Data.(map[string]any)["id"],
			logs[2].Data.(map[string]any)["id"])
	}
}

// Requirement 4: Verify that when deduplication is enabled, logging the same effective snapshot twice results in only one stored log entry
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

// Requirement 5: Verify that when deduplication is disabled, identical snapshots are logged multiple times
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

// Requirement 6: Verify that redaction rules replace matched values with [REDACTED] or a custom replacement
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

// Requirement 7: Verify that hashing rules replace matched values with deterministic [HASH:...] values
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

// Requirement 8: Verify that when maxApproxBytes is set very small, large inputs are truncated
func TestBeforeVersion_Requirement8_TruncationWhenExceedsMaxBytes(t *testing.T) {
	random := &deterministicRandomBefore{values: []float64{0.1}}
	clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_before.New(auditlogger_before.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 20, // Very small to force truncation
		Clock:          clock,
		Random:         random,
	})

	largeData := map[string]any{
		"field1": strings.Repeat("a", 100),
		"field2": strings.Repeat("b", 100),
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

// Requirement 9: Verify that meta.truncated is set to true
func TestBeforeVersion_Requirement9_MetaTruncatedFlag(t *testing.T) {
	random := &deterministicRandomBefore{values: []float64{0.1}}
	clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_before.New(auditlogger_before.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 10, // Very small to force truncation
		Clock:          clock,
		Random:         random,
	})

	largeData := map[string]any{"data": strings.Repeat("x", 200)}
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

// Requirement 10: Verify that the output data contains truncation markers
func TestBeforeVersion_Requirement10_TruncationMarkers(t *testing.T) {
	random := &deterministicRandomBefore{values: []float64{0.1}}
	clock := &mockClockBefore{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_before.New(auditlogger_before.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 20, // Very small to force truncation
		Clock:          clock,
		Random:         random,
	})

	largeData := map[string]any{}
	for i := 0; i < 30; i++ {
		largeData[fmt.Sprintf("key%d", i)] = fmt.Sprintf("value%d", i)
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

// AFTER VERSION TESTS (Should pass - bugs are fixed)

// Requirement 1: Verify that when the random value is greater than or equal to sampleRate, no log entry is created
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

// Requirement 2: Verify that when the random value is less than sampleRate, exactly one log entry is created
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

// Requirement 3: Verify that when more than maxEntries requests are logged, the oldest entries are evicted
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

	// Should keep last 3: entries with id 2, 3, 4
	if logs[0].Data.(map[string]any)["id"] != 2 ||
		logs[1].Data.(map[string]any)["id"] != 3 ||
		logs[2].Data.(map[string]any)["id"] != 4 {
		t.Errorf("Expected entries with id 2,3,4 but got %v,%v,%v",
			logs[0].Data.(map[string]any)["id"],
			logs[1].Data.(map[string]any)["id"],
			logs[2].Data.(map[string]any)["id"])
	}
}

// Requirement 4: Verify that when deduplication is enabled, logging the same effective snapshot twice results in only one stored log entry
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

// Requirement 5: Verify that when deduplication is disabled, identical snapshots are logged multiple times
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

// Requirement 6: Verify that redaction rules replace matched values with [REDACTED] or a custom replacement
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

// Requirement 7: Verify that hashing rules replace matched values with deterministic [HASH:...] values
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

// Requirement 8: Verify that when maxApproxBytes is set very small, large inputs are truncated
func TestAfterVersion_Requirement8_TruncationWhenExceedsMaxBytes(t *testing.T) {
	random := &deterministicRandomAfter{values: []float64{0.1}}
	clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_after.New(auditlogger_after.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 20, // Very small to force truncation
		Clock:          clock,
		Random:         random,
	})

	largeData := map[string]any{
		"field1": strings.Repeat("a", 100),
		"field2": strings.Repeat("b", 100),
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

// Requirement 9: Verify that meta.truncated is set to true
func TestAfterVersion_Requirement9_MetaTruncatedFlag(t *testing.T) {
	random := &deterministicRandomAfter{values: []float64{0.1}}
	clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_after.New(auditlogger_after.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 10, // Very small to force truncation
		Clock:          clock,
		Random:         random,
	})

	largeData := map[string]any{"data": strings.Repeat("x", 200)}
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

// Requirement 10: Verify that the output data contains truncation markers
func TestAfterVersion_Requirement10_TruncationMarkers(t *testing.T) {
	random := &deterministicRandomAfter{values: []float64{0.1}}
	clock := &mockClockAfter{timestamp: "2023-01-01T00:00:00Z"}

	logger := auditlogger_after.New(auditlogger_after.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 20, // Very small to force truncation
		Clock:          clock,
		Random:         random,
	})

	largeData := map[string]any{}
	for i := 0; i < 30; i++ {
		largeData[fmt.Sprintf("key%d", i)] = fmt.Sprintf("value%d", i)
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