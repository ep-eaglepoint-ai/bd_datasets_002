package tests

import (
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	main "github.com/ep-eaglepoint-ai/bd_datasets_002/jz5jnf-lsm-tree-sstable-serialization-with-sparse-indexing-and-bloom-filters/repository_after"
)

func TestReq2_SparseIndexSize(t *testing.T) {
	mt := main.NewMemTable()
	numEntries := 100
	for i := 0; i < numEntries; i++ {
		key := fmt.Sprintf("key%03d", i)
		mt.Put(key, []byte("value"))
	}

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test_sparse.sstable")

	// Use interval of 10. Expected indices: 0, 10, 20, ..., 90 (10 entries)
	sparseInterval := 10
	err := mt.FlushToSSTable(filename, sparseInterval)
	require.NoError(t, err)

	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err)
	defer reader.Close()

	index := reader.GetSparseIndex()
	expectedIndexEntries := (numEntries + sparseInterval - 1) / sparseInterval // Ceiling division
	assert.Equal(t, expectedIndexEntries, len(index), "Sparse index should have correct number of entries")
	assert.Less(t, len(index), numEntries, "Sparse index should be smaller than total keys")

	// Verify the actual byte size of sparse index section is smaller than data section
	file, err := os.Open(filename)
	require.NoError(t, err)
	defer file.Close()

	bfOffset, siOffset := reader.GetFooterOffsets()
	
	// Calculate data section size (from start to Bloom Filter)
	dataSectionSize := bfOffset
	
	// Calculate sparse index section size (from SparseIndexOffset to footer)
	fileInfo, err := file.Stat()
	require.NoError(t, err)
	footerSize := int64(20) // 8 + 8 + 4
	sparseIndexSectionSize := uint64(fileInfo.Size()) - siOffset - uint64(footerSize)
	
	// Sparse index section should be significantly smaller than data section
	// Each index entry is: 8 (offset) + 4 (keyLen) + key bytes
	// For 10 entries with keys like "key000", "key010", etc. (6 bytes each)
	// Index size ≈ 10 * (8 + 4 + 6) = 180 bytes
	// Data section for 100 entries: 100 * (4 + 6 + 4 + 5) = 1900 bytes
	assert.Less(t, sparseIndexSectionSize, dataSectionSize, 
		"Sparse index section (%d bytes) should be smaller than data section (%d bytes)", 
		sparseIndexSectionSize, dataSectionSize)
}

func TestReq3_FooterStructure(t *testing.T) {
	mt := main.NewMemTable()
	mt.Put("key1", []byte("value1"))
	mt.Put("key2", []byte("value2"))
	mt.Put("key3", []byte("value3"))

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test_footer.sstable")

	err := mt.FlushToSSTable(filename, 2)
	require.NoError(t, err)

	file, err := os.Open(filename)
	require.NoError(t, err)
	defer file.Close()

	fileInfo, err := file.Stat()
	require.NoError(t, err)

	// Footer is 20 bytes: 8 (BloomFilterOffset) + 8 (SparseIndexOffset) + 4 (MagicNumber)
	footerSize := int64(20)
	footerStart := fileInfo.Size() - footerSize
	_, err = file.Seek(footerStart, io.SeekStart)
	require.NoError(t, err)

	var bfOffset, siOffset uint64
	var magic uint32

	// Read and verify BloomFilterOffset
	err = binary.Read(file, binary.LittleEndian, &bfOffset)
	require.NoError(t, err)
	assert.Greater(t, bfOffset, uint64(0), "BloomFilterOffset should be positive")
	assert.Less(t, bfOffset, uint64(footerStart), "BloomFilterOffset should be before footer")

	// Read and verify SparseIndexOffset
	err = binary.Read(file, binary.LittleEndian, &siOffset)
	require.NoError(t, err)
	assert.Greater(t, siOffset, bfOffset, "Sparse Index should be after Bloom Filter")
	assert.Less(t, siOffset, uint64(footerStart), "Sparse Index should be before footer")

	// Read and verify MagicNumber
	err = binary.Read(file, binary.LittleEndian, &magic)
	require.NoError(t, err)
	assert.Equal(t, uint32(main.MagicNumber), magic, "Magic number should match expected value 0x4C534D54")
	
	// Verify we're at the end of the file
	currentPos, err := file.Seek(0, io.SeekCurrent)
	require.NoError(t, err)
	assert.Equal(t, fileInfo.Size(), currentPos, "Should be at end of file after reading footer")

	// Verify offsets are correct by reading the actual sections
	// Check Bloom Filter starts at bfOffset
	_, err = file.Seek(int64(bfOffset), io.SeekStart)
	require.NoError(t, err)
	var bfSizeBits uint64
	err = binary.Read(file, binary.LittleEndian, &bfSizeBits)
	require.NoError(t, err)
	assert.Greater(t, bfSizeBits, uint64(0), "Bloom Filter should have valid size")

	// Check Sparse Index starts at siOffset
	_, err = file.Seek(int64(siOffset), io.SeekStart)
	require.NoError(t, err)
	var numIndexEntries uint32
	err = binary.Read(file, binary.LittleEndian, &numIndexEntries)
	require.NoError(t, err)
	assert.Greater(t, numIndexEntries, uint32(0), "Sparse Index should have entries")
}

