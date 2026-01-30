package warehouse

import (
	"container/heap"
	"sync"
)

type Coord struct {
	X, Y int
}

type Node struct {
	X, Y, T int
	G, H    int
	Parent  *Node
	index   int
}

func (n *Node) F() int { return n.G + n.H }

type PriorityQueue []*Node

func (pq PriorityQueue) Len() int           { return len(pq) }
func (pq PriorityQueue) Less(i, j int) bool { return pq[i].F() < pq[j].F() }
func (pq PriorityQueue) Swap(i, j int) {
	pq[i], pq[j] = pq[j], pq[i]
	pq[i].index = i
	pq[j].index = j
}
func (pq *PriorityQueue) Push(x interface{}) {
	n := len(*pq)
	node := x.(*Node)
	node.index = n
	*pq = append(*pq, node)
}
func (pq *PriorityQueue) Pop() interface{} {
	old := *pq
	n := len(old)
	node := old[n-1]
	node.index = -1
	*pq = old[0 : n-1]
	return node
}

type ReservationTable struct {
	mu          sync.RWMutex
	reservations map[int]map[int]map[int]bool // t -> x -> y -> occupied
	edges       map[int]map[Coord]map[Coord]bool // t -> from -> to -> occupied
}

func NewReservationTable() *ReservationTable {
	return &ReservationTable{
		reservations: make(map[int]map[int]map[int]bool),
		edges:       make(map[int]map[Coord]map[Coord]bool),
	}
}

func (rt *ReservationTable) isReservedUnsafe(x, y, t int) bool {
	if tm, ok := rt.reservations[t]; ok {
		if xm, ok := tm[x]; ok {
			return xm[y]
		}
	}
	return false
}

func (rt *ReservationTable) isEdgeReservedUnsafe(fromX, fromY, toX, toY, t int) bool {
	if tm, ok := rt.edges[t]; ok {
		from := Coord{fromX, fromY}
		to := Coord{toX, toY}
		if fm, ok := tm[from]; ok {
			return fm[to]
		}
	}
	return false
}

func (rt *ReservationTable) reserveUnsafe(x, y, t int) {
	if rt.reservations[t] == nil {
		rt.reservations[t] = make(map[int]map[int]bool)
	}
	if rt.reservations[t][x] == nil {
		rt.reservations[t][x] = make(map[int]bool)
	}
	rt.reservations[t][x][y] = true
}

func (rt *ReservationTable) reserveEdgeUnsafe(fromX, fromY, toX, toY, t int) {
	if rt.edges[t] == nil {
		rt.edges[t] = make(map[Coord]map[Coord]bool)
	}
	from := Coord{fromX, fromY}
	to := Coord{toX, toY}
	if rt.edges[t][from] == nil {
		rt.edges[t][from] = make(map[Coord]bool)
	}
	rt.edges[t][from][to] = true
}

type WarehouseDispatcher struct {
	Width, Height int
	Obstacles     map[Coord]bool
	Table         *ReservationTable
}

func NewWarehouseDispatcher(width, height int, obstacles []Coord) *WarehouseDispatcher {
	obs := make(map[Coord]bool)
	for _, o := range obstacles {
		obs[o] = true
	}
	return &WarehouseDispatcher{
		Width:     width,
		Height:    height,
		Obstacles: obs,
		Table:     NewReservationTable(),
	}
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func manhattan(x1, y1, x2, y2 int) int {
	return abs(x1-x2) + abs(y1-y2)
}

func (wd *WarehouseDispatcher) PlanPath(robotID int, start, end Coord, startTime int) []Coord {
	wd.Table.mu.Lock()
	defer wd.Table.mu.Unlock()
	
	pq := &PriorityQueue{}
	heap.Init(pq)
	
	startNode := &Node{X: start.X, Y: start.Y, T: startTime, G: 0, H: manhattan(start.X, start.Y, end.X, end.Y)}
	heap.Push(pq, startNode)
	
	visited := make(map[int]map[int]map[int]bool)
	
	for pq.Len() > 0 {
		current := heap.Pop(pq).(*Node)
		
		if current.X == end.X && current.Y == end.Y {
			path := []Coord{}
			for n := current; n != nil; n = n.Parent {
				path = append([]Coord{{n.X, n.Y}}, path...)
			}
			
			for i := 0; i < len(path); i++ {
				wd.Table.reserveUnsafe(path[i].X, path[i].Y, startTime+i)
				if i > 0 {
					wd.Table.reserveEdgeUnsafe(path[i-1].X, path[i-1].Y, path[i].X, path[i].Y, startTime+i)
				}
			}
			return path
		}
		
		if visited[current.T] == nil {
			visited[current.T] = make(map[int]map[int]bool)
		}
		if visited[current.T][current.X] == nil {
			visited[current.T][current.X] = make(map[int]bool)
		}
		if visited[current.T][current.X][current.Y] {
			continue
		}
		visited[current.T][current.X][current.Y] = true
		
		neighbors := []struct{ dx, dy int }{
			{0, 1}, {1, 0}, {0, -1}, {-1, 0}, {0, 0},
		}
		
		for _, dir := range neighbors {
			nx, ny := current.X+dir.dx, current.Y+dir.dy
			nt := current.T + 1
			
			if nx < 0 || nx >= wd.Width || ny < 0 || ny >= wd.Height {
				continue
			}
			if wd.Obstacles[Coord{nx, ny}] {
				continue
			}
			if wd.Table.isReservedUnsafe(nx, ny, nt) {
				continue
			}
			if wd.Table.isEdgeReservedUnsafe(nx, ny, current.X, current.Y, nt) {
				continue
			}
			
			neighbor := &Node{
				X:      nx,
				Y:      ny,
				T:      nt,
				G:      current.G + 1,
				H:      manhattan(nx, ny, end.X, end.Y),
				Parent: current,
			}
			heap.Push(pq, neighbor)
		}
	}
	
	return nil
}
