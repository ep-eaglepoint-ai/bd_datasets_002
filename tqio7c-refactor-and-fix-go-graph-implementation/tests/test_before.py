#!/usr/bin/env python3
import json
import os
import sys
import threading
import time
from pathlib import Path

# Import the before implementation
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'repository_before'))
from graph_implementation import GraphBefore

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

def assert_no_panic_with_timeout(func, timeout_seconds=2):
    result = [None]
    exception = [None]
    
    def run_test():
        try:
            result[0] = func()
        except Exception as e:
            exception[0] = e
    
    thread = threading.Thread(target=run_test)
    thread.daemon = True
    thread.start()
    thread.join(timeout=timeout_seconds)
    
    if thread.is_alive():
        return False, f"test timed out after {timeout_seconds} seconds (likely infinite loop)"
    
    if exception[0]:
        return False, f"exception occurred: {str(exception[0])}"
    
    return True, ""

def run_tests():
    result = TestSuiteResult()
    
    # Test 1: Graph initialization - weights map not initialized
    test_name = "test_graph_initialization_weights_map"
    def test_init():
        g = GraphBefore()
        g.add_edge(1, 2, 5)
    passed, msg = assert_no_panic(test_init)
    result.add_test(test_name, passed, msg)
    
    # Test 2: BFS - nil visited map panic
    test_name = "test_bfs_nil_visited_map"
    def test_bfs_nil():
        g = GraphBefore()
        g.add_edge(0, 1, 1)
        g.bfs(0)
    passed, msg = assert_no_panic(test_bfs_nil)
    result.add_test(test_name, passed, msg)
    
    # Test 3: BFS - infinite loop condition
    test_name = "test_bfs_infinite_loop_condition"
    def test_bfs_infinite():
        g = GraphBefore()
        g.add_edge(0, 1, 1)
        g.add_edge(1, 2, 1)
        g.bfs(0)
    passed, msg = assert_no_panic_with_timeout(test_bfs_infinite, 2)
    result.add_test(test_name, passed, msg)
    
    # Test 4: BFS - out of bounds access
    test_name = "test_bfs_out_of_bounds"
    def test_bfs_bounds():
        g = GraphBefore()
        g.add_edge(0, 1, 1)
        g.bfs(0)
    passed, msg = assert_no_panic(test_bfs_bounds)
    result.add_test(test_name, passed, msg)
    
    # Test 5: BFS - empty graph
    test_name = "test_bfs_empty_graph"
    def test_bfs_empty():
        GraphBefore().bfs(0)
    passed, msg = assert_no_panic(test_bfs_empty)
    result.add_test(test_name, passed, msg)
    
    # Test 6: BFS - disconnected node
    test_name = "test_bfs_disconnected_node"
    def test_bfs_disconnected():
        g = GraphBefore()
        g.add_edge(0, 1, 1)
        g.bfs(5)
    passed, msg = assert_no_panic(test_bfs_disconnected)
    result.add_test(test_name, passed, msg)
    
    # Test 7: DFS - path construction
    test_name = "test_dfs_path_construction"
    g = GraphBefore()
    g.add_edge(0, 1, 1)
    g.add_edge(1, 2, 1)
    passed, msg = assert_no_panic(lambda: g.dfs(0, 2))
    result.add_test(test_name, passed, msg)
    
    # Test 8: DFS - unreachable target
    test_name = "test_dfs_unreachable_target"
    g = GraphBefore()
    g.add_edge(0, 1, 1)
    g.add_edge(2, 3, 1)
    passed, msg = assert_no_panic(lambda: g.dfs(0, 3))
    result.add_test(test_name, passed, msg)
    
    # Test 9: DFS - invalid start node
    test_name = "test_dfs_invalid_start"
    g = GraphBefore()
    g.add_edge(0, 1, 1)
    passed, msg = assert_no_panic(lambda: g.dfs(5, 1))
    result.add_test(test_name, passed, msg)
    
    # Test 10: Shortest Path - visited check logic error
    test_name = "test_shortest_path_visited_logic"
    def test_shortest_path():
        g = GraphBefore()
        g.add_edge(0, 1, 1)
        g.add_edge(1, 2, 1)
        g.find_shortest_path(0, 2)
    passed, msg = assert_no_panic(test_shortest_path)
    result.add_test(test_name, passed, msg)
    
    # Test 11: Shortest Path - unreachable node infinite loop
    test_name = "test_shortest_path_unreachable_infinite_loop"
    def test_shortest_unreachable():
        g = GraphBefore()
        g.add_edge(0, 1, 1)
        g.add_edge(2, 3, 1)
        g.find_shortest_path(0, 3)
    passed, msg = assert_no_panic(test_shortest_unreachable)
    result.add_test(test_name, passed, msg)
    
    # Test 12: Shortest Path - self loop
    test_name = "test_shortest_path_self_loop"
    def test_shortest_self():
        g = GraphBefore()
        g.add_edge(0, 0, 1)
        g.find_shortest_path(0, 0)
    passed, msg = assert_no_panic(test_shortest_self)
    result.add_test(test_name, passed, msg)
    
    # Test 13: AddEdge - nil weights map
    test_name = "test_add_edge_nil_weights"
    def test_add_edge():
        GraphBefore().add_edge(0, 1, 5)
    passed, msg = assert_no_panic(test_add_edge)
    result.add_test(test_name, passed, msg)
    
    # Test 14: BFS - correct traversal order (will fail due to bugs)
    test_name = "test_bfs_correct_traversal"
    def test_bfs():
        g = GraphBefore()
        g.add_edge(0, 1, 1)
        g.add_edge(0, 2, 1)
        g.add_edge(1, 3, 1)
        bfs_result = g.bfs(0)
        expected = [0, 1, 2, 3]
        test_passed, test_msg = assert_equal(expected, bfs_result)
        if not test_passed:
            raise AssertionError(test_msg)
    passed, msg = assert_no_panic_with_timeout(test_bfs, 2)
    result.add_test(test_name, passed, msg)
    
    # Test 15: DFS - correct path finding
    test_name = "test_dfs_correct_path"
    def test_dfs():
        g = GraphBefore()
        g.add_edge(0, 1, 1)
        g.add_edge(1, 2, 1)
        path, found = g.dfs(0, 2)
        if found:
            expected_path = [0, 1, 2]
            test_passed, test_msg = assert_equal(expected_path, path)
            if not test_passed:
                raise AssertionError(test_msg)
        else:
            raise AssertionError("DFS should find path")
    passed, msg = assert_no_panic(test_dfs)
    result.add_test(test_name, passed, msg)
    
    return result

if __name__ == "__main__":
    test_dir = Path(__file__).parent
    output_file = test_dir / "test_before_results.json"
    
    result = run_tests()
    result.write_json(output_file)
    
    if result.success:
        print(f"All tests passed: {result.passed}/{result.total}")
        sys.exit(0)
    else:
        print(f"Some tests failed: {result.passed} passed, {result.failed} failed out of {result.total} total")
        sys.exit(1)
