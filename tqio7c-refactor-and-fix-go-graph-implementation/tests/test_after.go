package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
)

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

// Graph implementation from after (fixed)
type EdgeKey struct {
	From int
	To   int
}

type GraphAfter struct {
	nodes   map[int][]int
	weights map[EdgeKey]int
}

func NewGraphAfter() *GraphAfter {
	return &GraphAfter{
		nodes:   make(map[int][]int),
		weights: make(map[EdgeKey]int),
	}
}

func (g *GraphAfter) AddEdge(from, to, weight int) {
	if g.nodes == nil {
		g.nodes = make(map[int][]int)
	}
	if g.weights == nil {
		g.weights = make(map[EdgeKey]int)
	}

	key := EdgeKey{From: from, To: to}
	g.nodes[from] = append(g.nodes[from], to)
	g.weights[key] = weight
}

func (g *GraphAfter) BFS(start int) []int {
	if g.nodes == nil {
		return []int{}
	}

	if _, exists := g.nodes[start]; !exists {
		return []int{}
	}

	visited := make(map[int]bool)
	var result []int
	queue := []int{start}
	visited[start] = true

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]

		result = append(result, current)

		neighbors, exists := g.nodes[current]
		if !exists {
			continue
		}

		for i := 0; i < len(neighbors); i++ {
			neighbor := neighbors[i]
			if !visited[neighbor] {
				visited[neighbor] = true
				queue = append(queue, neighbor)
			}
		}
	}

	return result
}

func (g *GraphAfter) DFS(start int, target int) ([]int, bool) {
	if g.nodes == nil {
		return nil, false
	}

	if _, exists := g.nodes[start]; !exists {
		return nil, false
	}

	visited := make(map[int]bool)
	path := []int{}
	return g.dfsHelper(start, target, visited, path)
}

