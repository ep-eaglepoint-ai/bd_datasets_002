package flight_dynamics

import (
	"math"
	"sync"
)

// Vector3 represents a 3D vector for position, velocity, force, etc.
// In JavaScript: { x: 0, y: 0, z: 0 }
type Vector3 struct {
	X, Y, Z float64
}

// Quaternion represents orientation/rotation using 4 components
// Avoids Gimbal Lock - this is the KEY requirement
// w is the scalar part, x,y,z are the vector part
type Quaternion struct {
	W, X, Y, Z float64
}

// RigidBody represents the aircraft's physics state
// This is like a class in JavaScript/TypeScript
type RigidBody struct {
	// Position in world space (meters)
	Position Vector3
	
	// Linear velocity in world space (meters/second)
	Velocity Vector3
	
	// Orientation as a quaternion (no Euler angles!)
	Orientation Quaternion
	
	// Angular velocity in body frame (radians/second)
	AngularVelocity Vector3
	
	// Mass in kilograms
	Mass float64
	
	// Moment of inertia tensor (simplified as Vector3 for diagonal components)
	// Resistance to rotation around each axis
	Inertia Vector3
	
	// Thread safety - allows multiple readers or one writer
	// Like a ReadWriteLock in other languages
	mutex sync.RWMutex
}

// NewRigidBody creates a new rigid body with default orientation
// Constructor function (Go doesn't have classes)
func NewRigidBody(mass float64, inertia Vector3) *RigidBody {
	return &RigidBody{
		Position:        Vector3{0, 0, 0},
		Velocity:        Vector3{0, 0, 0},
		Orientation:     Quaternion{W: 1, X: 0, Y: 0, Z: 0}, // Identity quaternion (no rotation)
		AngularVelocity: Vector3{0, 0, 0},
		Mass:            mass,
		Inertia:         inertia,
	}
}

// ============================================================================
// VECTOR OPERATIONS (like vector math libraries in JS)
// ============================================================================

// Add two vectors (component-wise addition)
func (v Vector3) Add(other Vector3) Vector3 {
	return Vector3{
		X: v.X + other.X,
		Y: v.Y + other.Y,
		Z: v.Z + other.Z,
	}
}

// Scale multiplies a vector by a scalar
func (v Vector3) Scale(scalar float64) Vector3 {
	return Vector3{
		X: v.X * scalar,
		Y: v.Y * scalar,
		Z: v.Z * scalar,
	}
}

// Dot product: measures how much two vectors point in the same direction
// Returns a scalar (single number)
func (v Vector3) Dot(other Vector3) float64 {
	return v.X*other.X + v.Y*other.Y + v.Z*other.Z
}

// Cross product: creates a vector perpendicular to both input vectors
// Used for calculating torque and angular effects
func (v Vector3) Cross(other Vector3) Vector3 {
	return Vector3{
		X: v.Y*other.Z - v.Z*other.Y,
		Y: v.Z*other.X - v.X*other.Z,
		Z: v.X*other.Y - v.Y*other.X,
	}
}

// Magnitude calculates the length of the vector
// Like Math.sqrt(x*x + y*y + z*z) in JS
func (v Vector3) Magnitude() float64 {
	return math.Sqrt(v.X*v.X + v.Y*v.Y + v.Z*v.Z)
}

// Normalize returns a unit vector (length = 1) in the same direction
func (v Vector3) Normalize() Vector3 {
	mag := v.Magnitude()
	if mag < 1e-10 { // Avoid division by zero
		return Vector3{0, 0, 0}
	}
	return v.Scale(1.0 / mag)
}

// ============================================================================
// QUATERNION OPERATIONS (This solves the Gimbal Lock problem!)
// ============================================================================

// Multiply two quaternions (quaternion composition = combining rotations)
// Order matters! q1 * q2 ≠ q2 * q1
func (q Quaternion) Multiply(other Quaternion) Quaternion {
	return Quaternion{
		W: q.W*other.W - q.X*other.X - q.Y*other.Y - q.Z*other.Z,
		X: q.W*other.X + q.X*other.W + q.Y*other.Z - q.Z*other.Y,
		Y: q.W*other.Y - q.X*other.Z + q.Y*other.W + q.Z*other.X,
		Z: q.W*other.Z + q.X*other.Y - q.Y*other.X + q.Z*other.W,
	}
}

