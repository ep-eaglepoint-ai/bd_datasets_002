#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

# Import the after implementation
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'repository_after'))
from graph_implementation import GraphAfter

class TestSuiteResult:
    def __init__(self):
        self.tests = []
        self.passed = 0
        self.failed = 0
        self.total = 0
        self.success = True
    
    def add_test(self, name, passed, message=""):
        self.tests.append({
            "name": name,
            "passed": passed,
            "message": message if message else None
        })
        self.total += 1
        if passed:
            self.passed += 1
        else:
            self.failed += 1
            self.success = False
    
    def write_json(self, filename):
        data = {
            "tests": self.tests,
            "passed": self.passed,
            "failed": self.failed,
            "total": self.total,
            "success": self.success
        }
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)

def assert_equal(expected, actual):
    if expected != actual:
        return False, f"expected {expected}, got {actual}"
    return True, ""

def assert_no_panic(func):
    try:
        func()
        return True, ""
    except Exception as e:
        return False, f"exception occurred: {str(e)}"

def run_tests():
    result = TestSuiteResult()
    
    # Test 1: Graph initialization - weights map initialized
    test_name = "test_graph_initialization_weights_map"
    def test_init():
        g = GraphAfter()
        g.add_edge(1, 2, 5)
    passed, msg = assert_no_panic(test_init)
    result.add_test(test_name, passed, msg)
    
    # Test 2: BFS - visited map initialized
    test_name = "test_bfs_nil_visited_map"
    def test_bfs():
        g = GraphAfter()
        g.add_edge(0, 1, 1)
        g.bfs(0)
    passed, msg = assert_no_panic(test_bfs)
    result.add_test(test_name, passed, msg)
    
    # Test 3: BFS - correct loop condition
    test_name = "test_bfs_infinite_loop_condition"
    def test_bfs_loop():
        g = GraphAfter()
        g.add_edge(0, 1, 1)
        g.add_edge(1, 2, 1)
        g.bfs(0)
    passed, msg = assert_no_panic(test_bfs_loop)
    result.add_test(test_name, passed, msg)
    
    # Test 4: BFS - correct bounds checking
    test_name = "test_bfs_out_of_bounds"
    def test_bfs_bounds():
        g = GraphAfter()
        g.add_edge(0, 1, 1)
        g.bfs(0)
    passed, msg = assert_no_panic(test_bfs_bounds)
    result.add_test(test_name, passed, msg)
    
    # Test 5: BFS - empty graph
    test_name = "test_bfs_empty_graph"
    def test_bfs_empty():
        g = GraphAfter()
        bfs_result = g.bfs(0)
        if len(bfs_result) != 0:
            raise AssertionError("expected empty result for empty graph")
    passed, msg = assert_no_panic(test_bfs_empty)
    result.add_test(test_name, passed, msg)
    
    # Test 6: BFS - disconnected node
    test_name = "test_bfs_disconnected_node"
    def test_bfs_disconnected():
        g = GraphAfter()
        g.add_edge(0, 1, 1)
        bfs_result = g.bfs(5)
        if len(bfs_result) != 0:
            raise AssertionError("expected empty result for disconnected node")
    passed, msg = assert_no_panic(test_bfs_disconnected)
    result.add_test(test_name, passed, msg)
    
    # Test 7: DFS - path construction
    test_name = "test_dfs_path_construction"
    def test_dfs():
        g = GraphAfter()
        g.add_edge(0, 1, 1)
        g.add_edge(1, 2, 1)
        g.dfs(0, 2)
    passed, msg = assert_no_panic(test_dfs)
    result.add_test(test_name, passed, msg)
    
    # Test 8: DFS - unreachable target
    test_name = "test_dfs_unreachable_target"
    def test_dfs_unreachable():
        g = GraphAfter()
        g.add_edge(0, 1, 1)
        g.add_edge(2, 3, 1)
        path, found = g.dfs(0, 3)
        if found or path is not None:
            raise AssertionError("expected no path for unreachable target")
    passed, msg = assert_no_panic(test_dfs_unreachable)
    result.add_test(test_name, passed, msg)
    
    # Test 9: DFS - invalid start node
    test_name = "test_dfs_invalid_start"
    def test_dfs_invalid():
        g = GraphAfter()
        g.add_edge(0, 1, 1)
        path, found = g.dfs(5, 1)
        if found or path is not None:
            raise AssertionError("expected no path for invalid start")
    passed, msg = assert_no_panic(test_dfs_invalid)
    result.add_test(test_name, passed, msg)
    
    # Test 10: Shortest Path - correct visited logic
    test_name = "test_shortest_path_visited_logic"
    def test_shortest_path():
        g = GraphAfter()
        g.add_edge(0, 1, 1)
        g.add_edge(1, 2, 1)
        path = g.find_shortest_path(0, 2)
        expected = [0, 1, 2]
        test_passed, test_msg = assert_equal(expected, path)
        if not test_passed:
            raise AssertionError(test_msg)
    passed, msg = assert_no_panic(test_shortest_path)
    result.add_test(test_name, passed, msg)
    
    # Test 11: Shortest Path - unreachable node
    test_name = "test_shortest_path_unreachable_infinite_loop"
    def test_shortest_unreachable():
        g = GraphAfter()
        g.add_edge(0, 1, 1)
        g.add_edge(2, 3, 1)
        path = g.find_shortest_path(0, 3)
        if len(path) != 0:
            raise AssertionError("expected empty path for unreachable node")
    passed, msg = assert_no_panic(test_shortest_unreachable)
    result.add_test(test_name, passed, msg)
    
    # Test 12: Shortest Path - self loop
    test_name = "test_shortest_path_self_loop"
    def test_shortest_self():
        g = GraphAfter()
        g.add_edge(0, 0, 1)
        path = g.find_shortest_path(0, 0)
        expected = [0]
        test_passed, test_msg = assert_equal(expected, path)
        if not test_passed:
            raise AssertionError(test_msg)
    passed, msg = assert_no_panic(test_shortest_self)
    result.add_test(test_name, passed, msg)
    
    # Test 13: AddEdge - nil safety
    test_name = "test_add_edge_nil_weights"
    def test_add_edge():
        GraphAfter().add_edge(0, 1, 5)
    passed, msg = assert_no_panic(test_add_edge)
    result.add_test(test_name, passed, msg)
    
    # Test 14: BFS - correct traversal order
    test_name = "test_bfs_correct_traversal"
    g = GraphAfter()
    g.add_edge(0, 1, 1)
    g.add_edge(0, 2, 1)
    g.add_edge(1, 3, 1)
    bfs_result = g.bfs(0)
    expected = [0, 1, 2, 3]
    passed, msg = assert_equal(expected, bfs_result)
    result.add_test(test_name, passed, msg)
    
    # Test 15: DFS - correct path finding
    test_name = "test_dfs_correct_path"
    g2 = GraphAfter()
    g2.add_edge(0, 1, 1)
    g2.add_edge(1, 2, 1)
    path, found = g2.dfs(0, 2)
    if found:
        expected_path = [0, 1, 2]
        passed, msg = assert_equal(expected_path, path)
    else:
        passed, msg = False, "DFS should find path"
    result.add_test(test_name, passed, msg)
    
    # Test 16: Shortest Path - multiple paths
    test_name = "test_shortest_path_multiple_paths"
    g3 = GraphAfter()
    g3.add_edge(0, 1, 1)
    g3.add_edge(0, 2, 1)
    g3.add_edge(1, 3, 1)
    g3.add_edge(2, 3, 1)
    path = g3.find_shortest_path(0, 3)
    if len(path) != 3:
        passed, msg = False, f"expected path length 3, got {len(path)}"
    else:
        passed, msg = True, ""
    result.add_test(test_name, passed, msg)
    
    # Test 17: Duplicate edges
    test_name = "test_duplicate_edges"
    def test_duplicate():
        g = GraphAfter()
        g.add_edge(0, 1, 5)
        g.add_edge(0, 1, 10)
        g.bfs(0)
    passed, msg = assert_no_panic(test_duplicate)
    result.add_test(test_name, passed, msg)
    
    return result

if __name__ == "__main__":
    test_dir = Path(__file__).parent
    output_file = test_dir / "test_after_results.json"
    
    result = run_tests()
    result.write_json(output_file)
    
    if result.success:
        print(f"All tests passed: {result.passed}/{result.total}")
        sys.exit(0)
    else:
        print(f"Some tests failed: {result.passed} passed, {result.failed} failed out of {result.total} total")
        sys.exit(1)
