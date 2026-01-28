package deconfliction

import (
	"math"
	"sync"
)

type Vector3 struct {
	X, Y, Z float64
}

type Drone struct {
	ID       string
	Position Vector3
	Velocity Vector3
	Battery  int
}

type InstructionType string

const (
	Maintain       InstructionType = "MAINTAIN"
	AdjustAltitude InstructionType = "ADJUST_ALTITUDE"
)

type Instruction struct {
	DroneID string
	Action  InstructionType
	Value   float64
}

func ResolveConflicts(drones []Drone) []Instruction {
	instructions := make([]Instruction, len(drones))
	droneMap := make(map[string]*Drone)
	instructionMap := make(map[string]*Instruction)

	for i, d := range drones {
		instructions[i] = Instruction{
			DroneID: d.ID,
			Action:  Maintain,
			Value:   d.Position.Z,
		}
		droneMap[d.ID] = &drones[i]
		instructionMap[d.ID] = &instructions[i]
	}

	type Conflict struct {
		DroneA *Drone
		DroneB *Drone
	}

	var conflicts []Conflict
	var mu sync.Mutex
	var wg sync.WaitGroup

	numWorkers := 4
	chunkSize := (len(drones) + numWorkers - 1) / numWorkers

	for w := 0; w < numWorkers; w++ {
		start := w * chunkSize
		end := start + chunkSize
		if end > len(drones) {
			end = len(drones)
		}
		if start >= end {
			continue
		}

		wg.Add(1)
		go func(start, end int) {
			defer wg.Done()
			localConflicts := []Conflict{}
			for i := start; i < end; i++ {
				for j := i + 1; j < len(drones); j++ {
					if detectConflict(drones[i], drones[j]) {
						localConflicts = append(localConflicts, Conflict{&drones[i], &drones[j]})
					}
				}
			}
			mu.Lock()
			conflicts = append(conflicts, localConflicts...)
			mu.Unlock()
		}(start, end)
	}
	wg.Wait()

	resolvedPositions := make(map[string]Vector3)
	for _, d := range drones {
		resolvedPositions[d.ID] = d.Position
	}

	for _, c := range conflicts {
		var highBat, lowBat *Drone

		if c.DroneA.Battery < c.DroneB.Battery {
			lowBat = c.DroneA
			highBat = c.DroneB
		} else if c.DroneB.Battery < c.DroneA.Battery {
			lowBat = c.DroneB
			highBat = c.DroneA
		} else {
			if c.DroneA.ID < c.DroneB.ID {
				lowBat = c.DroneA
				highBat = c.DroneB
			} else {
				lowBat = c.DroneB
				highBat = c.DroneA
			}
		}

		moverID := highBat.ID
		priorityID := lowBat.ID

		originalZ := highBat.Position.Z

		inst := instructionMap[moverID]
		if inst.Action == Maintain {
			upZ := originalZ + 2.0
			downZ := originalZ - 2.0

			prioDroneResolved := *lowBat
			prioDroneResolved.Position = resolvedPositions[priorityID]

			moverDroneUp := *highBat
			moverDroneUp.Position.Z = upZ

			moverDroneDown := *highBat
			moverDroneDown.Position.Z = downZ

			distUp := minDistance(moverDroneUp, prioDroneResolved)
			distDown := minDistance(moverDroneDown, prioDroneResolved)

			var chosenZ float64
			if distUp >= distDown {
				chosenZ = upZ
			} else {
				chosenZ = downZ
			}

			resolvedPositions[moverID] = Vector3{highBat.Position.X, highBat.Position.Y, chosenZ}
			instructionMap[moverID].Action = AdjustAltitude
			instructionMap[moverID].Value = chosenZ
		}
	}

	return instructions
}

func detectConflict(d1, d2 Drone) bool {
	return minDistance(d1, d2) < 5.0
}

func minDistance(d1, d2 Drone) float64 {
	dx := d2.Position.X - d1.Position.X
	dy := d2.Position.Y - d1.Position.Y
	dz := d2.Position.Z - d1.Position.Z

	dvx := d2.Velocity.X - d1.Velocity.X
	dvy := d2.Velocity.Y - d1.Velocity.Y
	dvz := d2.Velocity.Z - d1.Velocity.Z

	A := dvx*dvx + dvy*dvy + dvz*dvz
	B := 2 * (dx*dvx + dy*dvy + dz*dvz)
	C := dx*dx + dy*dy + dz*dz

	if A < 1e-9 {
		return math.Sqrt(C)
	}

	tMin := -B / (2 * A)

	if tMin < 0 {
		tMin = 0
	} else if tMin > 10 {
		tMin = 10
	}

	distSq := A*tMin*tMin + B*tMin + C
	if distSq < 0 {
		distSq = 0
	}
	return math.Sqrt(distSq)
}
