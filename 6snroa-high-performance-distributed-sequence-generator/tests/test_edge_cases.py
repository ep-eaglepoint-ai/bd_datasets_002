import os
import sys
import time

# Ensure project root is on sys.path so `repository_after` is importable inside containers
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from repository_after.chrono_sequence import ChronoSequence, CUSTOM_EPOCH, MAX_SEQUENCE
import pytest


def test_overflow_blocks_and_resets_sequence(monkeypatch):
    cs = ChronoSequence(1)
    t = CUSTOM_EPOCH + 100.0

    calls = {"n": 0}

    def fake_time():
        calls["n"] += 1
        # Return same millisecond for a while, then advance
        if calls["n"] <= MAX_SEQUENCE + 10:
            return t
        return t + 0.002

    monkeypatch.setattr("repository_after.chrono_sequence.time.time", fake_time)

    ids = []
    # generate more than MAX_SEQUENCE ids; implementation should wait and reset
    for i in range(MAX_SEQUENCE + 5):
        ids.append(cs.next_id())

    # all ids unique and strictly increasing
    assert len(ids) == len(set(ids))
    assert all(ids[i] < ids[i + 1] for i in range(len(ids) - 1))

    # sequence should never exceed MAX_SEQUENCE
    assert all((id_ & ((1 << 12) - 1)) <= MAX_SEQUENCE for id_ in ids)


def test_sequence_resets_across_milliseconds(monkeypatch):
    cs = ChronoSequence(2)
    t1 = CUSTOM_EPOCH + 200.0
    t2 = CUSTOM_EPOCH + 200.01

    monkeypatch.setattr("repository_after.chrono_sequence.time.time", lambda: t1)
    id1 = cs.next_id()
    seq1 = id1 & ((1 << 12) - 1)

    monkeypatch.setattr("repository_after.chrono_sequence.time.time", lambda: t2)
    id2 = cs.next_id()
    seq2 = id2 & ((1 << 12) - 1)

    assert id2 > id1
    assert seq2 == 0


def test_worker_id_bounds_enforced():
    with pytest.raises(ValueError):
        ChronoSequence(-1)
    with pytest.raises(ValueError):
        ChronoSequence(1024)
    with pytest.raises(ValueError):
        ChronoSequence(1.5)


def test_clock_rollback_detection(monkeypatch):
    cs = ChronoSequence(3)
    t = CUSTOM_EPOCH + 300.0

    # first call sets timestamp
    monkeypatch.setattr("repository_after.chrono_sequence.time.time", lambda: t)
    cs.next_id()

    # now simulate clock moving backwards
    monkeypatch.setattr("repository_after.chrono_sequence.time.time", lambda: t - 1.0)
    with pytest.raises(SystemError):
        cs.next_id()
