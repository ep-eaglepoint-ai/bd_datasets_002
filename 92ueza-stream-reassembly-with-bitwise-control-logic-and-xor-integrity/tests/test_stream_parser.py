"""
Test suite for Stream Reassembly with Bitwise Control Logic and XOR Integrity.

Tests validate all 6 requirements:
  1. Message reassembly across fragmented inputs
  2. Checksum failure recovery (advance 1 byte, resync)
  3. Bitwise control byte check (& 0x80) for String vs Float
  4. Big-Endian parsing for length (>H) and floats (>f)
  5. XOR checksum implementation (^= over payload)
  6. Efficient bytearray-based buffer
"""

import struct
import pytest
import inspect
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from stream_parser import (
    StreamParser,
    TelemetryFrame,
    AlarmFrame,
    HeartbeatFrame,
    compute_xor_checksum,
    SYNC_MARKER,
)


# ============================================================================
# Helpers
# ============================================================================

def build_frame(control: int, payload: bytes) -> bytes:
    """Build a complete valid frame."""
    length = struct.pack('>H', len(payload))
    checksum = 0
    for b in payload:
        checksum ^= b
    return SYNC_MARKER + bytes([control]) + length + payload + bytes([checksum])


def build_telemetry_frame(control: int, floats: list) -> bytes:
    """Build a telemetry frame from a list of float values."""
    payload = b''
    for f in floats:
        payload += struct.pack('>f', f)
    return build_frame(control, payload)


def build_alarm_frame(control: int, message: str) -> bytes:
    """Build a critical alarm frame from a string."""
    return build_frame(control, message.encode('ascii'))


# ============================================================================
# Requirement 1: Message reassembly across fragmented inputs
# ============================================================================

class TestFragmentedReassembly:
    """Requirement 1: Split messages across multiple feed() calls."""

    def test_header_in_first_chunk_payload_in_second(self):
        """Header arrives in chunk A, payload + checksum in chunk B."""
        frame = build_telemetry_frame(0x01, [1.0, 2.0])
        parser = StreamParser()

        # Split at the header boundary
        chunk_a = frame[:5]  # sync + control + length
        chunk_b = frame[5:]  # payload + checksum

        result_a = parser.feed(chunk_a)
        assert result_a == [], "No frame should be returned from header-only chunk"

        result_b = parser.feed(chunk_b)
        assert len(result_b) == 1
        assert isinstance(result_b[0], TelemetryFrame)

    def test_split_in_middle_of_payload(self):
        """Frame split in the middle of the payload."""
        frame = build_telemetry_frame(0x02, [10.0, 20.0, 30.0])
        parser = StreamParser()

        mid = len(frame) // 2
        result_a = parser.feed(frame[:mid])
        assert result_a == []

        result_b = parser.feed(frame[mid:])
        assert len(result_b) == 1
        assert isinstance(result_b[0], TelemetryFrame)
        assert len(result_b[0].readings) == 3

    def test_single_byte_at_a_time(self):
        """Feed the entire frame one byte at a time."""
        frame = build_alarm_frame(0x80, "ALERT")
        parser = StreamParser()

        results = []
        for byte in frame:
            results.extend(parser.feed(bytes([byte])))

        assert len(results) == 1
        assert isinstance(results[0], AlarmFrame)
        assert results[0].message == "ALERT"

    def test_sync_marker_split_across_chunks(self):
        """Sync marker 0xFA in chunk A, 0xCE in chunk B."""
        frame = build_telemetry_frame(0x03, [5.0])
        parser = StreamParser()

        result_a = parser.feed(frame[:1])  # Just 0xFA
        assert result_a == []

        result_b = parser.feed(frame[1:])  # 0xCE + rest
        assert len(result_b) == 1

    def test_checksum_byte_in_separate_chunk(self):
        """Everything except the last checksum byte in chunk A."""
        frame = build_telemetry_frame(0x04, [42.0])
        parser = StreamParser()

        result_a = parser.feed(frame[:-1])
        assert result_a == []

        result_b = parser.feed(frame[-1:])
        assert len(result_b) == 1


# ============================================================================
# Requirement 2: Checksum failure recovery
# ============================================================================

