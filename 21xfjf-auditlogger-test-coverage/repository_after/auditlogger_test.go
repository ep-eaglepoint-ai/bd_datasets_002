package auditlogger_test

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"example.com/auditlogger/auditlogger"
)

// ==================== FAKE IMPLEMENTATIONS ====================

// FakeClock returns a fixed timestamp for deterministic testing
type FakeClock struct {
	FixedTime string
}

func (f FakeClock) NowISO() string {
	return f.FixedTime
}

// FakeRandomSource returns controlled float64 values
type FakeRandomSource struct {
	mu     sync.Mutex
	values []float64
	index  int
}

func NewFakeRandom(values ...float64) *FakeRandomSource {
	return &FakeRandomSource{values: values}
}

func (f *FakeRandomSource) Next() float64 {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.values) == 0 {
		return 0.0
	}
	val := f.values[f.index%len(f.values)]
	f.index++
	return val
}

// FakeSink captures batches passed to Write
type FakeSink struct {
	mu      sync.Mutex
	Batches [][]auditlogger.AuditLogEntry
	Err     error
}

func (f *FakeSink) Write(ctx context.Context, batch []auditlogger.AuditLogEntry) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.Err != nil {
		return f.Err
	}
	batchCopy := make([]auditlogger.AuditLogEntry, len(batch))
	copy(batchCopy, batch)
	f.Batches = append(f.Batches, batchCopy)
	return nil
}

func (f *FakeSink) GetBatches() [][]auditlogger.AuditLogEntry {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.Batches
}

func (f *FakeSink) TotalEntries() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	count := 0
	for _, b := range f.Batches {
		count += len(b)
	}
	return count
}

// ==================== REQUIREMENT 1: SAMPLING ABOVE RATE ====================

func TestSampling_RandomAboveSampleRate_NoLogCreated(t *testing.T) {
	// Requirement 1: When random >= sampleRate, no log entry is created
	tests := []struct {
		name       string
		sampleRate float64
		randomVal  float64
	}{
		{"random equals sampleRate", 0.5, 0.5},
		{"random above sampleRate", 0.5, 0.7},
		{"random at 1.0 with full sample", 1.0, 1.0},
		{"random at 0.99 with 0.5 rate", 0.5, 0.99},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := auditlogger.New(auditlogger.Options{
				SampleRate: tt.sampleRate,
				Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
				Random:     NewFakeRandom(tt.randomVal),
			})

			logger.LogRequest(map[string]any{"key": "value"})

			if count := logger.GetLogCount(); count != 0 {
				t.Errorf("Expected 0 logs when random(%f) >= sampleRate(%f), got %d",
					tt.randomVal, tt.sampleRate, count)
			}
		})
	}
}

func TestSampling_ZeroSampleRate_NoLogs(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 0.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.0),
	})

	logger.LogRequest(map[string]any{"test": "data"})

	if count := logger.GetLogCount(); count != 0 {
		t.Errorf("Expected 0 logs with sampleRate=0, got %d", count)
	}
}

// ==================== REQUIREMENT 2: SAMPLING BELOW RATE ====================

func TestSampling_RandomBelowSampleRate_OneLogCreated(t *testing.T) {
	// Requirement 2: When random < sampleRate, exactly one log entry is created
	tests := []struct {
		name       string
		sampleRate float64
		randomVal  float64
	}{
		{"random below sampleRate", 0.5, 0.3},
		{"random at 0 with any positive rate", 0.1, 0.0},
		{"random just below sampleRate", 0.5, 0.49},
		{"full sampling rate", 1.0, 0.99},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := auditlogger.New(auditlogger.Options{
				SampleRate: tt.sampleRate,
				Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
				Random:     NewFakeRandom(tt.randomVal),
			})

			logger.LogRequest(map[string]any{"key": "value"})

			if count := logger.GetLogCount(); count != 1 {
				t.Errorf("Expected 1 log when random(%f) < sampleRate(%f), got %d",
					tt.randomVal, tt.sampleRate, count)
			}
		})
	}
}

// ==================== REQUIREMENT 3: RING BUFFER EVICTION ====================

