import os
import sys
import pytest

# Ensure project root is on sys.path so `repository_after` is importable inside containers
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import time as _time

from repository_after.chrono_sequence import ChronoSequence, CUSTOM_EPOCH


def test_sequence_increments_within_same_millisecond(monkeypatch):
    cs = ChronoSequence(1)

    # pick a fixed time
    t = CUSTOM_EPOCH + 123.456
    monkeypatch.setattr("repository_after.chrono_sequence.time.time", lambda: t)

    cs.next_id()
    first_seq = cs.sequence
    first_ts = cs.last_timestamp

    # call again with same time -> sequence should increment
    cs.next_id()
    assert cs.last_timestamp == first_ts
    assert cs.sequence == first_seq + 1


def test_sequence_resets_when_timestamp_advances(monkeypatch):
    cs = ChronoSequence(2)

    t1 = CUSTOM_EPOCH + 200.0
    t2 = CUSTOM_EPOCH + 200.01  # slightly later (10 ms)

    monkeypatch.setattr("repository_after.chrono_sequence.time.time", lambda: t1)
    cs.next_id()
    assert cs.sequence == 0
    first_ts = cs.last_timestamp

    # advance time
    monkeypatch.setattr("repository_after.chrono_sequence.time.time", lambda: t2)
    cs.next_id()
    assert cs.last_timestamp > first_ts
    assert cs.sequence == 0
