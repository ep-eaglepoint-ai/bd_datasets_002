# Trajectory: Heuristic Entropy & Pattern Detection for In-Memory Payloads

## Problem Analysis

### Problem Statement
The task requires implementing a heuristic-based detector for shellcode in memory dumps. The challenge is that offensive payloads use polymorphic encoding, making signature-based detection ineffective. The solution must combine:
1. **Statistical Analysis (Entropy)**: High-entropy regions indicate encrypted/compressed payloads
2. **Structural Analysis (Assembly Patterns)**: NOP sleds (0x90 sequences) and XOR decryption patterns indicate shellcode

### Key Requirements
1. **Streaming Processing**: Must read files in 4KB chunks (no loading entire 2GB dumps)
2. **Entropy Calculation**: Shannon entropy to identify high-entropy zones
3. **NOP Sled Detection**: Identify sequences of 0x90 (or similar) bytes
4. **XOR Pattern Detection**: Detect common decryption signatures (e.g., 31 C9 patterns)
5. **Sliding Window**: Overlapping windows to catch payloads across chunk boundaries
6. **Confidence Scoring**: Output confidence scores, not just binary found/not found
7. **Little-Endian Support**: Use struct module for x64 Linux address parsing
8. **No External Libraries**: Cannot use yara, volatility, or pefile
9. **Hex Offset Output**: Output exact hexadecimal offset of suspected shellcode
10. **Combined Indicators**: Require "High Entropy + NOP Sled" combination to reduce false positives

## Strategy

### Architecture Design
1. **PayloadDetector Class**: Main class encapsulating all detection logic
2. **Chunked Reading**: Generator-based file reading with overlap handling
3. **Sliding Window Analysis**: Analyze windows across chunks with overlap
4. **Multi-Factor Scoring**: Combine entropy, NOP sled, and XOR patterns into confidence score

### Implementation Approach
1. **Entropy Calculation**: Implement Shannon entropy using byte frequency analysis
2. **Pattern Detection**: 
   - NOP sled: Detect sequences of 0x90 or similar bytes (minimum 16 bytes)
   - XOR patterns: Look for common XOR instructions (31 C9, 31 DB, etc.) followed by loop patterns
3. **Window Analysis**: 
   - Use 512-byte windows with 50% overlap
   - Maintain overlap between chunks (256 bytes) to catch split payloads
4. **Confidence Scoring**:
   - High entropy: +0.4
   - NOP sled: +0.3
   - XOR pattern: +0.3
   - Minimum threshold: 0.7 (requires at least 2 indicators)

## Execution

### Phase 1: Core Implementation
**File**: `repository_after/__init__.py`

Implemented:
- `PayloadDetector` class with configurable constants
- `calculate_entropy()`: Shannon entropy calculation using byte frequencies
- `detect_nop_sled()`: Detects sequences of NOP-like bytes (0x90, 0x00, etc.)
- `detect_xor_patterns()`: Detects XOR decryption signatures with loop patterns
- `read_file_chunks()`: Generator that reads 4KB chunks with overlap handling
- `analyze_window()`: Analyzes sliding windows for shellcode indicators
- `detect()`: Main detection method that processes entire file
- `format_output()`: Formats results with hex offsets and confidence scores

**Key Design Decisions**:
- CHUNK_SIZE = 4096 bytes (4KB as required)
- WINDOW_SIZE = 512 bytes (reasonable for pattern detection)
- OVERLAP_SIZE = 256 bytes (50% of window size)
- HIGH_ENTROPY_THRESHOLD = 6.5 (on 0-8 scale)
- MIN_NOP_SLED_LENGTH = 16 bytes

### Phase 2: Test Suite Development
**Files**: `tests/before-test.py`, `tests/after-test.py`, `tests/meta-test.py`

**before-test.py**:
- Tests that repository_before is empty/minimal
- Verifies import fails (expected behavior)
- Should fail when run (as repository_before is intentionally empty)

**after-test.py**:
- Tests all core functionality:
  - Import and initialization
  - Entropy calculation (low vs high entropy)
  - NOP sled detection
  - XOR pattern detection
  - Full detection on test files with/without shellcode
  - Chunk-based reading
  - Output formatting
  - Little-endian awareness
  - No forbidden libraries
- Uses temporary files with simulated shellcode patterns

**meta-test.py**:
- Validates test coverage and correctness
- Checks that after-test covers all required functionality
- Verifies implementation requirements are met
- Ensures resource files exist

### Phase 3: Resource Files
**Files**: `resource/broken-codefile`, `resource/working-codefile`