func TestRingBuffer_EvictsOldestEntries(t *testing.T) {
	// Requirement 3: When more than maxEntries logged, oldest are evicted
	maxEntries := 3
	logger := auditlogger.New(auditlogger.Options{
		MaxEntries: maxEntries,
		SampleRate: 1.0,
		Dedupe:     false,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	// Log 5 entries
	for i := 1; i <= 5; i++ {
		logger.LogRequest(map[string]any{"entry": i})
	}

	if count := logger.GetLogCount(); count != maxEntries {
		t.Errorf("Expected %d entries, got %d", maxEntries, count)
	}

	// Verify only the newest entries remain (entries 3, 4, 5)
	logs := logger.GetLogsSnapshot()
	for i, log := range logs {
		data, ok := log.Data.(map[string]any)
		if !ok {
			t.Fatalf("Expected map data, got %T", log.Data)
		}
		expectedEntry := i + 3 // entries 3, 4, 5
		if data["entry"] != expectedEntry {
			t.Errorf("Entry %d: expected entry=%d, got %v", i, expectedEntry, data["entry"])
		}
	}
}

func TestRingBuffer_MaintainsOrder(t *testing.T) {
	maxEntries := 5
	logger := auditlogger.New(auditlogger.Options{
		MaxEntries: maxEntries,
		SampleRate: 1.0,
		Dedupe:     false,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	// Log 10 entries
	for i := 1; i <= 10; i++ {
		logger.LogRequest(map[string]any{"seq": i})
	}

	logs := logger.GetLogsSnapshot()
	if len(logs) != maxEntries {
		t.Fatalf("Expected %d logs, got %d", maxEntries, len(logs))
	}

	// Check order: should be 6, 7, 8, 9, 10
	for i, log := range logs {
		data := log.Data.(map[string]any)
		expected := i + 6
		if data["seq"] != expected {
			t.Errorf("Position %d: expected seq=%d, got %v", i, expected, data["seq"])
		}
	}
}

func TestRingBuffer_ExactlyAtLimit(t *testing.T) {
	maxEntries := 5
	logger := auditlogger.New(auditlogger.Options{
		MaxEntries: maxEntries,
		SampleRate: 1.0,
		Dedupe:     false,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	// Log exactly maxEntries
	for i := 1; i <= maxEntries; i++ {
		logger.LogRequest(map[string]any{"entry": i})
	}

	if count := logger.GetLogCount(); count != maxEntries {
		t.Errorf("Expected exactly %d entries, got %d", maxEntries, count)
	}
}

// ==================== REQUIREMENT 4: DEDUPE ENABLED ====================

func TestDedupe_Enabled_DuplicatesNotStored(t *testing.T) {
	// Requirement 4: With dedupe enabled, same snapshot = single entry
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Dedupe:     true,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	sameData := map[string]any{"user": "alice", "action": "login"}

	logger.LogRequest(sameData)
	logger.LogRequest(sameData)
	logger.LogRequest(sameData)

	if count := logger.GetLogCount(); count != 1 {
		t.Errorf("Expected 1 log with dedupe enabled, got %d", count)
	}
}

func TestDedupe_DifferentDataNotDeduped(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Dedupe:     true,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	logger.LogRequest(map[string]any{"user": "alice"})
	logger.LogRequest(map[string]any{"user": "bob"})
	logger.LogRequest(map[string]any{"user": "charlie"})

	if count := logger.GetLogCount(); count != 3 {
		t.Errorf("Expected 3 different logs, got %d", count)
	}
}

// ==================== REQUIREMENT 5: DEDUPE DISABLED ====================

func TestDedupe_Disabled_DuplicatesStored(t *testing.T) {
	// Requirement 5: With dedupe disabled, identical snapshots logged multiple times
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Dedupe:     false,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	sameData := map[string]any{"user": "alice", "action": "login"}

	logger.LogRequest(sameData)
	logger.LogRequest(sameData)
	logger.LogRequest(sameData)

	if count := logger.GetLogCount(); count != 3 {
		t.Errorf("Expected 3 logs with dedupe disabled, got %d", count)
	}
}

// ==================== REQUIREMENT 6: REDACTION RULES ====================

func TestRedaction_SimplePathDefaultReplacement(t *testing.T) {
	// Requirement 6: Redaction replaces with [REDACTED]
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
		Rules: []auditlogger.Rule{
			{
				Path:   "$.user.password",
				Action: auditlogger.RuleAction{Kind: "redact"},
			},
		},
	})

	logger.LogRequest(map[string]any{
		"user": map[string]any{
			"name":     "alice",
			"password": "secret123",
		},
	})

	logs := logger.GetLogsSnapshot()
	if len(logs) != 1 {
		t.Fatalf("Expected 1 log, got %d", len(logs))
	}

	data := logs[0].Data.(map[string]any)
	user := data["user"].(map[string]any)

	if user["password"] != "[REDACTED]" {
		t.Errorf("Expected password to be [REDACTED], got %v", user["password"])
	}
	if user["name"] != "alice" {
		t.Errorf("Expected name to remain 'alice', got %v", user["name"])
	}
}

func TestRedaction_CustomReplacement(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
		Rules: []auditlogger.Rule{
			{
				Path:   "$.secret",
				Action: auditlogger.RuleAction{Kind: "redact", With: "***HIDDEN***"},
			},
		},
	})

	logger.LogRequest(map[string]any{"secret": "mysecret", "public": "visible"})

	logs := logger.GetLogsSnapshot()
	data := logs[0].Data.(map[string]any)

	if data["secret"] != "***HIDDEN***" {
		t.Errorf("Expected custom replacement '***HIDDEN***', got %v", data["secret"])
	}
}

func TestRedaction_WildcardPath(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
		Rules: []auditlogger.Rule{
			{
				Path:   "$.users.*.password",
				Action: auditlogger.RuleAction{Kind: "redact"},
			},
		},
	})

	logger.LogRequest(map[string]any{
		"users": map[string]any{
			"alice": map[string]any{"password": "pass1"},
			"bob":   map[string]any{"password": "pass2"},
		},
	})

	logs := logger.GetLogsSnapshot()
	data := logs[0].Data.(map[string]any)
	users := data["users"].(map[string]any)

	alice := users["alice"].(map[string]any)
	bob := users["bob"].(map[string]any)

	if alice["password"] != "[REDACTED]" {
		t.Errorf("Expected alice password redacted, got %v", alice["password"])
	}
	if bob["password"] != "[REDACTED]" {
		t.Errorf("Expected bob password redacted, got %v", bob["password"])
	}
}

