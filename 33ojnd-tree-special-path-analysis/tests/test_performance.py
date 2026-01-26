import sys
import os
import time
import pytest

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from longest_special_path import longestSpecialPath

def test_performance_large_linear():
    N = 50000
    edges = [[i, i+1, 1] for i in range(N-1)]
    nums = [i % 2 for i in range(N)]
    
    start_time = time.time()
    res = longestSpecialPath(edges, nums)
    end_time = time.time()
    
    assert res == [2, 3] 
    assert end_time - start_time < 3.0, "Execution took too long"

def test_performance_deep_distinct():
    N = 50000
    edges = [[i, i+1, 1] for i in range(N-1)]
    nums = list(range(N))
    
    start_time = time.time()
    res = longestSpecialPath(edges, nums)
    end_time = time.time()
    
    assert res == [N-1, N]
    assert end_time - start_time < 3.0

def test_performance_star():
    N = 50000
    edges = [[0, i, 100] for i in range(1, N)]
    nums = list(range(N)) 
    
    start_time = time.time()
    res = longestSpecialPath(edges, nums)
    end_time = time.time()
    
    assert res == [100, 2]
    assert end_time - start_time < 3.0
