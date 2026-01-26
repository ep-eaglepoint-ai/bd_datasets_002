import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from longest_special_path import longestSpecialPath

def test_single_node():
    edges = []
    nums = [1]
    assert longestSpecialPath(edges, nums) == [0, 1]

def test_linear_tree():
    edges = [[0,1,1], [1,2,1], [2,3,1], [3,4,1]]
    nums = [1, 2, 3, 4, 5]
    assert longestSpecialPath(edges, nums) == [4, 5]

def test_linear_tree_duplicates():
    edges = [[0,1,1], [1,2,1], [2,3,1], [3,4,1]]
    nums = [1, 2, 1, 2, 3]
    assert longestSpecialPath(edges, nums) == [3, 4]

def test_star_topology():
    edges = [[0,1,10], [0,2,10], [0,3,10]]
    nums = [1, 2, 3, 1]
    assert longestSpecialPath(edges, nums) == [10, 2]