// ==================== REQUIREMENT 7: HASHING RULES ====================

func TestHashing_DeterministicOutput(t *testing.T) {
	// Requirement 7: Hashing produces deterministic [HASH:...] values
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
		Rules: []auditlogger.Rule{
			{
				Path: "$.user.email",
				Action: auditlogger.RuleAction{
					Kind:      "hash",
					Salt:      "testsalt",
					PrefixLen: 8,
				},
			},
		},
	})

	logger.LogRequest(map[string]any{
		"user": map[string]any{"email": "test@example.com"},
	})

	// Create new logger with same config
	logger2 := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
		Rules: []auditlogger.Rule{
			{
				Path: "$.user.email",
				Action: auditlogger.RuleAction{
					Kind:      "hash",
					Salt:      "testsalt",
					PrefixLen: 8,
				},
			},
		},
	})

	logger2.LogRequest(map[string]any{
		"user": map[string]any{"email": "test@example.com"},
	})

	logs1 := logger.GetLogsSnapshot()
	logs2 := logger2.GetLogsSnapshot()

	data1 := logs1[0].Data.(map[string]any)
	data2 := logs2[0].Data.(map[string]any)

	user1 := data1["user"].(map[string]any)
	user2 := data2["user"].(map[string]any)

	hash1 := user1["email"].(string)
	hash2 := user2["email"].(string)

	if !strings.HasPrefix(hash1, "[HASH:") {
		t.Errorf("Expected hash prefix [HASH:, got %s", hash1)
	}
	if hash1 != hash2 {
		t.Errorf("Expected deterministic hashes, got %s vs %s", hash1, hash2)
	}
}

func TestHashing_DifferentSaltsDifferentHashes(t *testing.T) {
	makeLogger := func(salt string) *auditlogger.AuditLogger {
		return auditlogger.New(auditlogger.Options{
			SampleRate: 1.0,
			Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
			Random:     NewFakeRandom(0.1),
			Rules: []auditlogger.Rule{
				{
					Path:   "$.data",
					Action: auditlogger.RuleAction{Kind: "hash", Salt: salt, PrefixLen: 12},
				},
			},
		})
	}

	logger1 := makeLogger("salt1")
	logger2 := makeLogger("salt2")

	logger1.LogRequest(map[string]any{"data": "value"})
	logger2.LogRequest(map[string]any{"data": "value"})

	data1 := logger1.GetLogsSnapshot()[0].Data.(map[string]any)
	data2 := logger2.GetLogsSnapshot()[0].Data.(map[string]any)

	if data1["data"] == data2["data"] {
		t.Errorf("Expected different hashes for different salts")
	}
}

