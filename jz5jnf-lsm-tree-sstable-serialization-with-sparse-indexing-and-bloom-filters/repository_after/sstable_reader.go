package repository_after

import (
	"encoding/binary"
	"fmt"
	"io"
	"os"
)

// SSTableReader provides functionality to read and query SSTable files
type SSTableReader struct {
	file              *os.File
	bloomFilterOffset uint64
	sparseIndexOffset uint64
	bloomFilter       *BloomFilter
	sparseIndex       []SparseIndexEntry
}

// NewSSTableReader opens and parses an SSTable file
func NewSSTableReader(filename string) (*SSTableReader, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}

	reader := &SSTableReader{
		file: file,
	}

	// Read footer from the end of the file
	if err := reader.readFooter(); err != nil {
		file.Close()
		return nil, fmt.Errorf("failed to read footer: %w", err)
	}

	// Read Bloom Filter
	if err := reader.readBloomFilter(); err != nil {
		file.Close()
		return nil, fmt.Errorf("failed to read Bloom Filter: %w", err)
	}

	// Read Sparse Index
	if err := reader.readSparseIndex(); err != nil {
		file.Close()
		return nil, fmt.Errorf("failed to read Sparse Index: %w", err)
	}

	return reader, nil
}

// Close closes the file
func (r *SSTableReader) Close() error {
	return r.file.Close()
}

// readFooter reads the footer from the end of the file
func (r *SSTableReader) readFooter() error {
	// Footer is 20 bytes: 8 (BloomFilterOffset) + 8 (SparseIndexOffset) + 4 (MagicNumber)
	footerSize := int64(20)
	
	// Seek to start of footer
	fileInfo, err := r.file.Stat()
	if err != nil {
		return err
	}
	
	_, err = r.file.Seek(fileInfo.Size()-footerSize, io.SeekStart)
	if err != nil {
		return err
	}

	// Read BloomFilterOffset
	if err := binary.Read(r.file, binary.LittleEndian, &r.bloomFilterOffset); err != nil {
		return err
	}

	// Read SparseIndexOffset
	if err := binary.Read(r.file, binary.LittleEndian, &r.sparseIndexOffset); err != nil {
		return err
	}

	// Read and verify MagicNumber
	var magicNumber uint32
	if err := binary.Read(r.file, binary.LittleEndian, &magicNumber); err != nil {
		return err
	}

	if magicNumber != MagicNumber {
		return fmt.Errorf("invalid magic number: expected %x, got %x", MagicNumber, magicNumber)
	}

	return nil
}

// readBloomFilter reads the Bloom Filter from the file
func (r *SSTableReader) readBloomFilter() error {
	// Seek to Bloom Filter offset
	if _, err := r.file.Seek(int64(r.bloomFilterOffset), io.SeekStart); err != nil {
		return err
	}

	// Read size in bits (uint64)
	var sizeInBits uint64
	if err := binary.Read(r.file, binary.LittleEndian, &sizeInBits); err != nil {
		return err
	}

	// Read bitset size in bytes (uint64)
	var bitsetSize uint64
	if err := binary.Read(r.file, binary.LittleEndian, &bitsetSize); err != nil {
		return err
	}

	// Read bitset
	bitset := make([]byte, bitsetSize)
	if _, err := io.ReadFull(r.file, bitset); err != nil {
		return err
	}

	// Create Bloom Filter with the correct size
	r.bloomFilter = &BloomFilter{
		bitset:    bitset,
		size:      sizeInBits,
		numHashes: 3,
	}

	return nil
}

// readSparseIndex reads the Sparse Index from the file
func (r *SSTableReader) readSparseIndex() error {
	// Seek to Sparse Index offset
	if _, err := r.file.Seek(int64(r.sparseIndexOffset), io.SeekStart); err != nil {
		return err
	}

	// Read number of entries
	var numEntries uint32
	if err := binary.Read(r.file, binary.LittleEndian, &numEntries); err != nil {
		return err
	}

	// Read each entry
	r.sparseIndex = make([]SparseIndexEntry, 0, numEntries)
	for i := uint32(0); i < numEntries; i++ {
		var offset uint64
		if err := binary.Read(r.file, binary.LittleEndian, &offset); err != nil {
			return err
		}

		var keyLen uint32
		if err := binary.Read(r.file, binary.LittleEndian, &keyLen); err != nil {
			return err
		}

		keyBytes := make([]byte, keyLen)
		if _, err := io.ReadFull(r.file, keyBytes); err != nil {
			return err
		}

		r.sparseIndex = append(r.sparseIndex, SparseIndexEntry{
			Offset: offset,
			Key:    string(keyBytes),
		})
	}

	return nil
}