class TestChecksumRecovery:
    """Requirement 2: On checksum fail, advance 1 byte and resync."""

    def test_corrupted_frame_followed_by_valid(self):
        """Corrupted frame must be skipped, valid frame after it recovered."""
        # Build a corrupted frame (flip checksum)
        good_payload = b'\x01\x02\x03\x04'
        bad_frame = SYNC_MARKER + b'\x00' + struct.pack('>H', 4) + good_payload + b'\xFF'

        # Valid frame after
        valid_frame = build_alarm_frame(0x81, "OK")

        parser = StreamParser()
        results = parser.feed(bad_frame + valid_frame)

        assert len(results) == 1
        assert isinstance(results[0], AlarmFrame)
        assert results[0].message == "OK"

    def test_corruption_does_not_clear_buffer(self):
        """Buffer must not be cleared on corruption; subsequent data preserved."""
        valid_frame = build_telemetry_frame(0x05, [99.0])

        # Corrupt frame: valid header but wrong checksum
        corrupt = SYNC_MARKER + b'\x00' + struct.pack('>H', 2) + b'\xAA\xBB' + b'\x00'

        parser = StreamParser()
        # Feed corrupt followed by valid, but valid arrives later
        parser.feed(corrupt)
        results = parser.feed(valid_frame)

        assert len(results) == 1
        assert isinstance(results[0], TelemetryFrame)

    def test_multiple_corrupted_frames_before_valid(self):
        """Multiple corrupted frames, parser keeps scanning for valid."""
        corrupt1 = SYNC_MARKER + b'\x00' + struct.pack('>H', 1) + b'\x42' + b'\xFF'
        corrupt2 = SYNC_MARKER + b'\x00' + struct.pack('>H', 1) + b'\x42' + b'\xFE'
        valid = build_alarm_frame(0x82, "FOUND")

        parser = StreamParser()
        results = parser.feed(corrupt1 + corrupt2 + valid)

        assert len(results) == 1
        assert results[0].message == "FOUND"

    def test_no_crash_on_all_corrupt_data(self):
        """Parser must not crash when fed only corrupt data."""
        corrupt = SYNC_MARKER + b'\x00' + struct.pack('>H', 2) + b'\x01\x02' + b'\xFF'

        parser = StreamParser()
        results = parser.feed(corrupt)
        assert results == []

    def test_valid_frame_embedded_in_garbage(self):
        """Valid frame surrounded by garbage bytes must be extracted."""
        garbage_before = bytes([0x00, 0x11, 0x22, 0x33, 0x44])
        valid = build_telemetry_frame(0x06, [3.14])
        garbage_after = bytes([0x55, 0x66, 0x77])

        parser = StreamParser()
        results = parser.feed(garbage_before + valid + garbage_after)

        assert len(results) == 1
        assert isinstance(results[0], TelemetryFrame)


# ============================================================================
# Requirement 3: Bitwise control byte check (& 0x80)
# ============================================================================

class TestBitwiseControlDecode:
    """Requirement 3: Use control_byte & 0x80, not == 128."""

    def test_msb_set_is_alarm(self):
        """Control=0x80 -> Alarm."""
        frame = build_alarm_frame(0x80, "ALARM1")
        parser = StreamParser()
        results = parser.feed(frame)
        assert len(results) == 1
        assert isinstance(results[0], AlarmFrame)
        assert results[0].message == "ALARM1"

    def test_msb_set_with_other_bits(self):
        """Control=0x83 (MSB set + lower bits) -> still Alarm."""
        frame = build_alarm_frame(0x83, "ALARM2")
        parser = StreamParser()
        results = parser.feed(frame)
        assert len(results) == 1
        assert isinstance(results[0], AlarmFrame)
        assert results[0].message == "ALARM2"

    def test_msb_set_0xFF(self):
        """Control=0xFF (all bits set) -> Alarm."""
        frame = build_alarm_frame(0xFF, "MAX")
        parser = StreamParser()
        results = parser.feed(frame)
        assert len(results) == 1
        assert isinstance(results[0], AlarmFrame)

    def test_msb_clear_is_telemetry(self):
        """Control=0x00 -> Telemetry."""
        frame = build_telemetry_frame(0x00, [1.5])
        parser = StreamParser()
        results = parser.feed(frame)
        assert len(results) == 1
        assert isinstance(results[0], TelemetryFrame)

    def test_msb_clear_with_other_bits(self):
        """Control=0x7F (MSB clear, all others set) -> Telemetry."""
        frame = build_telemetry_frame(0x7F, [2.5])
        parser = StreamParser()
        results = parser.feed(frame)
        assert len(results) == 1
        assert isinstance(results[0], TelemetryFrame)

    def test_control_0x01_is_telemetry(self):
        """Control=0x01 -> Telemetry, not Alarm."""
        frame = build_telemetry_frame(0x01, [100.0])
        parser = StreamParser()
        results = parser.feed(frame)
        assert len(results) == 1
        assert isinstance(results[0], TelemetryFrame)

    def test_source_uses_bitmask_not_equality(self):
        """Verify source code uses & 0x80 bitmask, not == 128."""
        src = inspect.getsource(StreamParser)
        assert '& 0x80' in src or '& 128' in src or '& 0x80' in src.replace(' ', ''), \
            "Must use bitwise AND for control byte check"
        assert '== 128' not in src and '== 0x80' not in src, \
            "Must NOT use equality check for control byte"


