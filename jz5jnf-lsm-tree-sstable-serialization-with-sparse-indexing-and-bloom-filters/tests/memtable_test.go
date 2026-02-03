package tests

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	main "github.com/ep-eaglepoint-ai/bd_datasets_002/jz5jnf-lsm-tree-sstable-serialization-with-sparse-indexing-and-bloom-filters/repository_after"
)

func TestMemTableBasicOperations(t *testing.T) {
	mt := main.NewMemTable()

	// Test Put and Get
	mt.Put("key1", []byte("value1"))
	mt.Put("key2", []byte("value2"))

	val, exists := mt.Get("key1")
	assert.True(t, exists)
	assert.Equal(t, []byte("value1"), val)

	val, exists = mt.Get("key2")
	assert.True(t, exists)
	assert.Equal(t, []byte("value2"), val)

	// Test non-existent key
	_, exists = mt.Get("nonexistent")
	assert.False(t, exists)

	// Test Size
	assert.Equal(t, 2, mt.Size())
}

func TestFlushToSSTableBasic(t *testing.T) {
	mt := main.NewMemTable()
	mt.Put("apple", []byte("red"))
	mt.Put("banana", []byte("yellow"))
	mt.Put("cherry", []byte("red"))

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test.sstable")

	err := mt.FlushToSSTable(filename, 1)
	require.NoError(t, err)

	// Verify file exists
	_, err = os.Stat(filename)
	require.NoError(t, err)

	// Verify file is not empty
	fileInfo, err := os.Stat(filename)
	require.NoError(t, err)
	assert.Greater(t, fileInfo.Size(), int64(0))
}

func TestFlushToSSTableBinaryFormat(t *testing.T) {
	mt := main.NewMemTable()
	mt.Put("key1", []byte("value1"))
	mt.Put("key2", []byte("value2"))

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test.sstable")

	err := mt.FlushToSSTable(filename, 1)
	require.NoError(t, err)

	// Read back using SSTableReader
	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err)
	defer reader.Close()

	// Verify all entries can be read back
	entries, err := reader.GetAllEntries()
	require.NoError(t, err)

	assert.Equal(t, 2, len(entries))
	assert.Equal(t, []byte("value1"), entries["key1"])
	assert.Equal(t, []byte("value2"), entries["key2"])
}

func TestSparseIndexInterval(t *testing.T) {
	mt := main.NewMemTable()
	
	// Add 10 entries
	for i := 0; i < 10; i++ {
		key := string(rune('a' + i))
		mt.Put(key, []byte("value"))
	}

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test.sstable")

	// Use sparse index interval of 3
	err := mt.FlushToSSTable(filename, 3)
	require.NoError(t, err)

	// Read back and verify sparse index
	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err)
	defer reader.Close()

	// Verify sparse index has correct number of entries (0, 3, 6, 9 = 4 entries)
	// Actually, with interval 3, we should have entries at indices 0, 3, 6, 9
	// First verify all entries can be read
	entries, err := reader.GetAllEntries()
	require.NoError(t, err)
	assert.Equal(t, 10, len(entries))

	// Now verify that Get works correctly for keys in sparse index
	val, exists := reader.Get("a") // index 0 - in sparse index
	assert.True(t, exists, "Key 'a' should exist")
	assert.Equal(t, []byte("value"), val)

	val, exists = reader.Get("d") // index 3 - in sparse index
	assert.True(t, exists, "Key 'd' should exist")
	assert.Equal(t, []byte("value"), val)

	// Verify keys not in sparse index also work
	val, exists = reader.Get("b") // index 1 - not in sparse index
	assert.True(t, exists, "Key 'b' should exist")
	assert.Equal(t, []byte("value"), val)

	val, exists = reader.Get("j") // index 9 - in sparse index
	assert.True(t, exists, "Key 'j' should exist")
	assert.Equal(t, []byte("value"), val)
}

func TestBloomFilter(t *testing.T) {
	mt := main.NewMemTable()
	mt.Put("key1", []byte("value1"))
	mt.Put("key2", []byte("value2"))
	mt.Put("key3", []byte("value3"))

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test.sstable")

	err := mt.FlushToSSTable(filename, 1)
	require.NoError(t, err)

	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err)
	defer reader.Close()

	// Test that existing keys can be retrieved
	val, exists := reader.Get("key1")
	assert.True(t, exists)
	assert.Equal(t, []byte("value1"), val)

	val, exists = reader.Get("key2")
	assert.True(t, exists)
	assert.Equal(t, []byte("value2"), val)

	// Test that non-existent key returns false
	_, exists = reader.Get("nonexistent")
	assert.False(t, exists)
}