// Normalize the quaternion to unit length
// REQUIREMENT 4: Prevents numerical drift during integration
func (q Quaternion) Normalize() Quaternion {
	magnitude := math.Sqrt(q.W*q.W + q.X*q.X + q.Y*q.Y + q.Z*q.Z)
	if magnitude < 1e-10 {
		return Quaternion{W: 1, X: 0, Y: 0, Z: 0} // Return identity
	}
	return Quaternion{
		W: q.W / magnitude,
		X: q.X / magnitude,
		Y: q.Y / magnitude,
		Z: q.Z / magnitude,
	}
}

// Conjugate returns the inverse rotation (negates x, y, z components)
func (q Quaternion) Conjugate() Quaternion {
	return Quaternion{
		W: q.W,
		X: -q.X,
		Y: -q.Y,
		Z: -q.Z,
	}
}

// RotateVector applies this quaternion rotation to a vector
// REQUIREMENT 2: This transforms Body Frame vectors to World Frame
// Formula: v' = q * v * q^-1 (where v is treated as a quaternion with w=0)
func (q Quaternion) RotateVector(v Vector3) Vector3 {
	// Convert vector to quaternion (w=0, x=v.X, y=v.Y, z=v.Z)
	vecQuat := Quaternion{W: 0, X: v.X, Y: v.Y, Z: v.Z}
	
	// Rotate: q * v * q^-1
	result := q.Multiply(vecQuat).Multiply(q.Conjugate())
	
	return Vector3{X: result.X, Y: result.Y, Z: result.Z}
}

// ============================================================================
// PHYSICS STATE QUERIES (Thread-safe reads)
// ============================================================================

// GetPosition returns current position (thread-safe read)
func (rb *RigidBody) GetPosition() Vector3 {
	rb.mutex.RLock()         // Acquire read lock (multiple readers allowed)
	defer rb.mutex.RUnlock() // Release lock when function returns
	return rb.Position
}

// GetVelocity returns current velocity (thread-safe read)
func (rb *RigidBody) GetVelocity() Vector3 {
	rb.mutex.RLock()
	defer rb.mutex.RUnlock()
	return rb.Velocity
}

// GetOrientation returns current orientation quaternion (thread-safe read)
func (rb *RigidBody) GetOrientation() Quaternion {
	rb.mutex.RLock()
	defer rb.mutex.RUnlock()
	return rb.Orientation
}

// GetAngularVelocity returns current angular velocity (thread-safe read)
func (rb *RigidBody) GetAngularVelocity() Vector3 {
	rb.mutex.RLock()
	defer rb.mutex.RUnlock()
	return rb.AngularVelocity
}

// GetForwardVector returns the aircraft's forward direction in world space
// This shows how the body frame "forward" (0,0,1) transforms to world space
func (rb *RigidBody) GetForwardVector() Vector3 {
	rb.mutex.RLock()
	defer rb.mutex.RUnlock()
	// Body frame forward is (0, 0, 1), rotate it to world frame
	return rb.Orientation.RotateVector(Vector3{X: 0, Y: 0, Z: 1})
}

// ============================================================================
// PHYSICS INTEGRATION (The core simulation loop)
// ============================================================================

