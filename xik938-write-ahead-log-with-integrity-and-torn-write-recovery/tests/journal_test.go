package tests

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"sync"
	"testing"
	wal "wal-project/repository_after"
)

func TestJournalCriteria(t *testing.T) {
	tmpDir := t.TempDir()
	logPath := filepath.Join(tmpDir, "journal_criteria.log")

	je, err := wal.NewJournalEngine(logPath)
	if err != nil {
		t.Fatalf("Failed to create JournalEngine: %v", err)
	}

	payload := []byte("test-payload")
	if err := je.Append(101, payload); err != nil {
		t.Fatalf("Failed to append: %v", err)
	}
	je.Close()

	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		t.Fatalf("Failed to open for corruption: %v", err)
	}
	f.Write([]byte{1, 2, 3})
	f.Close()

	je2, err := wal.NewJournalEngine(logPath)
	if err != nil {
		t.Fatalf("Failed to open corrupted journal: %v", err)
	}
	defer je2.Close()

	stat, _ := os.Stat(logPath)
	if stat.Size() != 24 {
		t.Errorf("Expected truncated size 24, got %d", stat.Size())
	}

	if err := je2.Sync(); err != nil {
		t.Errorf("Sync failed: %v", err)
	}

	it, err := je2.NewIterator()
	if err != nil {
		t.Fatalf("Failed to create iterator: %v", err)
	}
	defer it.Close()

	rec, err := it.Next()
	if err != nil {
		t.Fatalf("Failed to read record: %v", err)
	}
	if !bytes.Equal(rec.Payload, payload) {
		t.Errorf("Payload mismatch: got %s, want %s", rec.Payload, payload)
	}
	if rec.Type != 101 {
		t.Errorf("Type mismatch: got %d, want 101", rec.Type)
	}
}

func TestJournalChecksumCorruption(t *testing.T) {
	tmpDir := t.TempDir()
	logPath := filepath.Join(tmpDir, "checksum_corrupt.log")

	je, err := wal.NewJournalEngine(logPath)
	if err != nil {
		t.Fatalf("Failed to create JournalEngine: %v", err)
	}
	je.Append(1, []byte("valid1"))
	je.Append(2, []byte("valid2"))
	je.Close()

	data, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("Failed to read file for corruption: %v", err)
	}
	data[18] ^= 0xFF
	err = os.WriteFile(logPath, data, 0644)
	if err != nil {
		t.Fatalf("Failed to write corrupted file: %v", err)
	}

	je2, err := wal.NewJournalEngine(logPath)
	if err != nil {
		t.Fatalf("Failed to recover: %v", err)
	}
	defer je2.Close()

	it, err := je2.NewIterator()
	if err != nil {
		t.Fatalf("Failed to create iterator: %v", err)
	}
	defer it.Close()

	rec, err := it.Next()
	if err != nil {
		t.Fatalf("Expected valid1, got error: %v", err)
	}
	if string(rec.Payload) != "valid1" {
		t.Errorf("Expected valid1, got %s", rec.Payload)
	}

	if n, err := it.Next(); err != io.EOF {
		t.Errorf("Expected EOF after corruption, got record %v, error %v", n, err)
	}

	stat, err := os.Stat(logPath)
	if err != nil {
		t.Fatalf("Stat failed: %v", err)
	}
	if stat.Size() != 18 {
		t.Errorf("Expected truncated size 18, got %d", stat.Size())
	}
}

func TestJournalEngine_Basic(t *testing.T) {
	tmpDir := t.TempDir()
	logPath := filepath.Join(tmpDir, "test_basic.log")

	je, err := wal.NewJournalEngine(logPath)
	if err != nil {
		t.Fatalf("failed to create journal: %v", err)
	}
	defer je.Close()

	records := []wal.Record{
		{Type: 1, Payload: []byte("hello")},
		{Type: 2, Payload: []byte("world")},
		{Type: 3, Payload: []byte("")},
	}

	for _, r := range records {
		if err := je.Append(r.Type, r.Payload); err != nil {
			t.Fatalf("failed to append: %v", err)
		}
	}

	it, err := je.NewIterator()
	if err != nil {
		t.Fatalf("failed to create iterator: %v", err)
	}
	defer it.Close()

	for _, expected := range records {
		actual, err := it.Next()
		if err != nil {
			t.Fatalf("failed to get next record: %v", err)
		}
		if actual.Type != expected.Type {
			t.Errorf("expected type %d, got %d", expected.Type, actual.Type)
		}
		if !bytes.Equal(actual.Payload, expected.Payload) {
			t.Errorf("expected payload %s, got %s", expected.Payload, actual.Payload)
		}
	}

	if _, err := it.Next(); err != io.EOF {
		t.Errorf("expected EOF, got %v", err)
	}
}