# ============================================================================
# Requirement 4: Big-Endian parsing for length and floats
# ============================================================================

class TestBigEndianParsing:
    """Requirement 4: Length as >H, floats as >f."""

    def test_length_is_big_endian(self):
        """Payload length 0x0004 must be parsed as 4, not 1024."""
        floats = [1.0]
        frame = build_telemetry_frame(0x10, floats)
        parser = StreamParser()
        results = parser.feed(frame)
        assert len(results) == 1
        assert isinstance(results[0], TelemetryFrame)
        assert len(results[0].readings) == 1

    def test_float_value_big_endian(self):
        """Float 1.0 must be correctly parsed as big-endian."""
        frame = build_telemetry_frame(0x11, [1.0])
        parser = StreamParser()
        results = parser.feed(frame)
        assert abs(results[0].readings[0] - 1.0) < 1e-6

    def test_multiple_floats_big_endian(self):
        """Multiple floats must all be big-endian decoded."""
        values = [0.5, 100.25, -3.14, 0.0]
        frame = build_telemetry_frame(0x12, values)
        parser = StreamParser()
        results = parser.feed(frame)

        assert len(results[0].readings) == 4
        for expected, actual in zip(values, results[0].readings):
            assert abs(expected - actual) < 1e-4, f"Expected {expected}, got {actual}"

    def test_large_payload_length_big_endian(self):
        """Test with payload length requiring both bytes (> 255)."""
        # 100 floats = 400 bytes
        values = [float(i) for i in range(100)]
        frame = build_telemetry_frame(0x13, values)
        parser = StreamParser()
        results = parser.feed(frame)
        assert len(results[0].readings) == 100

    def test_source_uses_big_endian_format(self):
        """Verify source uses >H and >f format strings."""
        src = inspect.getsource(StreamParser)
        assert '>H' in src, "Must use >H for big-endian unsigned short"
        assert '>f' in src, "Must use >f for big-endian float"


# ============================================================================
# Requirement 5: XOR checksum implementation
# ============================================================================

class TestXORChecksum:
    """Requirement 5: XOR sum (^=) over payload."""

    def test_xor_checksum_simple(self):
        """XOR of [0x01, 0x02, 0x03] = 0x00."""
        assert compute_xor_checksum(bytes([0x01, 0x02, 0x03])) == 0x00

    def test_xor_checksum_single_byte(self):
        """XOR of single byte equals that byte."""
        assert compute_xor_checksum(bytes([0x42])) == 0x42

    def test_xor_checksum_empty(self):
        """XOR of empty payload is 0."""
        assert compute_xor_checksum(b'') == 0

    def test_xor_checksum_all_same(self):
        """XOR of even number of same bytes = 0."""
        assert compute_xor_checksum(bytes([0xAA, 0xAA])) == 0

    def test_xor_checksum_all_same_odd(self):
        """XOR of odd number of same bytes = that byte."""
        assert compute_xor_checksum(bytes([0xBB, 0xBB, 0xBB])) == 0xBB

    def test_frame_rejected_on_wrong_checksum(self):
        """Frame with wrong checksum must be rejected."""
        payload = b'HELLO'
        correct_xor = compute_xor_checksum(payload)
        wrong_xor = correct_xor ^ 0xFF

        bad_frame = SYNC_MARKER + b'\x80' + struct.pack('>H', 5) + payload + bytes([wrong_xor])

        parser = StreamParser()
        results = parser.feed(bad_frame)
        assert results == []

    def test_frame_accepted_on_correct_checksum(self):
        """Frame with correct XOR checksum must be accepted."""
        frame = build_alarm_frame(0x80, "VALID")
        parser = StreamParser()
        results = parser.feed(frame)
        assert len(results) == 1
        assert results[0].message == "VALID"

    def test_source_uses_xor_operator(self):
        """Verify source uses ^= or ^ for checksum, not sum() or crc32."""
        src = inspect.getsource(compute_xor_checksum)
        assert '^' in src, "Must use XOR operator"
        # Check that sum() is not used as a builtin call (ignore function name containing 'sum')
        import re
        assert not re.search(r'(?<!\w)sum\s*\(', src), "Must NOT use sum()"
        assert 'crc32' not in src.lower(), "Must NOT use CRC32"


# ============================================================================
# Requirement 6: Efficient bytearray buffer
# ============================================================================

