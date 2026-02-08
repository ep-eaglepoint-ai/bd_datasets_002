import os
import sys
import time

# Ensure project root is on sys.path so `repository_after` is importable inside containers
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from repository_after.chrono_sequence import ChronoSequence


def test_ids_strictly_increasing_and_unique():
    cs = ChronoSequence(1)
    ids = []
    for _ in range(1000):
        ids.append(cs.next_id())

    assert len(ids) == len(set(ids))
    assert all(ids[i] < ids[i + 1] for i in range(len(ids) - 1))


def test_later_ids_are_larger():
    cs = ChronoSequence(2)
    first = cs.next_id()
    time.sleep(0.01)
    later = cs.next_id()
    assert later > first