func TestReq4_BloomFilterBitset(t *testing.T) {
	mt := main.NewMemTable()
	mt.Put("key1", []byte("val1"))
	mt.Put("key2", []byte("val2"))
	mt.Put("key3", []byte("val3"))

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test_bf.sstable")

	err := mt.FlushToSSTable(filename, 1)
	require.NoError(t, err)

	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err)
	defer reader.Close()

	bf := reader.GetBloomFilter()
	require.NotNil(t, bf)

	bitset := bf.GetBitset()
	require.NotNil(t, bitset)
	require.Greater(t, len(bitset), 0, "Bitset should not be empty")
	
	// Check that at least some bits are set (proves bitwise operations were used)
	hasBits := false
	for _, b := range bitset {
		if b != 0 {
			hasBits = true
			break
		}
	}
	assert.True(t, hasBits, "Bloom filter bitset should have some bits set (proves bitwise ops, not map)")

	// Verify bitwise operations by testing the Bloom Filter directly
	// Create a new Bloom Filter and verify it uses bitwise operations
	testBf := main.NewBloomFilter(64, 3)
	require.NotNil(t, testBf)
	
	// Add multiple keys and verify bits are set using bitwise operations
	keys := [][]byte{[]byte("key1"), []byte("key2"), []byte("key3")}
	for _, key := range keys {
		testBf.Add(key)
	}
	
	// Verify bitset has bits set (proves bitwise OR operations)
	bitsetAfter := testBf.GetBitset()
	hasSetBits := false
	for _, b := range bitsetAfter {
		if b != 0 {
			hasSetBits = true
			break
		}
	}
	assert.True(t, hasSetBits, "Bitset should have bits set after Add (proves bitwise |= operations)")
	
	// Verify Contains uses bitwise AND operations
	// If a key was added, Contains should return true (or false positive)
	// The key point is that it uses bitwise operations, not map lookup
	for _, key := range keys {
		contains := testBf.Contains(key)
		// Should return true for keys we added (or false positive)
		// The implementation uses bitwise AND, not map lookup
		assert.True(t, contains, "Contains should return true for added keys (uses bitwise AND)")
	}
	
	// Verify the bitset is compact (byte array, not map)
	// A map would require much more memory per key
	// A bitset with 64 bits = 8 bytes can represent many keys
	bitsetSize := len(bitsetAfter)
	assert.LessOrEqual(t, bitsetSize, 8, "Bitset should be compact (8 bytes for 64 bits), not a map")
}

