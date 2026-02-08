import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from longest_special_path import longestSpecialPath

def test_complex_duplicate_logic():
    edges = [[0,1,1], [1,2,1], [2,3,1], [3,4,1]]
    nums = [1, 2, 1, 2, 3]
    
    assert longestSpecialPath(edges, nums) == [3, 4]

def test_triplet_logic():
    edges = [[0,1,10], [1,2,10]]
    nums = [1, 1, 1]
    
    assert longestSpecialPath(edges, nums) == [10, 2]

def test_interleaved_pairs():
    edges = [[0,1,1], [1,2,1], [2,3,1]]
    nums = [1, 2, 1, 2] 
    assert longestSpecialPath(edges, nums) == [2, 3]