// Get retrieves a value by key using the Bloom Filter and Sparse Index
func (r *SSTableReader) Get(key string) ([]byte, bool) {
	keyBytes := []byte(key)

	// First check Bloom Filter (may have false positives, but not false negatives for existing keys)
	// Note: We still check it, but if it returns false, the key definitely doesn't exist
	if r.bloomFilter != nil && !r.bloomFilter.Contains(keyBytes) {
		return nil, false
	}

	// Find the appropriate block using binary search on sparse index
	startOffset := uint64(0)
	endOffset := r.bloomFilterOffset

	if len(r.sparseIndex) > 0 {
		// Binary search to find the block containing the key
		left, right := 0, len(r.sparseIndex)
		for left < right {
			mid := (left + right) / 2
			if r.sparseIndex[mid].Key <= key {
				left = mid + 1
			} else {
				right = mid
			}
		}

		// left-1 is the last index where key >= sparseIndex[i].Key
		if left > 0 {
			startOffset = r.sparseIndex[left-1].Offset
		}
		if left < len(r.sparseIndex) {
			endOffset = r.sparseIndex[left].Offset
		}
	}

	// Linear search within the block
	if _, err := r.file.Seek(int64(startOffset), io.SeekStart); err != nil {
		return nil, false
	}

	for {
		// Check if we've reached the end of the block
		currentPos, err := r.file.Seek(0, io.SeekCurrent)
		if err != nil {
			return nil, false
		}
		if uint64(currentPos) >= endOffset {
			break
		}

		// Read KeyLength
		var keyLen uint32
		if err := binary.Read(r.file, binary.LittleEndian, &keyLen); err != nil {
			if err == io.EOF {
				break
			}
			return nil, false
		}

		// Read Key
		readKey := make([]byte, keyLen)
		if _, err := io.ReadFull(r.file, readKey); err != nil {
			if err == io.EOF {
				break
			}
			return nil, false
		}

		// Read ValueLength
		var valLen uint32
		if err := binary.Read(r.file, binary.LittleEndian, &valLen); err != nil {
			if err == io.EOF {
				break
			}
			return nil, false
		}

		// Check if this is the key we're looking for
		if string(readKey) == key {
			// Read Value
			value := make([]byte, valLen)
			if _, err := io.ReadFull(r.file, value); err != nil {
				return nil, false
			}
			return value, true
		} else {
			// Skip value
			if _, err := r.file.Seek(int64(valLen), io.SeekCurrent); err != nil {
				if err == io.EOF {
					break
				}
				return nil, false
			}
		}
	}

	return nil, false
}

// GetAllEntries reads all entries from the SSTable (for testing)
func (r *SSTableReader) GetAllEntries() (map[string][]byte, error) {
	result := make(map[string][]byte)

	// Seek to start of data
	if _, err := r.file.Seek(0, io.SeekStart); err != nil {
		return nil, err
	}

	currentOffset := uint64(0)
	for currentOffset < r.bloomFilterOffset {
		// Read KeyLength
		var keyLen uint32
		if err := binary.Read(r.file, binary.LittleEndian, &keyLen); err != nil {
			if err == io.EOF {
				break
			}
			return nil, err
		}
		currentOffset += 4

		// Read Key
		key := make([]byte, keyLen)
		if _, err := io.ReadFull(r.file, key); err != nil {
			return nil, err
		}
		currentOffset += uint64(keyLen)

		// Read ValueLength
		var valLen uint32
		if err := binary.Read(r.file, binary.LittleEndian, &valLen); err != nil {
			return nil, err
		}
		currentOffset += 4

		// Read Value
		value := make([]byte, valLen)
		if _, err := io.ReadFull(r.file, value); err != nil {
			return nil, err
		}
		currentOffset += uint64(valLen)

		result[string(key)] = value
	}

	return result, nil
}