func (g *GraphAfter) dfsHelper(current, target int, visited map[int]bool, path []int) ([]int, bool) {
	visited[current] = true
	path = append(path, current)

	if current == target {
		result := make([]int, len(path))
		copy(result, path)
		return result, true
	}

	neighbors, exists := g.nodes[current]
	if !exists {
		return nil, false
	}

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

func (g *GraphAfter) FindShortestPath(start, end int) []int {
	if g.nodes == nil {
		return []int{}
	}

	if _, exists := g.nodes[start]; !exists {
		return []int{}
	}

	if start == end {
		return []int{start}
	}

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

		neighbors, exists := g.nodes[current]
		if !exists {
			continue
		}

		for _, neighbor := range neighbors {
			if !visited[neighbor] {
				visited[neighbor] = true
				parent[neighbor] = current
				queue = append(queue, neighbor)
			}
		}
	}

	if !visited[end] {
		return []int{}
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

	// Test 1: Graph initialization - weights map initialized
	testName := "test_graph_initialization_weights_map"
	passed, msg := assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(1, 2, 5)
	})
	result.AddTest(testName, passed, msg)

	// Test 2: BFS - visited map initialized
	testName = "test_bfs_nil_visited_map"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(0, 1, 1)
		g.BFS(0)
	})
	result.AddTest(testName, passed, msg)

	// Test 3: BFS - correct loop condition
	testName = "test_bfs_infinite_loop_condition"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(0, 1, 1)
		g.AddEdge(1, 2, 1)
		bfsResult := g.BFS(0)
		_ = bfsResult
	})
	result.AddTest(testName, passed, msg)

	// Test 4: BFS - correct bounds checking
	testName = "test_bfs_out_of_bounds"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(0, 1, 1)
		g.BFS(0)
	})
	result.AddTest(testName, passed, msg)

	// Test 5: BFS - empty graph
	testName = "test_bfs_empty_graph"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		bfsResult := g.BFS(0)
		if len(bfsResult) != 0 {
			passed = false
			msg = "expected empty result for empty graph"
		}
	})
	result.AddTest(testName, passed, msg)

	// Test 6: BFS - disconnected node
	testName = "test_bfs_disconnected_node"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(0, 1, 1)
		bfsResult := g.BFS(5)
		if len(bfsResult) != 0 {
			passed = false
			msg = "expected empty result for disconnected node"
		}
	})
	result.AddTest(testName, passed, msg)

	// Test 7: DFS - path construction
	testName = "test_dfs_path_construction"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(0, 1, 1)
		g.AddEdge(1, 2, 1)
		_, _ = g.DFS(0, 2)
	})
	result.AddTest(testName, passed, msg)

	// Test 8: DFS - unreachable target
	testName = "test_dfs_unreachable_target"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(0, 1, 1)
		g.AddEdge(2, 3, 1)
		path, found := g.DFS(0, 3)
		if found || path != nil {
			passed = false
			msg = "expected no path for unreachable target"
		}
	})
	result.AddTest(testName, passed, msg)

	// Test 9: DFS - invalid start node
	testName = "test_dfs_invalid_start"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(0, 1, 1)
		path, found := g.DFS(5, 1)
		if found || path != nil {
			passed = false
			msg = "expected no path for invalid start"
		}
	})
	result.AddTest(testName, passed, msg)

	// Test 10: Shortest Path - correct visited logic
	testName = "test_shortest_path_visited_logic"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(0, 1, 1)
		g.AddEdge(1, 2, 1)
		path := g.FindShortestPath(0, 2)
		expected := []int{0, 1, 2}
		passed, msg = assertEqual(expected, path)
	})
	result.AddTest(testName, passed, msg)

	// Test 11: Shortest Path - unreachable node
	testName = "test_shortest_path_unreachable_infinite_loop"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(0, 1, 1)
		g.AddEdge(2, 3, 1)
		path := g.FindShortestPath(0, 3)
		if len(path) != 0 {
			passed = false
			msg = "expected empty path for unreachable node"
		}
	})
	result.AddTest(testName, passed, msg)

	// Test 12: Shortest Path - self loop
	testName = "test_shortest_path_self_loop"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(0, 0, 1)
		path := g.FindShortestPath(0, 0)
		expected := []int{0}
		passed, msg = assertEqual(expected, path)
	})
	result.AddTest(testName, passed, msg)

	// Test 13: AddEdge - nil safety
	testName = "test_add_edge_nil_weights"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(0, 1, 5)
	})
	result.AddTest(testName, passed, msg)

	// Test 14: BFS - correct traversal order
	testName = "test_bfs_correct_traversal"
	g := NewGraphAfter()
	g.AddEdge(0, 1, 1)
	g.AddEdge(0, 2, 1)
	g.AddEdge(1, 3, 1)
	bfsResult := g.BFS(0)
	expected := []int{0, 1, 2, 3}
	passed, msg = assertEqual(expected, bfsResult)
	result.AddTest(testName, passed, msg)

	// Test 15: DFS - correct path finding
	testName = "test_dfs_correct_path"
	g2 := NewGraphAfter()
	g2.AddEdge(0, 1, 1)
	g2.AddEdge(1, 2, 1)
	path, found := g2.DFS(0, 2)
	if found {
		expectedPath := []int{0, 1, 2}
		passed, msg = assertEqual(expectedPath, path)
	} else {
		passed, msg = false, "DFS should find path"
	}
	result.AddTest(testName, passed, msg)

	// Test 16: Shortest Path - multiple paths
	testName = "test_shortest_path_multiple_paths"
	g3 := NewGraphAfter()
	g3.AddEdge(0, 1, 1)
	g3.AddEdge(0, 2, 1)
	g3.AddEdge(1, 3, 1)
	g3.AddEdge(2, 3, 1)
	path = g3.FindShortestPath(0, 3)
	if len(path) != 3 {
		passed, msg = false, fmt.Sprintf("expected path length 3, got %d", len(path))
	} else {
		passed, msg = true, ""
	}
	result.AddTest(testName, passed, msg)

	// Test 17: Duplicate edges
	testName = "test_duplicate_edges"
	passed, msg = assertNoPanic(func() {
		g := NewGraphAfter()
		g.AddEdge(0, 1, 5)
		g.AddEdge(0, 1, 10)
		bfsResult := g.BFS(0)
		_ = bfsResult
	})
	result.AddTest(testName, passed, msg)

	return result
}

func main() {
	_, filename, _, _ := runtime.Caller(0)
	testDir := filepath.Dir(filename)
	outputFile := filepath.Join(testDir, "test_after_results.json")

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