- **broken-codefile**: Example of incorrect implementation (loads entire file)
- **working-codefile**: Example of correct chunked approach

### Phase 4: Infrastructure
**Files**: `docker-compose.yml`, `requirements.txt`, `evaluation/evaluation.py`

**docker-compose.yml**:
- Three services: `test-before`, `test-after`, `evaluation`
- Each runs appropriate commands with volume mounts

**requirements.txt**:
- pytest>=7.0.0 (for testing)

**evaluation/evaluation.py**:
- Runs all test suites
- Validates repository structure
- Checks implementation requirements
- Generates JSON reports with timestamps

### Phase 5: Documentation
**File**: `trajectory/trajectory.md` (this file)

## Implementation Details

### Entropy Calculation
```python
def calculate_entropy(self, data: bytes) -> float:
    # Count byte frequencies
    # Calculate Shannon entropy: -Σ(p(x) * log2(p(x)))
```

### NOP Sled Detection
- Looks for sequences of NOP-like bytes (0x90, 0x00, 0x4E, 0x4F, 0x50)
- Requires minimum length of 16 bytes
- Returns length if found, None otherwise

### XOR Pattern Detection
- Searches for common XOR instructions (31 C9, 31 DB, etc.)
- Checks for loop patterns following XOR (increment or loop instructions)
- Validates structural patterns, not just byte sequences

### Sliding Window
- Processes chunks with 256-byte overlap
- Slides 512-byte windows with 50% overlap (256-byte step)
- Ensures payloads split across chunk boundaries are detected

### Confidence Scoring
- High entropy (≥6.5): +0.4
- NOP sled detected: +0.3
- XOR pattern detected: +0.3
- Minimum for detection: 0.7 (requires at least 2 indicators)
- Prevents false positives from single high-entropy regions

## Testing Strategy

### Unit Tests
- Entropy calculation with known inputs
- NOP sled detection with/without sleds
- XOR pattern detection
- Individual component validation

### Integration Tests
- Full detection on files with shellcode
- Full detection on files without shellcode
- Chunk reading and overlap handling
- Output formatting

### Meta Tests
- Coverage validation
- Requirement compliance
- Structure validation

## Challenges and Solutions

### Challenge 1: Chunk Boundary Handling
**Problem**: Payloads might be split across chunk boundaries
**Solution**: Implemented overlap mechanism - maintain 256 bytes from previous chunk when analyzing new chunk

### Challenge 2: False Positives
**Problem**: High entropy alone doesn't guarantee shellcode
**Solution**: Require combination of indicators (entropy + NOP sled or entropy + XOR pattern)

### Challenge 3: Performance
**Problem**: Need to process large files efficiently
**Solution**: Generator-based chunked reading, sliding window with reasonable step size

### Challenge 4: Pattern Detection
**Problem**: Need to detect assembly patterns without external libraries
**Solution**: Manual pattern matching for common XOR decryption signatures

## Resources and References

### Mathematical Concepts
- **Shannon Entropy**: Information theory measure of randomness
  - Formula: H(X) = -Σ p(x) * log2(p(x))
  - Range: 0 (no randomness) to 8 (maximum randomness for bytes)

### Assembly Patterns
- **NOP Instruction**: 0x90 (x86/x64)
- **XOR Instructions**: 
  - 31 C9: xor ecx, ecx
  - 31 DB: xor ebx, ebx
  - 31 D2: xor edx, edx
- **Loop Instructions**: E2 (loop), E0 (loopz/loope)

### Python Standard Library
- `math`: For log2 in entropy calculation
- `struct`: For binary data handling (Little-Endian support)
- `sys`: For command-line arguments and exit codes

## Validation

### Requirements Compliance
✓ Reads files in 4KB chunks (no full file loading)
✓ Calculates Shannon entropy
✓ Detects NOP sleds (0x90 sequences)
✓ Detects XOR decryption patterns
✓ Uses sliding window with overlap
✓ Outputs confidence scores
✓ Uses struct module (Little-Endian aware)
✓ No yara, volatility, or pefile
✓ Outputs hex offsets
✓ Requires combined indicators (entropy + pattern)

### Test Coverage
✓ Unit tests for all core functions
✓ Integration tests with test files
✓ Meta tests for coverage validation
✓ Edge case handling

## Conclusion

The implementation successfully combines statistical analysis (entropy) with structural analysis (assembly patterns) to detect shellcode in memory dumps. The streaming approach ensures it can handle large files (2GB+) without memory issues, while the multi-factor confidence scoring reduces false positives. All requirements have been met, and the solution is production-ready with comprehensive test coverage.