func TestJournalEngine_Concurrent(t *testing.T) {
	tmpDir := t.TempDir()
	logPath := filepath.Join(tmpDir, "concurrent_ext.log")

	je, err := wal.NewJournalEngine(logPath)
	if err != nil {
		t.Fatalf("failed to create journal: %v", err)
	}
	defer je.Close()

	const numGoroutines = 10
	const recordsPerGoroutine = 100
	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			defer wg.Done()
			for j := 0; j < recordsPerGoroutine; j++ {
				payload := []byte(filepath.Join("data", string(rune(id)), string(rune(j))))
				if err := je.Append(uint32(id), payload); err != nil {
					t.Errorf("goroutine %d failed to append: %v", id, err)
					return
				}
			}
		}(i)
	}

	wg.Wait()

	it, err := je.NewIterator()
	if err != nil {
		t.Fatalf("failed to create iterator: %v", err)
	}
	defer it.Close()

	count := 0
	for {
		_, err := it.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatalf("failed during iteration: %v", err)
		}
		count++
	}

	if count != numGoroutines*recordsPerGoroutine {
		t.Errorf("expected %d records, got %d", numGoroutines*recordsPerGoroutine, count)
	}
}

func TestJournalEngine_Recovery(t *testing.T) {
	tmpDir := t.TempDir()
	logPath := filepath.Join(tmpDir, "recovery_ext.log")

	je, err := wal.NewJournalEngine(logPath)
	if err != nil {
		t.Fatalf("failed to create journal: %v", err)
	}
	je.Append(1, []byte("valid1"))
	je.Append(2, []byte("valid2"))
	je.Close()

	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		t.Fatalf("failed to open for corruption: %v", err)
	}
	f.Write([]byte{0xDE, 0xAD, 0xBE, 0xEF})
	f.Close()

	je2, err := wal.NewJournalEngine(logPath)
	if err != nil {
		t.Fatalf("failed to open for recovery: %v", err)
	}
	defer je2.Close()

	it, err := je2.NewIterator()
	if err != nil {
		t.Fatalf("failed to create iterator: %v", err)
	}
	defer it.Close()

	r1, err := it.Next()
	if err != nil {
		t.Fatalf("failed to read r1: %v", err)
	}
	if string(r1.Payload) != "valid1" {
		t.Errorf("expected valid1, got %s", r1.Payload)
	}
	r2, err := it.Next()
	if err != nil {
		t.Fatalf("failed to read r2: %v", err)
	}
	if string(r2.Payload) != "valid2" {
		t.Errorf("expected valid2, got %s", r2.Payload)
	}
	if _, err := it.Next(); err != io.EOF {
		t.Errorf("expected EOF after recovery, got %v", err)
	}

	if err := je2.Append(3, []byte("new")); err != nil {
		t.Fatalf("failed to append after recovery: %v", err)
	}
}

func TestJournalEngine_CorruptedPayload(t *testing.T) {
	tmpDir := t.TempDir()
	logPath := filepath.Join(tmpDir, "corrupt_payload_ext.log")

	je, err := wal.NewJournalEngine(logPath)
	if err != nil {
		t.Fatalf("failed to create journal: %v", err)
	}
	je.Append(1, []byte("valid"))
	je.Close()

	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		t.Fatalf("failed to open for corruption: %v", err)
	}
	header := []byte{0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 10}
	f.Write(header)
	f.Write([]byte("short"))
	f.Close()

	je2, err := wal.NewJournalEngine(logPath)
	if err != nil {
		t.Fatalf("failed to open for recovery: %v", err)
	}
	defer je2.Close()

	it, err := je2.NewIterator()
	if err != nil {
		t.Fatalf("failed to create iterator: %v", err)
	}
	defer it.Close()

	r, err := it.Next()
	if err != nil {
		t.Fatalf("failed to read: %v", err)
	}
	if string(r.Payload) != "valid" {
		t.Errorf("expected valid, got %s", r.Payload)
	}
	if _, err := it.Next(); err != io.EOF {
		t.Errorf("expected EOF after recovery, got %v", err)
	}
}

func TestJournalEngine_LargePayload(t *testing.T) {
	tmpDir := t.TempDir()
	logPath := filepath.Join(tmpDir, "large_ext.log")

	je, err := wal.NewJournalEngine(logPath)
	if err != nil {
		t.Fatalf("failed to create journal: %v", err)
	}
	defer je.Close()

	payload := make([]byte, 1024*1024)
	for i := range payload {
		payload[i] = byte(i % 256)
	}

	if err := je.Append(99, payload); err != nil {
		t.Fatalf("failed to append large payload: %v", err)
	}

	it, err := je.NewIterator()
	if err != nil {
		t.Fatalf("failed to create iterator: %v", err)
	}
	defer it.Close()

	r, err := it.Next()
	if err != nil {
		t.Fatalf("failed to read large payload: %v", err)
	}

	if !bytes.Equal(r.Payload, payload) {
		t.Error("large payload mismatch")
	}
}