// Update advances the simulation by deltaTime seconds
// This is where the main physics happens!
// 
// bodyForce: Forces in the aircraft's local frame (thrust, drag)
// bodyTorque: Torques in the aircraft's local frame (control surfaces)
// deltaTime: Time step in seconds (typically 0.016 for 60 FPS)
func (rb *RigidBody) Update(bodyForce Vector3, bodyTorque Vector3, deltaTime float64) {
	rb.mutex.Lock()         // Acquire write lock (exclusive access)
	defer rb.mutex.Unlock() // Release lock when done
	
	// STEP 1: Transform body frame forces to world frame
	// REQUIREMENT 2: Rotate thrust/drag from Body Frame to World Frame
	worldForce := rb.Orientation.RotateVector(bodyForce)
	
	// STEP 2: Add gravity (acts in world frame only)
	// REQUIREMENT 3: Gravity is a constant global force (world Y-axis)
	gravity := Vector3{X: 0, Y: -9.81 * rb.Mass, Z: 0} // -9.81 m/s² * mass
	worldForce = worldForce.Add(gravity)
	
	// STEP 3: Update linear velocity using F = ma → a = F/m
	acceleration := worldForce.Scale(1.0 / rb.Mass)
	rb.Velocity = rb.Velocity.Add(acceleration.Scale(deltaTime))
	
	// STEP 4: Update position using velocity
	// New position = old position + velocity * time
	rb.Position = rb.Position.Add(rb.Velocity.Scale(deltaTime))
	
	// STEP 5: Update angular velocity using torque
	// Angular acceleration = torque / inertia (simplified for diagonal inertia)
	angularAccel := Vector3{
		X: bodyTorque.X / rb.Inertia.X,
		Y: bodyTorque.Y / rb.Inertia.Y,
		Z: bodyTorque.Z / rb.Inertia.Z,
	}
	rb.AngularVelocity = rb.AngularVelocity.Add(angularAccel.Scale(deltaTime))
	
	// STEP 6: Update orientation using angular velocity
	// Convert angular velocity to quaternion derivative
	// dq/dt = 0.5 * ω * q (where ω is angular velocity as a quaternion)
	omegaQuat := Quaternion{
		W: 0,
		X: rb.AngularVelocity.X,
		Y: rb.AngularVelocity.Y,
		Z: rb.AngularVelocity.Z,
	}
	
	// Quaternion derivative
	dq := omegaQuat.Multiply(rb.Orientation).Scale(0.5)
	
	// Integrate orientation: q_new = q_old + dq * dt
	rb.Orientation = Quaternion{
		W: rb.Orientation.W + dq.W*deltaTime,
		X: rb.Orientation.X + dq.X*deltaTime,
		Y: rb.Orientation.Y + dq.Y*deltaTime,
		Z: rb.Orientation.Z + dq.Z*deltaTime,
	}
	
	// STEP 7: REQUIREMENT 4 - Normalize quaternion to prevent drift
	// Over time, numerical errors accumulate and the quaternion length drifts from 1.0
	rb.Orientation = rb.Orientation.Normalize()
}

// Scale multiplies a quaternion by a scalar (used in integration)
func (q Quaternion) Scale(s float64) Quaternion {
	return Quaternion{
		W: q.W * s,
		X: q.X * s,
		Y: q.Y * s,
		Z: q.Z * s,
	}
}

// SetOrientation sets orientation from axis-angle representation
// Useful for initial setup or applying control inputs
func (rb *RigidBody) SetOrientation(axis Vector3, angle float64) {
	rb.mutex.Lock()
	defer rb.mutex.Unlock()
	
	// Convert axis-angle to quaternion
	halfAngle := angle / 2.0
	sinHalf := math.Sin(halfAngle)
	
	normalizedAxis := axis.Normalize()
	rb.Orientation = Quaternion{
		W: math.Cos(halfAngle),
		X: normalizedAxis.X * sinHalf,
		Y: normalizedAxis.Y * sinHalf,
		Z: normalizedAxis.Z * sinHalf,
	}
}

// ApplyImpulse applies an instantaneous change in velocity (for collisions, etc.)
func (rb *RigidBody) ApplyImpulse(impulse Vector3) {
	rb.mutex.Lock()
	defer rb.mutex.Unlock()
	
	// Impulse = change in momentum = mass * change in velocity
	deltaV := impulse.Scale(1.0 / rb.Mass)
	rb.Velocity = rb.Velocity.Add(deltaV)
}

// SetPosition sets the position (useful for initialization or teleportation)
func (rb *RigidBody) SetPosition(pos Vector3) {
	rb.mutex.Lock()
	defer rb.mutex.Unlock()
	rb.Position = pos
}

// SetVelocity sets the velocity
func (rb *RigidBody) SetVelocity(vel Vector3) {
	rb.mutex.Lock()
	defer rb.mutex.Unlock()
	rb.Velocity = vel
}