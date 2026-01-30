import os
import sys
import pytest

# Ensure project root is on sys.path so `repository_after` is importable inside containers
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from repository_after.chrono_sequence import ChronoSequence


def test_class_exists_and_init_accepts_worker_id():
    cs = ChronoSequence(123)
    assert cs.worker_id == 123
    assert isinstance(cs, ChronoSequence)


def test_next_id_exists_and_returns_int():
    cs = ChronoSequence(7)
    assert hasattr(cs, "next_id")
    assert callable(getattr(cs, "next_id"))
    result = cs.next_id()
    assert isinstance(result, int)


def test_initial_state_after_init():
    cs = ChronoSequence(0)
    assert cs.last_timestamp == -1
    assert cs.sequence == 0
