package deconfliction

type Vector3 struct {
	X, Y, Z float64
}

type Drone struct {
	ID       string
	Position Vector3
	Velocity Vector3
	Battery  int
}

type InstructionType int

const (
	Maintain InstructionType = iota
	AdjustAltitude
)

func (it InstructionType) String() string {
	switch it {
	case Maintain:
		return "MAINTAIN"
	case AdjustAltitude:
		return "ADJUST_ALTITUDE"
	default:
		return "UNKNOWN"
	}
}

type Instruction struct {
	DroneID string
	Action  InstructionType
	Value   float64
}

// ResolveConflicts is a placeholder for the baseline.
// It detects collision but does not implement the full resolution logic correctly,
// or is simply slower/incorrect, to verify tests fail or pass.
// For now, returning MAINTAIN for everyone to ensure compilation.
func ResolveConflicts(drones []Drone) []Instruction {
	instructions := make([]Instruction, len(drones))
	for i, d := range drones {
		instructions[i] = Instruction{
			DroneID: d.ID,
			Action:  Maintain,
			Value:   d.Position.Z,
		}
	}
	return instructions
}
