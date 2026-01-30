import os
import sys
import pytest

# Ensure project root is on sys.path so `repository_after` is importable inside containers
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from repository_after.chrono_sequence import ChronoSequence, CUSTOM_EPOCH


def test_bit_layout_and_fields(monkeypatch):
    worker = 0x12A  # 298, fits in 10 bits
    cs = ChronoSequence(worker)

    # fixed time so timestamp is deterministic
    t = CUSTOM_EPOCH + 500.0
    monkeypatch.setattr("repository_after.chrono_sequence.time.time", lambda: t)

    # first call -> sequence 0
    id1 = cs.next_id()
    # second call same ms -> sequence 1
    id2 = cs.next_id()

    # extract fields
    sequence = id2 & ((1 << 12) - 1)
    worker_id = (id2 >> 12) & ((1 << 10) - 1)
    timestamp = (id2 >> (10 + 12)) & ((1 << 41) - 1)

    expected_ts = int((t - CUSTOM_EPOCH) * 1000)

    assert sequence == 1
    assert worker_id == worker
    assert timestamp == expected_ts

    # top bit must be zero
    assert (id2 >> 63) == 0

    # ensure widths are respected
    assert timestamp < (1 << 41)
    assert worker_id < (1 << 10)
    assert sequence < (1 << 12)
