package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"time"
)

// Import the before implementation
// We'll need to copy it or use a build tag approach
// For simplicity, we'll test it directly by importing

type TestResult struct {
	Name    string `json:"name"`
	Passed  bool   `json:"passed"`
	Message string `json:"message,omitempty"`
}

type TestSuiteResult struct {
	Tests  []TestResult `json:"tests"`
	Passed int          `json:"passed"`
	Failed int          `json:"failed"`
	Total  int          `json:"total"`
	Success bool        `json:"success"`
}

func NewTestSuiteResult() *TestSuiteResult {
	return &TestSuiteResult{
		Tests:   []TestResult{},
		Passed:  0,
		Failed:  0,
		Total:   0,
		Success: true,
	}
}

func (tsr *TestSuiteResult) AddTest(name string, passed bool, message string) {
	tsr.Tests = append(tsr.Tests, TestResult{
		Name:    name,
		Passed:  passed,
		Message: message,
	})
	tsr.Total++
	if passed {
		tsr.Passed++
	} else {
		tsr.Failed++
		tsr.Success = false
	}
}

func (tsr *TestSuiteResult) WriteJSON(filename string) error {
	data, err := json.MarshalIndent(tsr, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filename, data, 0644)
}

func assertEqual(expected, actual interface{}) (bool, string) {
	if !reflect.DeepEqual(expected, actual) {
		return false, fmt.Sprintf("expected %v, got %v", expected, actual)
	}
	return true, ""
}

func assertNoPanic(fn func()) (bool, string) {
	panicked := false
	var panicMsg interface{}
	defer func() {
		if r := recover(); r != nil {
			panicked = true
			panicMsg = r
		}
	}()
	fn()
	if panicked {
		return false, fmt.Sprintf("panic occurred: %v", panicMsg)
	}
	return true, ""
}

func assertNoPanicWithTimeout(fn func(), timeout time.Duration) (bool, string) {
	done := make(chan bool, 1)
	var panicked bool
	var panicMsg interface{}
	
	go func() {
		defer func() {
			if r := recover(); r != nil {
				panicked = true
				panicMsg = r
			}
			done <- true
		}()
		fn()
	}()
	
	select {
	case <-done:
		if panicked {
			return false, fmt.Sprintf("panic occurred: %v", panicMsg)
		}
		return true, ""
	case <-time.After(timeout):
		return false, fmt.Sprintf("test timed out after %v (likely infinite loop)", timeout)
	}
}

// Graph implementation from before (with bugs)
type GraphBefore struct {
	nodes   map[int][]int
	weights map[string]int
}

func NewGraphBefore() *GraphBefore {
	return &GraphBefore{
		nodes: make(map[int][]int),
	}
}

func (g *GraphBefore) AddEdge(from, to, weight int) {
	g.nodes[from] = append(g.nodes[from], to)
	key := fmt.Sprintf("%d-%d", from, to)
	g.weights[key] = weight
}

func (g *GraphBefore) BFS(start int) []int {
	var visited map[int]bool
	var result []int
	queue := []int{start}
	
	for len(queue) >= 0 {
		current := queue[0]
		queue = queue[1:]
		
		if visited[current] {
			continue
		}
		result = append(result, current)
		
		for i := 0; i <= len(g.nodes[current]); i++ {
			neighbor := g.nodes[current][i]
			if !visited[neighbor] {
				queue = append(queue, neighbor)
			}
		}
	}
	return result
}

func (g *GraphBefore) DFS(start int, target int) ([]int, bool) {
	visited := make(map[int]bool)
	path := []int{}
	return g.dfsHelper(start, target, visited, path)
}

func (g *GraphBefore) dfsHelper(current, target int, visited map[int]bool, path []int) ([]int, bool) {
	visited[current] = true
	path = append(path, current)

	if current == target {
		return path, true
	}

	neighbors := g.nodes[current]
	for i := 0; i < len(neighbors); i++ {
		next := neighbors[i]
		if !visited[next] {
			resultPath, found := g.dfsHelper(next, target, visited, path)
			if found {
				return resultPath, true
			}
		}
	}
	return nil, false
}

func (g *GraphBefore) FindShortestPath(start, end int) []int {
	visited := make(map[int]bool)
	parent := make(map[int]int)
	queue := []int{start}
	visited[start] = true
	
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		
		if current == end {
			break
		}
		
		for _, neighbor := range g.nodes[current] {
			if visited[neighbor] {
				parent[neighbor] = current
				visited[neighbor] = true
				queue = append(queue, neighbor)
			}
		}
	}
	
	path := []int{}
	for node := end; node != start; node = parent[node] {
		path = append([]int{node}, path...)
	}
	path = append([]int{start}, path...)
	return path
}

