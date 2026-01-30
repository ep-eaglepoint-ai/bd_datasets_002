package warehouse

import (
	"testing"
)

func TestVertexConflict(t *testing.T) {
	wd := NewWarehouseDispatcher(10, 10, []Coord{})
	
	path1 := wd.PlanPath(1, Coord{0, 0}, Coord{5, 0}, 0)
	if path1 == nil {
		t.Fatal("Robot 1 failed to find path")
	}
	
	path2 := wd.PlanPath(2, Coord{0, 1}, Coord{5, 1}, 0)
	if path2 == nil {
		t.Fatal("Robot 2 failed to find path")
	}
	
	// Check no vertex conflicts
	for i := 0; i < len(path1) && i < len(path2); i++ {
		if path1[i].X == path2[i].X && path1[i].Y == path2[i].Y {
			t.Errorf("Vertex conflict at time %d: both at (%d,%d)", i, path1[i].X, path1[i].Y)
		}
	}
}

func TestEdgeConflict(t *testing.T) {
	wd := NewWarehouseDispatcher(10, 10, []Coord{})
	
	path1 := wd.PlanPath(1, Coord{0, 0}, Coord{2, 0}, 0)
	if path1 == nil {
		t.Fatal("Robot 1 failed to find path")
	}
	
	path2 := wd.PlanPath(2, Coord{2, 0}, Coord{0, 0}, 0)
	if path2 == nil {
		t.Fatal("Robot 2 failed to find path")
	}
	
	// Check no edge conflicts (swapping)
	for i := 1; i < len(path1) && i < len(path2); i++ {
		if path1[i-1].X == path2[i].X && path1[i-1].Y == path2[i].Y &&
			path1[i].X == path2[i-1].X && path1[i].Y == path2[i-1].Y {
			t.Errorf("Edge conflict at time %d: swapping between (%d,%d) and (%d,%d)",
				i, path1[i-1].X, path1[i-1].Y, path1[i].X, path1[i].Y)
		}
	}
}

func TestWaitAction(t *testing.T) {
	wd := NewWarehouseDispatcher(3, 3, []Coord{})
	
	path1 := wd.PlanPath(1, Coord{0, 0}, Coord{2, 0}, 0)
	if path1 == nil {
		t.Fatal("Robot 1 failed to find path")
	}
	
	path2 := wd.PlanPath(2, Coord{0, 1}, Coord{2, 1}, 0)
	if path2 == nil {
		t.Fatal("Robot 2 failed to find path")
	}
	
	// Check if wait action is used (consecutive same positions)
	hasWait := false
	for i := 1; i < len(path2); i++ {
		if path2[i].X == path2[i-1].X && path2[i].Y == path2[i-1].Y {
			hasWait = true
			break
		}
	}
	
	if !hasWait && len(path2) > len(path1) {
		// Path is longer, likely due to detour or wait
		t.Logf("Robot 2 path length: %d, Robot 1 path length: %d", len(path2), len(path1))
	}
}

func TestObstacleAvoidance(t *testing.T) {
	obstacles := []Coord{{1, 0}, {1, 1}, {1, 2}}
	wd := NewWarehouseDispatcher(5, 5, obstacles)
	
	path := wd.PlanPath(1, Coord{0, 1}, Coord{4, 1}, 0)
	if path == nil {
		t.Fatal("Failed to find path around obstacles")
	}
	
	for _, p := range path {
		for _, obs := range obstacles {
			if p.X == obs.X && p.Y == obs.Y {
				t.Errorf("Path goes through obstacle at (%d,%d)", obs.X, obs.Y)
			}
		}
	}
}

func TestMultipleRobots(t *testing.T) {
	wd := NewWarehouseDispatcher(20, 20, []Coord{})
	
	robots := []struct {
		id    int
		start Coord
		end   Coord
	}{
		{1, Coord{0, 0}, Coord{10, 10}},
		{2, Coord{10, 0}, Coord{0, 10}},
		{3, Coord{0, 10}, Coord{10, 0}},
		{4, Coord{10, 10}, Coord{0, 0}},
	}
	
	paths := make([][]Coord, len(robots))
	for i, r := range robots {
		paths[i] = wd.PlanPath(r.id, r.start, r.end, 0)
		if paths[i] == nil {
			t.Fatalf("Robot %d failed to find path", r.id)
		}
	}
	
	// Verify no conflicts
	maxLen := 0
	for _, p := range paths {
		if len(p) > maxLen {
			maxLen = len(p)
		}
	}
	
	for time := 0; time < maxLen; time++ {
		occupied := make(map[Coord]int)
		for i, path := range paths {
			if time < len(path) {
				pos := path[time]
				if prevRobot, exists := occupied[pos]; exists {
					t.Errorf("Vertex conflict at time %d: robots %d and %d at (%d,%d)",
						time, prevRobot, i+1, pos.X, pos.Y)
				}
				occupied[pos] = i + 1
			}
		}
	}
}

func TestReservationTableThreadSafety(t *testing.T) {
	wd := NewWarehouseDispatcher(50, 50, []Coord{})
	
	done := make(chan bool)
	for i := 0; i < 10; i++ {
		go func(id int) {
			start := Coord{id, 0}
			end := Coord{id, 49}
			path := wd.PlanPath(id, start, end, 0)
			if path == nil {
				t.Errorf("Robot %d failed to find path", id)
			}
			done <- true
		}(i)
	}
	
	for i := 0; i < 10; i++ {
		<-done
	}
}

func TestManhattanDistance(t *testing.T) {
	tests := []struct {
		x1, y1, x2, y2 int
		expected       int
	}{
		{0, 0, 3, 4, 7},
		{5, 5, 5, 5, 0},
		{0, 0, 10, 0, 10},
		{-2, 3, 4, -1, 10},
	}
	
	for _, tt := range tests {
		result := manhattan(tt.x1, tt.y1, tt.x2, tt.y2)
		if result != tt.expected {
			t.Errorf("manhattan(%d,%d,%d,%d) = %d, want %d",
				tt.x1, tt.y1, tt.x2, tt.y2, result, tt.expected)
		}
	}
}

func TestSpaceTimeTracking(t *testing.T) {
	wd := NewWarehouseDispatcher(10, 10, []Coord{})
	
	path1 := wd.PlanPath(1, Coord{0, 0}, Coord{5, 0}, 0)
	if path1 == nil {
		t.Fatal("Robot 1 failed to find path")
	}
	
	// Robot 2 starts later, should be able to use same cells
	path2 := wd.PlanPath(2, Coord{0, 0}, Coord{5, 0}, len(path1)+1)
	if path2 == nil {
		t.Fatal("Robot 2 failed to find path with delayed start")
	}
	
	// Both should reach the same destination
	if path1[len(path1)-1] != path2[len(path2)-1] {
		t.Error("Robots should reach same destination")
	}
}
