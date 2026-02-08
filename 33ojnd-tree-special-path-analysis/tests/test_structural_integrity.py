import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from longest_special_path import longestSpecialPath

def test_rooted_at_zero():
    edges = [[1, 0, 10], [2, 0, 5]]
    nums = [1, 2, 3]
    assert longestSpecialPath(edges, nums) == [10, 2]

def test_siblings_invalid():
    edges = [[0,1,1], [0,2,1]]
    nums = [1, 2, 3]
    assert longestSpecialPath(edges, nums) == [1, 2]

def test_root_is_duplicate():
    edges = [[0,1,10], [1,2,10]]
    nums = [1, 1, 2]
    assert longestSpecialPath(edges, nums) == [20, 3]
