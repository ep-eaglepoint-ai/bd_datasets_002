import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from longest_special_path import longestSpecialPath

def test_example_1():
    edges = [[0,1,1], [1,2,3], [1,3,1], [2,4,6], [4,7,2], [3,5,2], [3,6,5], [6,8,3]]
    nums = [1, 1, 0, 3, 1, 2, 1, 1, 0]
    expected = [9, 3]
    assert longestSpecialPath(edges, nums) == expected
