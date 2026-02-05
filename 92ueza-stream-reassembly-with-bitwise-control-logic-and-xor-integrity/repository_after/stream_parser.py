"""
Stream Reassembly Parser with Bitwise Control Logic and XOR Integrity.

Reconstructs framed messages from a continuous, noisy byte stream using
the Holding Buffer pattern. Handles TCP segmentation, corruption recovery,
and mixed-type payload decoding.

Frame Format:
    [0xFA][0xCE][Control:1][PayloadLength:2 BE][Payload:N][XOR Check:1]

Control byte:
    Bit 7 (MSB) set   -> Critical Alarm (payload = ASCII string)
    Bit 7 (MSB) clear -> Centrifuge Telemetry (payload = sequence of >f floats)
"""

import struct
from dataclasses import dataclass, field
from typing import List, Union

SYNC_MARKER = b'\xFA\xCE'
HEADER_SIZE = 5  # 2 sync + 1 control + 2 length


@dataclass
class TelemetryFrame:
    """Centrifuge telemetry: sequence of 32-bit BE floats."""
    control: int
    readings: List[float] = field(default_factory=list)


@dataclass
class AlarmFrame:
    """Critical alarm: ASCII string payload."""
    control: int
    message: str = ""


@dataclass
class HeartbeatFrame:
    """Zero-length payload frame (keepalive)."""
    control: int


FrameType = Union[TelemetryFrame, AlarmFrame, HeartbeatFrame]


def compute_xor_checksum(payload: bytes) -> int:
    """Compute XOR sum over all payload bytes."""
    checksum = 0
    for b in payload:
        checksum ^= b
    return checksum


class StreamParser:
    """
    Stateful stream parser implementing the Holding Buffer pattern.

    Feed arbitrary chunks of bytes via feed(). Completed, validated
    frames are accumulated and returned by get_frames() or directly
    from feed().
    """

    def __init__(self) -> None:
        self._buffer: bytearray = bytearray()
        self._frames: List[FrameType] = []

    def feed(self, data: bytes) -> List[FrameType]:
        """
        Append raw bytes to the internal buffer and parse as many
        complete, valid frames as possible.

        Returns a list of decoded frames extracted during this call.
        """
        self._buffer.extend(data)
        new_frames: List[FrameType] = []

        while True:
            # Find sync marker
            idx = self._buffer.find(SYNC_MARKER)
            if idx == -1:
                # No sync marker; discard everything except possibly
                # a trailing 0xFA that could be start of next marker
                if len(self._buffer) > 0 and self._buffer[-1] == 0xFA:
                    self._buffer = bytearray([0xFA])
                else:
                    self._buffer.clear()
                break

            # Discard any garbage before the sync marker
            if idx > 0:
                del self._buffer[:idx]

            # Need full header (sync + control + length)
            if len(self._buffer) < HEADER_SIZE:
                break

            control = self._buffer[2]
            payload_length = struct.unpack_from('>H', self._buffer, 3)[0]

            # Total frame size: header + payload + 1 checksum byte
            frame_size = HEADER_SIZE + payload_length + 1

            # Wait for more data if frame is incomplete
            if len(self._buffer) < frame_size:
                break

            # Extract payload and checksum
            payload = bytes(self._buffer[HEADER_SIZE:HEADER_SIZE + payload_length])
            received_checksum = self._buffer[HEADER_SIZE + payload_length]

            # Validate XOR checksum
            calculated_checksum = compute_xor_checksum(payload)

            if calculated_checksum != received_checksum:
                # Corruption: skip past the first sync byte, search for next
                del self._buffer[:1]
                continue

            # Valid frame — consume it from buffer
            del self._buffer[:frame_size]

            # Decode based on control byte MSB
            frame = self._decode_frame(control, payload)
            new_frames.append(frame)
            self._frames.append(frame)

        return new_frames

    def _decode_frame(self, control: int, payload: bytes) -> FrameType:
        """Decode a validated frame based on its control byte."""
        if len(payload) == 0:
            return HeartbeatFrame(control=control)

        if control & 0x80:
            # MSB set -> Critical Alarm (ASCII string)
            return AlarmFrame(control=control, message=payload.decode('ascii'))
        else:
            # MSB clear -> Centrifuge Telemetry (sequence of >f floats)
            num_floats = len(payload) // 4
            readings = []
            for i in range(num_floats):
                value = struct.unpack_from('>f', payload, i * 4)[0]
                readings.append(value)
            return TelemetryFrame(control=control, readings=readings)

    def get_frames(self) -> List[FrameType]:
        """Return all frames parsed so far."""
        return list(self._frames)

    def get_buffer_size(self) -> int:
        """Return the current size of the internal buffer."""
        return len(self._buffer)

    def reset(self) -> None:
        """Clear the internal buffer and frame list."""
        self._buffer.clear()
        self._frames.clear()