func TestHashing_HasCorrectFormat(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
		Rules: []auditlogger.Rule{
			{
				Path:   "$.token",
				Action: auditlogger.RuleAction{Kind: "hash", Salt: "salt", PrefixLen: 6},
			},
		},
	})

	logger.LogRequest(map[string]any{"token": "secret-token"})

	logs := logger.GetLogsSnapshot()
	data := logs[0].Data.(map[string]any)
	hashed := data["token"].(string)

	if !strings.HasPrefix(hashed, "[HASH:") || !strings.HasSuffix(hashed, "]") {
		t.Errorf("Expected [HASH:...] format, got %s", hashed)
	}
}

// ==================== REQUIREMENT 8: TRUNCATION ====================

func TestTruncation_LargeInputTruncated(t *testing.T) {
	// Requirement 8: Large inputs truncated with small maxApproxBytes
	logger := auditlogger.New(auditlogger.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 150,
		Clock:          FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:         NewFakeRandom(0.1),
	})

	largeData := map[string]any{
		"field1": "this is a long string value",
		"field2": "another long string here",
		"field3": "and yet another one",
		"nested": map[string]any{
			"deep1": "deeply nested value",
			"deep2": "another deep value",
		},
	}

	logger.LogRequest(largeData)

	logs := logger.GetLogsSnapshot()
	if len(logs) != 1 {
		t.Fatalf("Expected 1 log, got %d", len(logs))
	}

	// Requirement 9: meta.Truncated should be true
	if !logs[0].Meta.Truncated {
		t.Error("Expected Meta.Truncated to be true for large input with small maxApproxBytes")
	}
}

func TestTruncation_VerySmallLimit(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 50, // Very small
		Clock:          FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:         NewFakeRandom(0.1),
	})

	largeData := map[string]any{
		"level1": map[string]any{
			"level2": map[string]any{
				"level3": map[string]any{
					"data": strings.Repeat("x", 100),
				},
			},
		},
	}

	logger.LogRequest(largeData)

	logs := logger.GetLogsSnapshot()
	if !logs[0].Meta.Truncated {
		t.Error("Expected truncation with very small limit")
	}
}

// ==================== REQUIREMENT 9: META.TRUNCATED ====================

func TestTruncation_MetaTruncatedIsTrue(t *testing.T) {
	// Requirement 9: Verify meta.Truncated is set to true
	logger := auditlogger.New(auditlogger.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 100,
		Clock:          FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:         NewFakeRandom(0.1),
	})

	// Create data larger than 100 bytes
	largeData := map[string]any{
		"key1": strings.Repeat("a", 50),
		"key2": strings.Repeat("b", 50),
		"key3": strings.Repeat("c", 50),
	}

	logger.LogRequest(largeData)

	logs := logger.GetLogsSnapshot()
	if len(logs) != 1 {
		t.Fatalf("Expected 1 log, got %d", len(logs))
	}

	if !logs[0].Meta.Truncated {
		t.Error("Requirement 9 FAILED: Expected Meta.Truncated to be true")
	}
}

func TestTruncation_SmallDataNotTruncated(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 10000,
		Clock:          FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:         NewFakeRandom(0.1),
	})

	logger.LogRequest(map[string]any{"small": "data"})

	logs := logger.GetLogsSnapshot()
	if logs[0].Meta.Truncated {
		t.Error("Expected Meta.Truncated to be false for small data")
	}
}

// ==================== REQUIREMENT 10: TRUNCATION MARKERS ====================

func TestTruncation_ContainsTruncationMarkers(t *testing.T) {
	// Requirement 10: Output contains __truncated, __more, or __moreKeys
	logger := auditlogger.New(auditlogger.Options{
		SampleRate:     1.0,
		MaxApproxBytes: 128,
		Clock:          FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:         NewFakeRandom(0.1),
	})

	// Create a large nested structure
	largeData := make(map[string]any)
	for i := 0; i < 50; i++ {
		largeData[strings.Repeat("k", 10)+string(rune('a'+i%26))] = strings.Repeat("v", 50)
	}

	logger.LogRequest(largeData)

	logs := logger.GetLogsSnapshot()
	data := logs[0].Data

	found := containsTruncationMarkers(data)
	if !found {
		t.Error("Requirement 10 FAILED: Expected truncation markers (__truncated, __more, or __moreKeys) in data")
	}
}

