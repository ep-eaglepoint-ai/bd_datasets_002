import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from longest_special_path import longestSpecialPath

def test_example_2():
    edges = [[1,0,3], [0,2,4], [0,3,5]]
    nums = [1, 1, 0, 2]
    expected = [5, 2]
    assert longestSpecialPath(edges, nums) == expected