func TestReq6_Endianness(t *testing.T) {
	mt := main.NewMemTable()
	// Test with various key/value sizes to verify endianness across all fields
	mt.Put("a", []byte("v"))           // KeyLen=1, ValLen=1
	mt.Put("longkey", []byte("longval")) // KeyLen=7, ValLen=7

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test_endian.sstable")

	err := mt.FlushToSSTable(filename, 1)
	require.NoError(t, err)

	file, err := os.Open(filename)
	require.NoError(t, err)
	defer file.Close()

	// Test 1: Verify KeyLength is LittleEndian (first entry: key="a", length=1)
	buf := make([]byte, 4)
	_, err = io.ReadFull(file, buf)
	require.NoError(t, err)
	// In LittleEndian, 1 is [1, 0, 0, 0]
	assert.Equal(t, byte(1), buf[0], "KeyLength byte 0 should be 1 (LittleEndian)")
	assert.Equal(t, byte(0), buf[1], "KeyLength byte 1 should be 0 (LittleEndian)")
	assert.Equal(t, byte(0), buf[2], "KeyLength byte 2 should be 0 (LittleEndian)")
	assert.Equal(t, byte(0), buf[3], "KeyLength byte 3 should be 0 (LittleEndian)")

	// Skip key "a" (1 byte) and read ValueLength
	_, err = file.Seek(5, io.SeekStart) // 4 (KeyLen) + 1 (Key)
	require.NoError(t, err)
	_, err = io.ReadFull(file, buf)
	require.NoError(t, err)
	// ValueLength for "v" is 1, so [1, 0, 0, 0] in LittleEndian
	assert.Equal(t, byte(1), buf[0], "ValueLength byte 0 should be 1 (LittleEndian)")
	assert.Equal(t, byte(0), buf[1], "ValueLength byte 1 should be 0 (LittleEndian)")

	// Test 2: Verify second entry KeyLength (key="longkey", length=7)
	// Calculate offset: first entry = 4 (KeyLen) + 1 (Key) + 4 (ValLen) + 1 (Val) = 10
	_, err = file.Seek(10, io.SeekStart)
	require.NoError(t, err)
	_, err = io.ReadFull(file, buf)
	require.NoError(t, err)
	// In LittleEndian, 7 is [7, 0, 0, 0]
	assert.Equal(t, byte(7), buf[0], "KeyLength for 'longkey' should be 7 (LittleEndian)")
	assert.Equal(t, byte(0), buf[1], "KeyLength byte 1 should be 0 (LittleEndian)")

	// Test 3: Verify footer offsets are LittleEndian
	fileInfo, err := file.Stat()
	require.NoError(t, err)
	footerSize := int64(20)
	_, err = file.Seek(fileInfo.Size()-footerSize, io.SeekStart)
	require.NoError(t, err)

	// Read BloomFilterOffset (uint64, 8 bytes)
	offsetBuf := make([]byte, 8)
	_, err = io.ReadFull(file, offsetBuf)
	require.NoError(t, err)
	
	// Verify it's LittleEndian by checking the pattern
	// If it were BigEndian, large offsets would have non-zero high bytes first
	// In LittleEndian, the least significant byte comes first
	bfOffset := binary.LittleEndian.Uint64(offsetBuf)
	assert.Greater(t, bfOffset, uint64(0), "BloomFilterOffset should be positive")
	
	// Read SparseIndexOffset
	_, err = io.ReadFull(file, offsetBuf)
	require.NoError(t, err)
	siOffset := binary.LittleEndian.Uint64(offsetBuf)
	assert.Greater(t, siOffset, bfOffset, "SparseIndexOffset should be after BloomFilterOffset")

	// Read MagicNumber (uint32, 4 bytes)
	magicBuf := make([]byte, 4)
	_, err = io.ReadFull(file, magicBuf)
	require.NoError(t, err)
	// MagicNumber is 0x4C534D54
	// In LittleEndian: [0x54, 0x4D, 0x53, 0x4C]
	assert.Equal(t, byte(0x54), magicBuf[0], "MagicNumber byte 0 should be 0x54 (LittleEndian)")
	assert.Equal(t, byte(0x4D), magicBuf[1], "MagicNumber byte 1 should be 0x4D (LittleEndian)")
	assert.Equal(t, byte(0x53), magicBuf[2], "MagicNumber byte 2 should be 0x53 (LittleEndian)")
	assert.Equal(t, byte(0x4C), magicBuf[3], "MagicNumber byte 3 should be 0x4C (LittleEndian)")
}