func runTests() *TestSuiteResult {
	result := NewTestSuiteResult()

	// Test 1: Graph initialization - weights map not initialized
	testName := "test_graph_initialization_weights_map"
	passed, msg := assertNoPanic(func() {
		g := NewGraphBefore()
		g.AddEdge(1, 2, 5)
	})
	result.AddTest(testName, passed, msg)

	// Test 2: BFS - nil visited map panic
	testName = "test_bfs_nil_visited_map"
	passed, msg = assertNoPanic(func() {
		g := NewGraphBefore()
		g.AddEdge(0, 1, 1)
		g.BFS(0)
	})
	result.AddTest(testName, passed, msg)

	// Test 3: BFS - infinite loop condition
	testName = "test_bfs_infinite_loop_condition"
	passed, msg = assertNoPanicWithTimeout(func() {
		g := NewGraphBefore()
		g.AddEdge(0, 1, 1)
		g.AddEdge(1, 2, 1)
		bfsResult := g.BFS(0)
		_ = bfsResult
	}, 2*time.Second)
	result.AddTest(testName, passed, msg)

	// Test 4: BFS - out of bounds access
	testName = "test_bfs_out_of_bounds"
	passed, msg = assertNoPanic(func() {
		g := NewGraphBefore()
		g.AddEdge(0, 1, 1)
		g.BFS(0)
	})
	result.AddTest(testName, passed, msg)

	// Test 5: BFS - empty graph
	testName = "test_bfs_empty_graph"
	passed, msg = assertNoPanic(func() {
		g := NewGraphBefore()
		g.BFS(0)
	})
	result.AddTest(testName, passed, msg)

	// Test 6: BFS - disconnected node
	testName = "test_bfs_disconnected_node"
	passed, msg = assertNoPanic(func() {
		g := NewGraphBefore()
		g.AddEdge(0, 1, 1)
		g.BFS(5)
	})
	result.AddTest(testName, passed, msg)

	// Test 7: DFS - path construction
	testName = "test_dfs_path_construction"
	passed, msg = assertNoPanic(func() {
		g := NewGraphBefore()
		g.AddEdge(0, 1, 1)
		g.AddEdge(1, 2, 1)
		_, _ = g.DFS(0, 2)
	})
	result.AddTest(testName, passed, msg)

	// Test 8: DFS - unreachable target
	testName = "test_dfs_unreachable_target"
	passed, msg = assertNoPanic(func() {
		g := NewGraphBefore()
		g.AddEdge(0, 1, 1)
		g.AddEdge(2, 3, 1)
		_, _ = g.DFS(0, 3)
	})
	result.AddTest(testName, passed, msg)

	// Test 9: DFS - invalid start node
	testName = "test_dfs_invalid_start"
	passed, msg = assertNoPanic(func() {
		g := NewGraphBefore()
		g.AddEdge(0, 1, 1)
		_, _ = g.DFS(5, 1)
	})
	result.AddTest(testName, passed, msg)

	// Test 10: Shortest Path - visited check logic error
	testName = "test_shortest_path_visited_logic"
	passed, msg = assertNoPanic(func() {
		g := NewGraphBefore()
		g.AddEdge(0, 1, 1)
		g.AddEdge(1, 2, 1)
		_ = g.FindShortestPath(0, 2)
	})
	result.AddTest(testName, passed, msg)

	// Test 11: Shortest Path - unreachable node infinite loop
	testName = "test_shortest_path_unreachable_infinite_loop"
	passed, msg = assertNoPanic(func() {
		g := NewGraphBefore()
		g.AddEdge(0, 1, 1)
		g.AddEdge(2, 3, 1)
		_ = g.FindShortestPath(0, 3)
	})
	result.AddTest(testName, passed, msg)

	// Test 12: Shortest Path - self loop
	testName = "test_shortest_path_self_loop"
	passed, msg = assertNoPanic(func() {
		g := NewGraphBefore()
		g.AddEdge(0, 0, 1)
		_ = g.FindShortestPath(0, 0)
	})
	result.AddTest(testName, passed, msg)

	// Test 13: AddEdge - nil weights map
	testName = "test_add_edge_nil_weights"
	passed, msg = assertNoPanic(func() {
		g := NewGraphBefore()
		g.AddEdge(0, 1, 5)
	})
	result.AddTest(testName, passed, msg)

	// Test 14: BFS - correct traversal order (will fail due to bugs)
	testName = "test_bfs_correct_traversal"
	passed, msg = assertNoPanicWithTimeout(func() {
		g := NewGraphBefore()
		g.AddEdge(0, 1, 1)
		g.AddEdge(0, 2, 1)
		g.AddEdge(1, 3, 1)
		bfsResult := g.BFS(0)
		expected := []int{0, 1, 2, 3}
		testPassed, testMsg := assertEqual(expected, bfsResult)
		if !testPassed {
			panic(testMsg)
		}
	}, 2*time.Second)
	result.AddTest(testName, passed, msg)

	// Test 15: DFS - correct path finding
	testName = "test_dfs_correct_path"
	passed, msg = assertNoPanic(func() {
		g2 := NewGraphBefore()
		g2.AddEdge(0, 1, 1)
		g2.AddEdge(1, 2, 1)
		path, found := g2.DFS(0, 2)
		if found {
			expectedPath := []int{0, 1, 2}
			testPassed, testMsg := assertEqual(expectedPath, path)
			if !testPassed {
				panic(testMsg)
			}
		} else {
			panic("DFS should find path")
		}
	})
	result.AddTest(testName, passed, msg)

	return result
}

func main() {
	_, filename, _, _ := runtime.Caller(0)
	testDir := filepath.Dir(filename)
	outputFile := filepath.Join(testDir, "test_before_results.json")

	result := runTests()
	if err := result.WriteJSON(outputFile); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing results: %v\n", err)
		os.Exit(1)
	}

	if result.Success {
		fmt.Printf("All tests passed: %d/%d\n", result.Passed, result.Total)
		os.Exit(0)
	} else {
		fmt.Printf("Some tests failed: %d passed, %d failed out of %d total\n", result.Passed, result.Failed, result.Total)
		os.Exit(1)
	}
}
