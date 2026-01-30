package wal

import (
	"encoding/binary"
	"fmt"
	"hash/crc32"
	"io"
	"os"
	"sync"
)

const (
	checksumSize = 4
	typeSize     = 4
	lengthSize   = 4
	headerSize   = checksumSize + typeSize + lengthSize
)

// JournalEngine manages the persistence of binary records to an append-only log.
type JournalEngine struct {
	file *os.File
	mu   sync.Mutex
}

// Record represents a single entry in the journal.
type Record struct {
	Type    uint32
	Payload []byte
}

// NewJournalEngine opens or creates a journal at the given path and performs recovery.
func NewJournalEngine(path string) (*JournalEngine, error) {
	file, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open journal file: %w", err)
	}

	je := &JournalEngine{
		file: file,
	}

	if err := je.recover(); err != nil {
		file.Close()
		return nil, fmt.Errorf("recovery failed: %w", err)
	}

	return je, nil
}

// Append serializes and writes a record to the journal.
// It is thread-safe and ensures the record is flushed to the OS, but not necessarily physical media.
// Use Sync() to ensure durability against power loss.
func (je *JournalEngine) Append(recordType uint32, payload []byte) error {
	je.mu.Lock()
	defer je.mu.Unlock()

	payloadLen := uint32(len(payload))
	frame := make([]byte, headerSize+len(payload))

	// Layout: Checksum (4) | Type (4) | Length (4) | Payload (N)
	binary.BigEndian.PutUint32(frame[4:8], recordType)
	binary.BigEndian.PutUint32(frame[8:12], payloadLen)
	copy(frame[12:], payload)

	// Calculate checksum over Type, Length, and Payload
	checksum := crc32.ChecksumIEEE(frame[4:])
	binary.BigEndian.PutUint32(frame[0:4], checksum)

	if _, err := je.file.Write(frame); err != nil {
		return fmt.Errorf("failed to write record: %w", err)
	}

	return nil
}

// Sync flushes the file's contents to stable storage.
func (je *JournalEngine) Sync() error {
	je.mu.Lock()
	defer je.mu.Unlock()
	return je.file.Sync()
}

// Close closes the underlying journal file.
func (je *JournalEngine) Close() error {
	je.mu.Lock()
	defer je.mu.Unlock()
	return je.file.Close()
}

// recover scans the log and truncates any partial or corrupted records at the tail.
func (je *JournalEngine) recover() error {
	je.mu.Lock()
	defer je.mu.Unlock()

	stat, err := je.file.Stat()
	if err != nil {
		return err
	}

	fileSize := stat.Size()
	lastValidPos := int64(0)
	currentPos := int64(0)

	for {
		if currentPos+headerSize > fileSize {
			// Incomplete header at the end
			break
		}

		// Read header
		header := make([]byte, headerSize)
		if _, err := je.file.ReadAt(header, currentPos); err != nil {
			if err == io.EOF {
				break
			}
			return err
		}

		expectedChecksum := binary.BigEndian.Uint32(header[0:4])
		payloadLen := binary.BigEndian.Uint32(header[8:12])

		if currentPos+headerSize+int64(payloadLen) > fileSize {
			// Incomplete payload at the end
			break
		}

		payload := make([]byte, payloadLen)
		if _, err := je.file.ReadAt(payload, currentPos+headerSize); err != nil {
			return err
		}

		// Validate checksum
		hasher := crc32.NewIEEE()
		hasher.Write(header[4:])
		hasher.Write(payload)
		actualChecksum := hasher.Sum32()

		if actualChecksum != expectedChecksum {
			break
		}

		// Valid record
		currentPos += headerSize + int64(payloadLen)
		lastValidPos = currentPos
	}

	if lastValidPos < fileSize {
		if err := je.file.Truncate(lastValidPos); err != nil {
			return fmt.Errorf("failed to truncate corrupted tail: %w", err)
		}
	}

	// Move file pointer to the end for appending
	if _, err := je.file.Seek(0, io.SeekEnd); err != nil {
		return fmt.Errorf("failed to seek to end: %w", err)
	}

	return nil
}

// Iterator provides a way to replay records one by one.
type Iterator struct {
	file *os.File
	pos  int64
	size int64
}

// NewIterator creates a new recovery iterator for the journal.
// It assumes the journal has been recovered/truncated to a clean state.
func (je *JournalEngine) NewIterator() (*Iterator, error) {
	je.mu.Lock()
	defer je.mu.Unlock()

	stat, err := je.file.Stat()
	if err != nil {
		return nil, err
	}

	// We open a new read-only file handle for consistency or just use the existing one if we handle seek correctly.
	// But the prompt says "iterator", and we might want to iterate while others append (though risky without locking).
	// However, "recovery iterator" usually means it's used during startup.

	// I'll create a new file handle to avoid interfering with the main file pointer's current position if needed,
	// but the simplest is to just use a separate pos tracker.

	// Actually, let's open the file again in read-only mode for the iterator.
	f, err := os.Open(je.file.Name())
	if err != nil {
		return nil, err
	}

	return &Iterator{
		file: f,
		pos:  0,
		size: stat.Size(),
	}, nil
}

// Next returns the next valid record from the journal. Returns io.EOF when done.
func (it *Iterator) Next() (*Record, error) {
	if it.pos+headerSize > it.size {
		return nil, io.EOF
	}

	header := make([]byte, headerSize)
	if _, err := it.file.ReadAt(header, it.pos); err != nil {
		return nil, err
	}

	expectedChecksum := binary.BigEndian.Uint32(header[0:4])
	recordType := binary.BigEndian.Uint32(header[4:8])
	payloadLen := binary.BigEndian.Uint32(header[8:12])

	if it.pos+headerSize+int64(payloadLen) > it.size {
		return nil, io.EOF
	}

	payload := make([]byte, payloadLen)
	if _, err := it.file.ReadAt(payload, it.pos+headerSize); err != nil {
		return nil, err
	}

	hasher := crc32.NewIEEE()
	hasher.Write(header[4:])
	hasher.Write(payload)
	if hasher.Sum32() != expectedChecksum {
		return nil, fmt.Errorf("checksum mismatch at position %d", it.pos)
	}

	it.pos += headerSize + int64(payloadLen)

	return &Record{
		Type:    recordType,
		Payload: payload,
	}, nil
}

// Close closes the iterator's file handle.
func (it *Iterator) Close() error {
	return it.file.Close()
}