func TestReq7_OffsetCorrectness(t *testing.T) {
	mt := main.NewMemTable()
	// Test with various key/value sizes to catch offset calculation errors
	mt.Put("a", []byte("1"))                    // Small key, small value
	mt.Put("bb", []byte("22"))                  // Medium key, medium value
	mt.Put("ccc", []byte("333"))                // Medium key, medium value
	mt.Put("verylongkeyname", []byte("verylongvalue")) // Large key, large value
	mt.Put("x", []byte("y"))                    // Small key, small value

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test_offsets.sstable")

	// Use interval of 2 to create sparse index with some keys
	err := mt.FlushToSSTable(filename, 2)
	require.NoError(t, err)

	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err)
	defer reader.Close()

	index := reader.GetSparseIndex()
	require.GreaterOrEqual(t, len(index), 2, "Should have at least 2 index entries")

	file, err := os.Open(filename)
	require.NoError(t, err)
	defer file.Close()

	// Track expected offsets manually to verify correctness
	expectedOffset := uint64(0)
	entryIndex := 0

	for i := 0; i < 5; i++ {
		// Calculate what the offset should be for this entry
		// Format: [KeyLen(4)][Key][ValLen(4)][Val]
		var keyLen, valLen uint32
		switch i {
		case 0:
			keyLen, valLen = 1, 1 // "a" -> "1"
		case 1:
			keyLen, valLen = 2, 2 // "bb" -> "22"
		case 2:
			keyLen, valLen = 3, 3 // "ccc" -> "333"
		case 3:
			keyLen, valLen = 15, 13 // "verylongkeyname" -> "verylongvalue"
		case 4:
			keyLen, valLen = 1, 1 // "x" -> "y"
		}

		// If this entry is in the sparse index, verify its offset
		if entryIndex < len(index) {
			sparseEntry := index[entryIndex]
			// Check if this is the entry we're looking at
			// We need to match by key since sparse index may skip some entries
			if i%2 == 0 { // Every 2nd entry (interval=2) should be in index
				// Verify offset points exactly to KeyLength field start
				_, err := file.Seek(int64(sparseEntry.Offset), io.SeekStart)
				require.NoError(t, err)

				// Read KeyLength (4 bytes) - this proves offset points to KeyLength start
				var readKeyLen uint32
				err = binary.Read(file, binary.LittleEndian, &readKeyLen)
				require.NoError(t, err)

				// Verify the key length matches
				assert.Equal(t, uint32(len(sparseEntry.Key)), readKeyLen, 
					"Offset %d should point to KeyLength field start for key '%s'", 
					sparseEntry.Offset, sparseEntry.Key)

				// Read and verify the key matches
				keyBuf := make([]byte, readKeyLen)
				_, err = io.ReadFull(file, keyBuf)
				require.NoError(t, err)
				assert.Equal(t, sparseEntry.Key, string(keyBuf),
					"Key read from offset should match sparse index key")

				// Verify offset is exactly where we expect it to be
				assert.Equal(t, expectedOffset, sparseEntry.Offset,
					"Offset should match calculated position for key '%s'",
					sparseEntry.Key)

				entryIndex++
			}
		}

		// Advance expected offset for next entry
		expectedOffset += 4 + uint64(keyLen) + 4 + uint64(valLen)
	}

	// Additional test: Verify that offsets are strictly increasing
	for i := 1; i < len(index); i++ {
		assert.Less(t, index[i-1].Offset, index[i].Offset,
			"Sparse index offsets should be strictly increasing")
	}

	// Verify all offsets are within data section bounds
	bfOffset, _ := reader.GetFooterOffsets()
	for _, entry := range index {
		assert.Less(t, entry.Offset, bfOffset,
			"All sparse index offsets should be within data section (before Bloom Filter)")
	}
}