func containsTruncationMarkers(v any) bool {
	switch val := v.(type) {
	case map[string]any:
		if _, ok := val["__truncated"]; ok {
			return true
		}
		if _, ok := val["__more"]; ok {
			return true
		}
		if _, ok := val["__moreKeys"]; ok {
			return true
		}
		for _, child := range val {
			if containsTruncationMarkers(child) {
				return true
			}
		}
	case []any:
		for _, item := range val {
			if containsTruncationMarkers(item) {
				return true
			}
		}
	}
	return false
}

// ==================== FLUSHING TESTS ====================

func TestFlush_BatchSizeRespected(t *testing.T) {
	sink := &FakeSink{}
	logger := auditlogger.New(auditlogger.Options{
		SampleRate:     1.0,
		FlushBatchSize: 3,
		FlushInterval:  -1,
		Sink:           sink,
		Clock:          FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:         NewFakeRandom(0.1),
		Dedupe:         false,
	})

	for i := 0; i < 7; i++ {
		logger.LogRequest(map[string]any{"i": i})
	}

	err := logger.FlushNow(context.Background())
	if err != nil {
		t.Fatalf("FlushNow error: %v", err)
	}

	batches := sink.GetBatches()
	if len(batches) < 2 {
		t.Errorf("Expected multiple batches, got %d", len(batches))
	}

	for _, batch := range batches {
		if len(batch) > 3 {
			t.Errorf("Batch size %d exceeds FlushBatchSize 3", len(batch))
		}
	}

	if sink.TotalEntries() != 7 {
		t.Errorf("Expected 7 total entries flushed, got %d", sink.TotalEntries())
	}
}

func TestFlush_ClearsLogsAfterSuccess(t *testing.T) {
	sink := &FakeSink{}
	logger := auditlogger.New(auditlogger.Options{
		SampleRate:    1.0,
		FlushInterval: -1,
		Sink:          sink,
		Clock:         FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:        NewFakeRandom(0.1),
		Dedupe:        false,
	})

	logger.LogRequest(map[string]any{"test": 1})
	logger.LogRequest(map[string]any{"test": 2})

	if logger.GetLogCount() != 2 {
		t.Fatalf("Expected 2 logs before flush")
	}

	err := logger.FlushNow(context.Background())
	if err != nil {
		t.Fatalf("FlushNow error: %v", err)
	}

	if logger.GetLogCount() != 0 {
		t.Errorf("Expected 0 logs after flush, got %d", logger.GetLogCount())
	}
}

func TestFlush_NoSinkNoError(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Sink:       nil,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	logger.LogRequest(map[string]any{"test": "data"})

	err := logger.FlushNow(context.Background())
	if err != nil {
		t.Errorf("Expected no error with nil sink, got %v", err)
	}
}

func TestFlush_SinkErrorReturned(t *testing.T) {
	expectedErr := errors.New("sink write failed")
	sink := &FakeSink{Err: expectedErr}

	logger := auditlogger.New(auditlogger.Options{
		SampleRate:    1.0,
		FlushInterval: -1,
		Sink:          sink,
		Clock:         FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:        NewFakeRandom(0.1),
	})

	logger.LogRequest(map[string]any{"test": 1})

	err := logger.FlushNow(context.Background())
	if err == nil {
		t.Error("Expected error from sink, got nil")
	}
}

// ==================== SNAPSHOTTING SPECIAL TYPES ====================

func TestSnapshot_TimeType(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	testTime := time.Date(2024, 6, 15, 12, 30, 0, 0, time.UTC)
	logger.LogRequest(map[string]any{"timestamp": testTime})

	logs := logger.GetLogsSnapshot()
	data := logs[0].Data.(map[string]any)
	ts := data["timestamp"].(map[string]any)

	if ts["__type"] != "Date" {
		t.Errorf("Expected __type='Date', got %v", ts["__type"])
	}
	if _, ok := ts["value"]; !ok {
		t.Error("Expected 'value' field in Date representation")
	}
}

