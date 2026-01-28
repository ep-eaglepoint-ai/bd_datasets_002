package tests

import (
	"encoding/binary"
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
	numEntries := 10
	for i := 0; i < numEntries; i++ {
		mt.Put(string(rune('a'+i)), []byte("val"))
	}

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test_sparse.sstable")

	// Use interval of 3. Expected indices: 0, 3, 6, 9 (4 entries)
	err := mt.FlushToSSTable(filename, 3)
	require.NoError(t, err)

	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err)
	defer reader.Close()

	index := reader.GetSparseIndex()
	assert.Equal(t, 4, len(index))
	assert.Less(t, len(index), numEntries, "Sparse index should be smaller than total keys")
}

func TestReq3_FooterStructure(t *testing.T) {
	mt := main.NewMemTable()
	mt.Put("a", []byte("1"))

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test_footer.sstable")

	err := mt.FlushToSSTable(filename, 1)
	require.NoError(t, err)

	file, err := os.Open(filename)
	require.NoError(t, err)
	defer file.Close()

	fileInfo, err := file.Stat()
	require.NoError(t, err)

	// Footer is 20 bytes: 8 (BloomFilterOffset) + 8 (SparseIndexOffset) + 4 (MagicNumber)
	footerSize := int64(20)
	_, err = file.Seek(fileInfo.Size()-footerSize, io.SeekStart)
	require.NoError(t, err)

	var bfOffset, siOffset uint64
	var magic uint32

	err = binary.Read(file, binary.LittleEndian, &bfOffset)
	require.NoError(t, err)
	err = binary.Read(file, binary.LittleEndian, &siOffset)
	require.NoError(t, err)
	err = binary.Read(file, binary.LittleEndian, &magic)
	require.NoError(t, err)

	assert.Equal(t, uint32(main.MagicNumber), magic, "Magic number should match")
	assert.Greater(t, siOffset, bfOffset, "Sparse Index should be after Bloom Filter")
	assert.Less(t, siOffset, uint64(fileInfo.Size()-footerSize), "Sparse Index should be before footer")
}

func TestReq4_BloomFilterBitset(t *testing.T) {
	mt := main.NewMemTable()
	mt.Put("key1", []byte("val1"))

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
	// Check that at least some bits are set
	hasBits := false
	for _, b := range bitset {
		if b != 0 {
			hasBits = true
			break
		}
	}
	assert.True(t, hasBits, "Bloom filter bitset should have some bits set")
	
	// Manual bitwise check: Add a key and verify the bit is set
	// This is more of a unit test for BloomFilter, but it proves bitwise ops are used.
	testBf := main.NewBloomFilter(64, 1)
	key := []byte("testkey")
	testBf.Add(key)
	
	found := false
	for _, b := range testBf.GetBitset() {
		if b != 0 {
			found = true
			break
		}
	}
	assert.True(t, found, "Bitset should not be empty after Add")
}

func TestReq6_Endianness(t *testing.T) {
	mt := main.NewMemTable()
	// "a" is key, length 1. 1 in LittleEndian is 0x01 0x00 0x00 0x00
	mt.Put("a", []byte("v"))

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test_endian.sstable")

	err := mt.FlushToSSTable(filename, 1)
	require.NoError(t, err)

	file, err := os.Open(filename)
	require.NoError(t, err)
	defer file.Close()

	// Read first 4 bytes (KeyLength of first entry)
	buf := make([]byte, 4)
	_, err = io.ReadFull(file, buf)
	require.NoError(t, err)

	// In LittleEndian, 1 is [1, 0, 0, 0]
	assert.Equal(t, byte(1), buf[0])
	assert.Equal(t, byte(0), buf[1])
	assert.Equal(t, byte(0), buf[2])
	assert.Equal(t, byte(0), buf[3])
}

func TestReq7_OffsetCorrectness(t *testing.T) {
	mt := main.NewMemTable()
	mt.Put("apple", []byte("red"))
	mt.Put("banana", []byte("yellow"))

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test_offsets.sstable")

	// Interval 1 means every key is in sparse index
	err := mt.FlushToSSTable(filename, 1)
	require.NoError(t, err)

	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err)
	defer reader.Close()

	index := reader.GetSparseIndex()
	require.GreaterOrEqual(t, len(index), 2)

	file, err := os.Open(filename)
	require.NoError(t, err)
	defer file.Close()

	for _, entry := range index {
		// Seek to the offset recorded in sparse index
		_, err := file.Seek(int64(entry.Offset), io.SeekStart)
		require.NoError(t, err)

		// Read KeyLength (4 bytes)
		var keyLen uint32
		err = binary.Read(file, binary.LittleEndian, &keyLen)
		require.NoError(t, err)

		assert.Equal(t, uint32(len(entry.Key)), keyLen, "Offset should point to KeyLength field")

		// Read Key and verify
		keyBuf := make([]byte, keyLen)
		_, err = io.ReadFull(file, keyBuf)
		require.NoError(t, err)
		assert.Equal(t, entry.Key, string(keyBuf))
	}
}

func TestReq8_ConcurrencyDuringFlush(t *testing.T) {
	mt := main.NewMemTable()
	// Pre-fill some data
	for i := 0; i < 1000; i++ {
		mt.Put(string(rune(i)), []byte("initial"))
	}

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test_concurrent_flush.sstable")

	var wg sync.WaitGroup
	wg.Add(2)

	// Start a flush in one goroutine
	flushErrChan := make(chan error, 1)
	go func() {
		defer wg.Done()
		err := mt.FlushToSSTable(filename, 10)
		flushErrChan <- err
	}()

	// Start concurrent writes in another goroutine
	writeErrChan := make(chan error, 1)
	go func() {
		defer wg.Done()
		// Try to put many keys to ensure overlap with flush
		for i := 0; i < 1000; i++ {
			mt.Put("newkey"+string(rune(i)), []byte("concurrent"))
		}
		writeErrChan <- nil
	}()

	wg.Wait()

	require.NoError(t, <-flushErrChan)
	require.NoError(t, <-writeErrChan)

	// Verify that the flushed SSTable is consistent (can be read)
	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err)
	defer reader.Close()

	entries, err := reader.GetAllEntries()
	require.NoError(t, err)
	// The number of entries in the flush should be between 1000 and 2000.
	// It depends on how many Puts finished before Flush got the RLock.
	assert.GreaterOrEqual(t, len(entries), 1000)
	assert.LessOrEqual(t, len(entries), 2000)
	
	// Verify the MemTable has all 2000 entries (1000 initial + 1000 new)
	// Wait, the new keys might overlap if rune(i) overlaps. 
	// The initial keys are rune(0) to rune(999).
	// The new keys are "newkey" + rune(0) to "newkey" + rune(999).
	// They don't overlap. So total should be 2000.
	assert.Equal(t, 2000, mt.Size())
}
