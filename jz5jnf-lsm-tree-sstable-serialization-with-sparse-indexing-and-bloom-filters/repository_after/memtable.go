package repository_after

import (
	"bufio"
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"sort"
	"sync"
)

const (
	// MagicNumber is a fixed identifier at the end of SSTable files
	MagicNumber = 0x4C534D54 // "LSMT" in ASCII
)

// MemTable is a concurrent-safe in-memory sorted key-value store
type MemTable struct {
	mu   sync.RWMutex
	data map[string][]byte
}

// NewMemTable creates a new empty MemTable
func NewMemTable() *MemTable {
	return &MemTable{
		data: make(map[string][]byte),
	}
}

// Put inserts or updates a key-value pair
func (mt *MemTable) Put(key string, value []byte) {
	mt.mu.Lock()
	defer mt.mu.Unlock()
	mt.data[key] = value
}

// Get retrieves a value by key
func (mt *MemTable) Get(key string) ([]byte, bool) {
	mt.mu.RLock()
	defer mt.mu.RUnlock()
	value, exists := mt.data[key]
	return value, exists
}

// Size returns the number of entries in the MemTable
func (mt *MemTable) Size() int {
	mt.mu.RLock()
	defer mt.mu.RUnlock()
	return len(mt.data)
}

// getSortedEntries returns all entries sorted by key (requires read lock)
func (mt *MemTable) getSortedEntries() []entry {
	entries := make([]entry, 0, len(mt.data))
	for k, v := range mt.data {
		entries = append(entries, entry{key: k, value: v})
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].key < entries[j].key
	})
	return entries
}

type entry struct {
	key   string
	value []byte
}

// BloomFilter is a probabilistic data structure for membership testing
type BloomFilter struct {
	bitset    []byte
	size      uint64 // number of bits
	numHashes int
}

// NewBloomFilter creates a new Bloom Filter with specified size and number of hash functions
func NewBloomFilter(size uint64, numHashes int) *BloomFilter {
	// Calculate number of bytes needed (round up)
	bytesNeeded := (size + 7) / 8
	return &BloomFilter{
		bitset:    make([]byte, bytesNeeded),
		size:      size,
		numHashes: numHashes,
	}
}

// hash functions using FNV-1a and bit shifts
func (bf *BloomFilter) hash(key []byte, seed uint32) uint64 {
	hash := uint64(2166136261) // FNV offset basis
	for _, b := range key {
		hash ^= uint64(b)
		hash *= 16777619 // FNV prime
	}
	// Add seed variation for multiple hash functions
	hash ^= uint64(seed)
	hash *= 16777619
	return hash % bf.size
}

// Add adds a key to the Bloom Filter
func (bf *BloomFilter) Add(key []byte) {
	for i := 0; i < bf.numHashes; i++ {
		pos := bf.hash(key, uint32(i))
		byteIndex := pos / 8
		bitIndex := pos % 8
		bf.bitset[byteIndex] |= (1 << bitIndex)
	}
}

// Contains checks if a key might be in the Bloom Filter
func (bf *BloomFilter) Contains(key []byte) bool {
	for i := 0; i < bf.numHashes; i++ {
		pos := bf.hash(key, uint32(i))
		byteIndex := pos / 8
		bitIndex := pos % 8
		if (bf.bitset[byteIndex] & (1 << bitIndex)) == 0 {
			return false
		}
	}
	return true
}

// Serialize writes the Bloom Filter bitset to a writer
func (bf *BloomFilter) Serialize(w io.Writer) error {
	// Write size in bits (uint64) - this is critical for correct hash calculation
	if err := binary.Write(w, binary.LittleEndian, bf.size); err != nil {
		return err
	}
	// Write size of bitset in bytes (uint64)
	if err := binary.Write(w, binary.LittleEndian, uint64(len(bf.bitset))); err != nil {
		return err
	}
	// Write the bitset
	if _, err := w.Write(bf.bitset); err != nil {
		return err
	}
	return nil
}

// SparseIndexEntry represents a single entry in the sparse index
type SparseIndexEntry struct {
	Offset uint64
	Key    string
}

