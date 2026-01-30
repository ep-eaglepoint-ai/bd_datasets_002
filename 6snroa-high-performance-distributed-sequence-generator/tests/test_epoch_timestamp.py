import os
import sys
import time
import pytest

# Ensure project root is on sys.path so `repository_after` is importable inside containers
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from repository_after.chrono_sequence import ChronoSequence


def test_timestamp_is_int_and_non_negative():
    cs = ChronoSequence(1)
    cs.next_id()
    assert isinstance(cs.last_timestamp, int)
    assert cs.last_timestamp >= 0


def test_timestamp_increases_between_calls():
    cs = ChronoSequence(2)
    cs.next_id()
    first = cs.last_timestamp
    time.sleep(0.05)
    cs.next_id()
    second = cs.last_timestamp
    assert second > first