func TestSnapshot_ErrorType(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	testErr := errors.New("test error message")
	logger.LogRequest(map[string]any{"error": testErr})

	logs := logger.GetLogsSnapshot()
	data := logs[0].Data.(map[string]any)
	errData := data["error"].(map[string]any)

	if errData["__type"] != "Error" {
		t.Errorf("Expected __type='Error', got %v", errData["__type"])
	}
	if errData["message"] != "test error message" {
		t.Errorf("Expected message='test error message', got %v", errData["message"])
	}
}

func TestSnapshot_FunctionType(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	testFunc := func(x int) int { return x * 2 }
	logger.LogRequest(map[string]any{"callback": testFunc})

	logs := logger.GetLogsSnapshot()
	data := logs[0].Data.(map[string]any)
	fn := data["callback"].(map[string]any)

	if fn["__type"] != "Function" {
		t.Errorf("Expected __type='Function', got %v", fn["__type"])
	}
}

func TestSnapshot_NestedMapsAndSlices(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	nested := map[string]any{
		"level1": map[string]any{
			"level2": map[string]any{
				"values": []any{1, 2, 3},
			},
		},
		"array": []any{
			map[string]any{"a": 1},
			map[string]any{"b": 2},
		},
	}

	logger.LogRequest(nested)

	logs := logger.GetLogsSnapshot()
	if len(logs) != 1 {
		t.Fatalf("Expected 1 log, got %d", len(logs))
	}

	data := logs[0].Data.(map[string]any)
	if data["level1"] == nil {
		t.Error("Expected level1 to exist")
	}
}

func TestSnapshot_CircularReference_NoPanic(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	circular := make(map[string]any)
	circular["self"] = circular

	defer func() {
		if r := recover(); r != nil {
			t.Errorf("Snapshot panicked on circular reference: %v", r)
		}
	}()

	logger.LogRequest(circular)

	if logger.GetLogCount() != 1 {
		t.Error("Expected log to be created even with circular reference")
	}
}

func TestSnapshot_NilSlice(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	var nilSlice []string = nil
	logger.LogRequest(map[string]any{"nilSlice": nilSlice})

	logs := logger.GetLogsSnapshot()
	data := logs[0].Data.(map[string]any)

	if data["nilSlice"] != nil {
		t.Errorf("Expected nil for nil slice, got %v", data["nilSlice"])
	}
}

func TestSnapshot_NilMap(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	var nilMap map[string]any = nil
	logger.LogRequest(map[string]any{"nilMap": nilMap})

	logs := logger.GetLogsSnapshot()
	data := logs[0].Data.(map[string]any)

	if data["nilMap"] != nil {
		t.Errorf("Expected nil for nil map, got %v", data["nilMap"])
	}
}

// ==================== ROBUSTNESS TESTS ====================

func TestRobustness_InvalidRulePath_NoCrash(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
		Rules: []auditlogger.Rule{
			{
				Path:   "invalid.path", // Doesn't start with $.
				Action: auditlogger.RuleAction{Kind: "redact"},
			},
			{
				Path:   "also_invalid",
				Action: auditlogger.RuleAction{Kind: "hash", Salt: "salt"},
			},
		},
	})

	data := map[string]any{"key": "value", "invalid": map[string]any{"path": "secret"}}

	logger.LogRequest(data)

	logs := logger.GetLogsSnapshot()
	if len(logs) != 1 {
		t.Fatalf("Expected 1 log, got %d", len(logs))
	}

	logData := logs[0].Data.(map[string]any)
	if logData["key"] != "value" {
		t.Errorf("Expected key='value', got %v", logData["key"])
	}
}

func TestRobustness_NilInput(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	logger.LogRequest(nil)

	if logger.GetLogCount() != 1 {
		t.Error("Expected log even with nil input")
	}
}

func TestRobustness_EmptyMap(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	logger.LogRequest(map[string]any{})

	if logger.GetLogCount() != 1 {
		t.Error("Expected log for empty map")
	}
}

// ==================== META FIELD TESTS ====================

func TestMeta_SampledInTrue(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	logger.LogRequest(map[string]any{"test": true})

	logs := logger.GetLogsSnapshot()
	if !logs[0].Meta.SampledIn {
		t.Error("Expected Meta.SampledIn to be true")
	}
}

func TestMeta_DedupedFalseForFirstEntry(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Dedupe:     true,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	logger.LogRequest(map[string]any{"test": true})

	logs := logger.GetLogsSnapshot()
	if logs[0].Meta.Deduped {
		t.Error("Expected Meta.Deduped to be false for first entry")
	}
}

