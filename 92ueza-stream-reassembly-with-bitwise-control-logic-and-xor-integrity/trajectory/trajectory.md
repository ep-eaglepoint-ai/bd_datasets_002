# Development Trajectory

## Task: Stream Reassembly with Bitwise Control Logic and XOR Integrity

### Phase 1: Analysis

**Problem:**
- TCP stream delivers arbitrary byte chunks with no message alignment
- Need a Holding Buffer pattern to buffer, scan, and reassemble frames
- Binary protocol with sync marker (0xFACE), control byte, payload length, payload, XOR checksum
- Mixed-type decoding based on MSB of control byte (Alarm string vs Telemetry floats)

**Frame Format:**
```
[0xFA][0xCE][Control:1][PayloadLength:2 BE][Payload:N][XOR Checksum:1]
```

**Key Challenges:**
1. Message fragmentation across feed() calls
2. Corruption recovery without stalling pipeline
3. Bitwise MSB check for payload type
4. Strict Big-Endian encoding
5. XOR checksum validation
6. Efficient bytearray-based buffering

### Phase 2: Design

**Architecture:**
- `StreamParser` class with internal `bytearray` buffer
- `feed(data)` method appends bytes and parses in a loop
- Loop: find sync -> check header completeness -> check frame completeness -> validate checksum -> decode
- On checksum failure: delete first byte, continue loop (resync)
- Three frame types: `TelemetryFrame`, `AlarmFrame`, `HeartbeatFrame`

**Data Classes:**
- `TelemetryFrame(control, readings: List[float])` - MSB clear
- `AlarmFrame(control, message: str)` - MSB set
- `HeartbeatFrame(control)` - zero-length payload

### Phase 3: Implementation

**Key Code Decisions:**
1. `bytearray` for buffer with `del buffer[:n]` for efficient slicing
2. `struct.unpack_from('>H', ...)` for Big-Endian length
3. `struct.unpack_from('>f', ...)` for Big-Endian floats
4. `control & 0x80` bitmask check (not `== 128`)
5. XOR checksum: `for b in payload: checksum ^= b`
6. On corruption: `del self._buffer[:1]` then continue loop

### Phase 4: Testing

**Test Categories (40 tests):**

1. **Fragmented Reassembly** (5 tests)
   - Header/payload split across chunks
   - Split in middle of payload
   - Single byte at a time
   - Sync marker split across chunks
   - Checksum in separate chunk

2. **Checksum Recovery** (5 tests)
   - Corrupted followed by valid
   - Buffer not cleared on corruption
   - Multiple corrupted before valid
   - No crash on all-corrupt data
   - Valid frame embedded in garbage

3. **Bitwise Control Decode** (7 tests)
   - MSB set = Alarm (0x80, 0x83, 0xFF)
   - MSB clear = Telemetry (0x00, 0x7F, 0x01)
   - Source code uses bitmask not equality

4. **Big-Endian Parsing** (5 tests)
   - Length parsed as >H
   - Float values correct
   - Multiple floats
   - Large payload (100 floats)
   - Source code uses >H and >f

5. **XOR Checksum** (8 tests)
   - Various XOR computations
   - Frame rejection on wrong checksum
   - Frame acceptance on correct checksum
   - Source code uses ^ operator

6. **Buffer Efficiency** (4 tests)
   - Buffer is bytearray
   - Remains bytearray after feed
   - Clears after complete frame
   - Retains incomplete data

7. **Heartbeat** (2 tests)
   - Zero-length payload
   - Zero-length with MSB set

8. **Multiple Frames** (2 tests)
   - Three frames in one feed
   - Mixed valid/corrupt stream

9. **Edge Cases** (6 tests)
   - Empty feed, garbage, sync-only
   - Reset, cumulative get_frames
   - False sync marker in payload

### Phase 5: Verification

**Results:**
- All tests pass on `repository_after`
- Code generation task (no `repository_before`)
- Efficient bytearray buffer with no string/list appending
- All 6 requirements validated including source code inspection tests