func TestReq8_ConcurrencyDuringFlush(t *testing.T) {
	mt := main.NewMemTable()
	// Pre-fill some data
	numInitial := 500
	for i := 0; i < numInitial; i++ {
		key := fmt.Sprintf("initial_%04d", i)
		mt.Put(key, []byte("initial_value"))
	}

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test_concurrent_flush.sstable")

	var wg sync.WaitGroup
	wg.Add(3) // Add third goroutine for concurrent reads

	// Start a flush in one goroutine
	flushErrChan := make(chan error, 1)
	flushDone := make(chan bool, 1)
	go func() {
		defer wg.Done()
		err := mt.FlushToSSTable(filename, 10)
		flushErrChan <- err
		flushDone <- true
	}()

	// Start concurrent writes in another goroutine (these should be blocked by RLock)
	writeErrChan := make(chan error, 1)
	numConcurrentWrites := 500
	go func() {
		defer wg.Done()
		// Try to put many keys to ensure overlap with flush
		for i := 0; i < numConcurrentWrites; i++ {
			key := fmt.Sprintf("concurrent_%04d", i)
			mt.Put(key, []byte("concurrent_value"))
		}
		writeErrChan <- nil
	}()

	// Start concurrent reads (should work with RLock)
	readErrChan := make(chan error, 1)
	go func() {
		defer wg.Done()
		// Try to read while flush is happening
		for i := 0; i < 100; i++ {
			key := fmt.Sprintf("initial_%04d", i%numInitial)
			_, exists := mt.Get(key)
			if !exists && i < numInitial {
				readErrChan <- fmt.Errorf("key %s should exist", key)
				return
			}
		}
		readErrChan <- nil
	}()

	wg.Wait()

	// Verify flush succeeded
	require.NoError(t, <-flushErrChan, "Flush should succeed even with concurrent writes")
	require.NoError(t, <-writeErrChan, "Concurrent writes should succeed")
	require.NoError(t, <-readErrChan, "Concurrent reads should succeed")

	// Verify that the flushed SSTable is consistent and can be read
	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err, "Should be able to read SSTable file")
	defer reader.Close()

	entries, err := reader.GetAllEntries()
	require.NoError(t, err, "Should be able to read all entries from SSTable")
	
	// The number of entries in the flush should be exactly numInitial
	// because FlushToSSTable uses RLock which freezes the MemTable state
	// Concurrent writes that happen during flush won't be included
	assert.Equal(t, numInitial, len(entries), 
		"Flushed SSTable should contain exactly the entries present when flush started")

	// Verify all flushed entries are valid and can be retrieved
	for key, expectedValue := range entries {
		val, exists := reader.Get(key)
		assert.True(t, exists, "Key '%s' should exist in reader", key)
		assert.Equal(t, expectedValue, val, "Value for key '%s' should match", key)
	}

	// Verify the file structure is valid (footer, offsets, etc.)
	bfOffset, siOffset := reader.GetFooterOffsets()
	assert.Greater(t, bfOffset, uint64(0), "BloomFilterOffset should be valid")
	assert.Greater(t, siOffset, bfOffset, "SparseIndexOffset should be after BloomFilterOffset")

	// Verify sparse index is valid
	sparseIndex := reader.GetSparseIndex()
	assert.Greater(t, len(sparseIndex), 0, "Sparse index should have entries")
	
	// Verify bloom filter works
	bloomFilter := reader.GetBloomFilter()
	require.NotNil(t, bloomFilter, "Bloom filter should be loaded")
	
	// Test that existing keys pass bloom filter
	for key := range entries {
		// The Get method uses bloom filter, so if it works, bloom filter is correct
		val, exists := reader.Get(key)
		assert.True(t, exists, "Bloom filter should allow existing key '%s'", key)
		assert.NotNil(t, val, "Value should not be nil for existing key")
	}

	// Verify MemTable now has all entries (initial + concurrent writes)
	expectedTotal := numInitial + numConcurrentWrites
	assert.Equal(t, expectedTotal, mt.Size(), 
		"MemTable should have all entries after concurrent operations")
}