func TestMeta_ApproxBytesPopulated(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	logger.LogRequest(map[string]any{"data": "some value"})

	logs := logger.GetLogsSnapshot()
	if logs[0].Meta.ApproxBytes <= 0 {
		t.Errorf("Expected positive ApproxBytes, got %d", logs[0].Meta.ApproxBytes)
	}
}

func TestEntry_TimestampFromClock(t *testing.T) {
	fixedTime := "2024-06-15T10:30:00Z"
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: fixedTime},
		Random:     NewFakeRandom(0.1),
	})

	logger.LogRequest(map[string]any{"test": true})

	logs := logger.GetLogsSnapshot()
	if logs[0].Timestamp != fixedTime {
		t.Errorf("Expected timestamp %s, got %s", fixedTime, logs[0].Timestamp)
	}
}

func TestEntry_IDGenerated(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	logger.LogRequest(map[string]any{"test": true})

	logs := logger.GetLogsSnapshot()
	if logs[0].ID == "" {
		t.Error("Expected non-empty ID")
	}
}

// ==================== DEEP WILDCARD TESTS ====================

func TestRules_DeepWildcard(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
		Rules: []auditlogger.Rule{
			{
				Path:   "$.**.secret",
				Action: auditlogger.RuleAction{Kind: "redact"},
			},
		},
	})

	logger.LogRequest(map[string]any{
		"level1": map[string]any{
			"secret": "hidden1",
			"level2": map[string]any{
				"secret": "hidden2",
			},
		},
		"secret": "hidden0",
	})

	logs := logger.GetLogsSnapshot()
	data := logs[0].Data.(map[string]any)

	if data["secret"] != "[REDACTED]" {
		t.Errorf("Expected top-level secret redacted, got %v", data["secret"])
	}

	level1 := data["level1"].(map[string]any)
	if level1["secret"] != "[REDACTED]" {
		t.Errorf("Expected level1 secret redacted, got %v", level1["secret"])
	}

	level2 := level1["level2"].(map[string]any)
	if level2["secret"] != "[REDACTED]" {
		t.Errorf("Expected level2 secret redacted, got %v", level2["secret"])
	}
}

// ==================== ARRAY PATH TESTS ====================

func TestRules_ArrayWildcard(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
		Rules: []auditlogger.Rule{
			{
				Path:   "$.users[*].password",
				Action: auditlogger.RuleAction{Kind: "redact"},
			},
		},
	})

	logger.LogRequest(map[string]any{
		"users": []any{
			map[string]any{"name": "alice", "password": "pass1"},
			map[string]any{"name": "bob", "password": "pass2"},
		},
	})

	logs := logger.GetLogsSnapshot()
	data := logs[0].Data.(map[string]any)
	users := data["users"].([]any)

	for i, u := range users {
		user := u.(map[string]any)
		if user["password"] != "[REDACTED]" {
			t.Errorf("Expected user %d password redacted, got %v", i, user["password"])
		}
	}
}

// ==================== CONCURRENCY TESTS ====================

func TestConcurrency_SimultaneousLogRequests(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.0,
		MaxEntries: 100,
		Dedupe:     false,
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.1),
	})

	var wg sync.WaitGroup
	numGoroutines := 50

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			logger.LogRequest(map[string]any{"goroutine": id})
		}(i)
	}

	wg.Wait()

	count := logger.GetLogCount()
	if count != numGoroutines {
		t.Errorf("Expected %d logs from concurrent requests, got %d", numGoroutines, count)
	}
}

// ==================== SAMPLE RATE EDGE CASES ====================

func TestNew_NegativeSampleRate(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: -0.5, // Should be clamped to 0
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.0),
	})

	logger.LogRequest(map[string]any{"test": "data"})

	if logger.GetLogCount() != 0 {
		t.Error("Expected 0 logs with negative (clamped to 0) sampleRate")
	}
}

func TestNew_OverOneSampleRate(t *testing.T) {
	logger := auditlogger.New(auditlogger.Options{
		SampleRate: 1.5, // Should be clamped to 1
		Clock:      FakeClock{FixedTime: "2024-01-01T00:00:00Z"},
		Random:     NewFakeRandom(0.99),
	})

	logger.LogRequest(map[string]any{"test": "data"})

	if logger.GetLogCount() != 1 {
		t.Errorf("Expected 1 log with sampleRate clamped to 1, got %d", logger.GetLogCount())
	}
}