func TestConcurrentAccess(t *testing.T) {
	mt := main.NewMemTable()

	// Simulate concurrent writes (though we can't truly test concurrency in a unit test)
	done := make(chan bool, 2)

	go func() {
		for i := 0; i < 100; i++ {
			mt.Put("key1", []byte("value1"))
		}
		done <- true
	}()

	go func() {
		for i := 0; i < 100; i++ {
			mt.Put("key2", []byte("value2"))
		}
		done <- true
	}()

	<-done
	<-done

	// Verify both keys exist
	val, exists := mt.Get("key1")
	assert.True(t, exists)
	assert.Equal(t, []byte("value1"), val)

	val, exists = mt.Get("key2")
	assert.True(t, exists)
	assert.Equal(t, []byte("value2"), val)
}

func TestEmptyMemTable(t *testing.T) {
	mt := main.NewMemTable()

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test.sstable")

	err := mt.FlushToSSTable(filename, 1)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "empty")
}

func TestLargeDataset(t *testing.T) {
	mt := main.NewMemTable()

	// Add 1000 entries
	for i := 0; i < 1000; i++ {
		key := string(rune('a' + (i % 26))) + string(rune('a'+(i/26)%26)) + string(rune('0'+(i%10)))
		value := []byte("value" + string(rune('0'+(i%10))))
		mt.Put(key, value)
	}

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test.sstable")

	err := mt.FlushToSSTable(filename, 10)
	require.NoError(t, err)

	// Verify file exists and is reasonable size
	fileInfo, err := os.Stat(filename)
	require.NoError(t, err)
	assert.Greater(t, fileInfo.Size(), int64(1000)) // Should be at least 1KB

	// Read back and verify random entries
	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err)
	defer reader.Close()

	// Test a few random keys
	for i := 0; i < 10; i++ {
		testIdx := i * 100
		key := string(rune('a'+(testIdx%26))) + string(rune('a'+((testIdx/26)%26))) + string(rune('0'+(testIdx%10)))
		expectedValue := []byte("value" + string(rune('0'+(testIdx%10))))
		
		val, exists := reader.Get(key)
		assert.True(t, exists, "Key %s should exist", key)
		assert.Equal(t, expectedValue, val, "Value for key %s should match", key)
	}
}

func TestBinaryFormatCorrectness(t *testing.T) {
	mt := main.NewMemTable()
	
	// Test with various key/value sizes
	testCases := []struct {
		key   string
		value []byte
	}{
		{"a", []byte("b")},
		{"key", []byte("value")},
		{"verylongkeyname", []byte("verylongvaluename")},
		{"", []byte("emptykey")},
		{"emptyvalue", []byte("")},
		{"unicode", []byte("测试")},
	}

	for _, tc := range testCases {
		mt.Put(tc.key, tc.value)
	}

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test.sstable")

	err := mt.FlushToSSTable(filename, 1)
	require.NoError(t, err)

	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err)
	defer reader.Close()

	entries, err := reader.GetAllEntries()
	require.NoError(t, err)

	for _, tc := range testCases {
		val, exists := entries[tc.key]
		assert.True(t, exists, "Key %s should exist", tc.key)
		assert.Equal(t, tc.value, val, "Value for key %s should match", tc.key)
	}
}

func TestSparseIndexOffsetCorrectness(t *testing.T) {
	mt := main.NewMemTable()
	
	// Add entries with known sizes
	mt.Put("a", []byte("1"))
	mt.Put("b", []byte("22"))
	mt.Put("c", []byte("333"))
	mt.Put("d", []byte("4444"))
	mt.Put("e", []byte("55555"))

	tmpDir := t.TempDir()
	filename := filepath.Join(tmpDir, "test.sstable")

	// Use interval of 2 to create sparse index
	err := mt.FlushToSSTable(filename, 2)
	require.NoError(t, err)

	// Verify all entries can be read correctly
	reader, err := main.NewSSTableReader(filename)
	require.NoError(t, err)
	defer reader.Close()

	entries, err := reader.GetAllEntries()
	require.NoError(t, err)

	assert.Equal(t, 5, len(entries))
	assert.Equal(t, []byte("1"), entries["a"])
	assert.Equal(t, []byte("22"), entries["b"])
	assert.Equal(t, []byte("333"), entries["c"])
	assert.Equal(t, []byte("4444"), entries["d"])
	assert.Equal(t, []byte("55555"), entries["e"])
}