class TestBufferEfficiency:
    """Requirement 6: Buffer uses bytearray, not string/list appending."""

    def test_buffer_is_bytearray(self):
        """Internal buffer must be a bytearray."""
        parser = StreamParser()
        assert isinstance(parser._buffer, bytearray)

    def test_buffer_after_feed_is_bytearray(self):
        """Buffer remains bytearray after feeding data."""
        parser = StreamParser()
        parser.feed(b'\x00\x01\x02')
        assert isinstance(parser._buffer, bytearray)

    def test_buffer_clears_after_complete_frame(self):
        """Buffer should be empty after parsing a complete frame with no leftovers."""
        frame = build_telemetry_frame(0x20, [7.0])
        parser = StreamParser()
        parser.feed(frame)
        assert parser.get_buffer_size() == 0

    def test_buffer_retains_incomplete_data(self):
        """Buffer retains bytes when frame is incomplete."""
        frame = build_telemetry_frame(0x21, [8.0])
        parser = StreamParser()
        parser.feed(frame[:5])  # Only header
        assert parser.get_buffer_size() == 5


# ============================================================================
# Heartbeat frames (zero-length payload)
# ============================================================================

class TestHeartbeat:
    """Zero-length payload produces a HeartbeatFrame."""

    def test_heartbeat_frame(self):
        """Zero-length payload with valid checksum (0x00) -> Heartbeat."""
        frame = build_frame(0x00, b'')
        parser = StreamParser()
        results = parser.feed(frame)
        assert len(results) == 1
        assert isinstance(results[0], HeartbeatFrame)

    def test_heartbeat_with_msb_set(self):
        """Zero-length payload even with MSB set -> Heartbeat."""
        frame = build_frame(0x80, b'')
        parser = StreamParser()
        results = parser.feed(frame)
        assert len(results) == 1
        assert isinstance(results[0], HeartbeatFrame)


# ============================================================================
# Multiple frames in one feed
# ============================================================================

class TestMultipleFrames:
    """Multiple complete frames in a single feed() call."""

    def test_three_frames_in_one_feed(self):
        """Three complete frames in one chunk."""
        f1 = build_telemetry_frame(0x01, [1.0])
        f2 = build_alarm_frame(0x80, "WARN")
        f3 = build_frame(0x00, b'')  # heartbeat

        parser = StreamParser()
        results = parser.feed(f1 + f2 + f3)

        assert len(results) == 3
        assert isinstance(results[0], TelemetryFrame)
        assert isinstance(results[1], AlarmFrame)
        assert isinstance(results[2], HeartbeatFrame)

    def test_mixed_valid_and_corrupt_in_stream(self):
        """Stream with valid, corrupt, valid frames."""
        valid1 = build_telemetry_frame(0x01, [1.0])
        corrupt = SYNC_MARKER + b'\x00' + struct.pack('>H', 2) + b'\xAA\xBB' + b'\x00'
        valid2 = build_alarm_frame(0x85, "AFTER")

        parser = StreamParser()
        results = parser.feed(valid1 + corrupt + valid2)

        assert len(results) == 2
        assert isinstance(results[0], TelemetryFrame)
        assert isinstance(results[1], AlarmFrame)
        assert results[1].message == "AFTER"


# ============================================================================
# Edge cases
# ============================================================================

class TestEdgeCases:
    """Edge cases and robustness."""

    def test_empty_feed(self):
        """Feeding empty bytes produces no frames."""
        parser = StreamParser()
        results = parser.feed(b'')
        assert results == []

    def test_only_garbage(self):
        """Pure garbage produces no frames."""
        parser = StreamParser()
        results = parser.feed(bytes(range(256)))
        assert results == []

    def test_only_sync_marker(self):
        """Just the sync marker, no more data."""
        parser = StreamParser()
        results = parser.feed(SYNC_MARKER)
        assert results == []
        assert parser.get_buffer_size() == 2

    def test_reset_clears_state(self):
        """reset() clears buffer and frame history."""
        parser = StreamParser()
        parser.feed(build_telemetry_frame(0x00, [1.0]))
        assert len(parser.get_frames()) == 1

        parser.reset()
        assert len(parser.get_frames()) == 0
        assert parser.get_buffer_size() == 0

    def test_get_frames_returns_all_parsed(self):
        """get_frames() returns cumulative results."""
        parser = StreamParser()
        parser.feed(build_telemetry_frame(0x01, [1.0]))
        parser.feed(build_alarm_frame(0x80, "TWO"))

        frames = parser.get_frames()
        assert len(frames) == 2

    def test_false_sync_in_payload(self):
        """Payload containing 0xFA 0xCE must not confuse the parser."""
        # Payload that happens to contain the sync marker bytes
        payload = b'\xFA\xCE\x01\x02'
        frame = build_frame(0x00, payload)
        parser = StreamParser()
        results = parser.feed(frame)

        assert len(results) == 1
        assert isinstance(results[0], TelemetryFrame)