// FlushToSSTable serializes the MemTable to disk as an SSTable
func (mt *MemTable) FlushToSSTable(filename string, sparseIndexInterval int) error {
	// Acquire read lock to freeze the MemTable for reading
	mt.mu.RLock()
	defer mt.mu.RUnlock()

	// Get sorted entries
	entries := mt.getSortedEntries()
	if len(entries) == 0 {
		return fmt.Errorf("cannot flush empty MemTable")
	}

	// Create or truncate the file
	file, err := os.Create(filename)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	// Use bufio.Writer for efficient writes
	writer := bufio.NewWriter(file)
	defer writer.Flush()

	// Calculate Bloom Filter size (rule of thumb: 10 bits per element)
	bfSize := uint64(len(entries) * 10)
	if bfSize < 64 {
		bfSize = 64 // minimum size
	}
	bloomFilter := NewBloomFilter(bfSize, 3)

	// Track current offset in the file
	var currentOffset uint64 = 0
	var sparseIndex []SparseIndexEntry

	// Write all entries
	for i, entry := range entries {
		// Record offset for sparse index (every Nth entry)
		if i%sparseIndexInterval == 0 {
			sparseIndex = append(sparseIndex, SparseIndexEntry{
				Offset: currentOffset,
				Key:    entry.key,
			})
		}

		// Add to Bloom Filter
		bloomFilter.Add([]byte(entry.key))

		// Write KeyLength (uint32)
		keyLen := uint32(len(entry.key))
		if err := binary.Write(writer, binary.LittleEndian, keyLen); err != nil {
			return fmt.Errorf("failed to write key length: %w", err)
		}
		currentOffset += 4

		// Write Key (bytes)
		if _, err := writer.Write([]byte(entry.key)); err != nil {
			return fmt.Errorf("failed to write key: %w", err)
		}
		currentOffset += uint64(len(entry.key))

		// Write ValueLength (uint32)
		valLen := uint32(len(entry.value))
		if err := binary.Write(writer, binary.LittleEndian, valLen); err != nil {
			return fmt.Errorf("failed to write value length: %w", err)
		}
		currentOffset += 4

		// Write Value (bytes)
		if _, err := writer.Write(entry.value); err != nil {
			return fmt.Errorf("failed to write value: %w", err)
		}
		currentOffset += uint64(len(entry.value))
	}

	// Flush buffered writes before calculating offsets
	if err := writer.Flush(); err != nil {
		return fmt.Errorf("failed to flush writer: %w", err)
	}

	// Get current position (start of Bloom Filter)
	bloomFilterOffset, err := file.Seek(0, io.SeekCurrent)
	if err != nil {
		return fmt.Errorf("failed to get file position: %w", err)
	}

	// Write Bloom Filter
	if err := bloomFilter.Serialize(writer); err != nil {
		return fmt.Errorf("failed to serialize Bloom Filter: %w", err)
	}
	if err := writer.Flush(); err != nil {
		return fmt.Errorf("failed to flush after Bloom Filter: %w", err)
	}

	// Get current position (start of Sparse Index)
	sparseIndexOffset, err := file.Seek(0, io.SeekCurrent)
	if err != nil {
		return fmt.Errorf("failed to get file position: %w", err)
	}

	// Write Sparse Index
	// First write the number of index entries (uint32)
	numEntries := uint32(len(sparseIndex))
	if err := binary.Write(writer, binary.LittleEndian, numEntries); err != nil {
		return fmt.Errorf("failed to write sparse index count: %w", err)
	}

	// Write each index entry: [Offset (uint64)][KeyLength (uint32)][Key (bytes)]
	for _, idxEntry := range sparseIndex {
		// Write Offset
		if err := binary.Write(writer, binary.LittleEndian, idxEntry.Offset); err != nil {
			return fmt.Errorf("failed to write index offset: %w", err)
		}
		// Write KeyLength
		keyLen := uint32(len(idxEntry.Key))
		if err := binary.Write(writer, binary.LittleEndian, keyLen); err != nil {
			return fmt.Errorf("failed to write index key length: %w", err)
		}
		// Write Key
		if _, err := writer.Write([]byte(idxEntry.Key)); err != nil {
			return fmt.Errorf("failed to write index key: %w", err)
		}
	}

	// Flush before writing footer
	if err := writer.Flush(); err != nil {
		return fmt.Errorf("failed to flush after sparse index: %w", err)
	}

	// Write Footer: [BloomFilterOffset (uint64)][SparseIndexOffset (uint64)][MagicNumber (uint32)]
	if err := binary.Write(writer, binary.LittleEndian, uint64(bloomFilterOffset)); err != nil {
		return fmt.Errorf("failed to write Bloom Filter offset: %w", err)
	}
	if err := binary.Write(writer, binary.LittleEndian, uint64(sparseIndexOffset)); err != nil {
		return fmt.Errorf("failed to write Sparse Index offset: %w", err)
	}
	if err := binary.Write(writer, binary.LittleEndian, uint32(MagicNumber)); err != nil {
		return fmt.Errorf("failed to write magic number: %w", err)
	}

	// Final flush
	if err := writer.Flush(); err != nil {
		return fmt.Errorf("failed to final flush: %w", err)
	}

	return nil
}
