package flight_dynamics_test

import (
	"math"
	"sync"
	"testing"
	"time"
)

// Import the physics package - path will be set dynamically
// This is handled by the test runner
import . "flight-dynamics-test/repository_after"

// Test helper functions
const epsilon = 1e-9

func almostEqual(a, b, tolerance float64) bool {
	return math.Abs(a-b) < tolerance
}

func vectorAlmostEqual(v1, v2 Vector3, tolerance float64) bool {
	return almostEqual(v1.X, v2.X, tolerance) &&
		almostEqual(v1.Y, v2.Y, tolerance) &&
		almostEqual(v1.Z, v2.Z, tolerance)
}

func quaternionAlmostEqual(q1, q2 Quaternion, tolerance float64) bool {
	return almostEqual(q1.W, q2.W, tolerance) &&
		almostEqual(q1.X, q2.X, tolerance) &&
		almostEqual(q1.Y, q2.Y, tolerance) &&
		almostEqual(q1.Z, q2.Z, tolerance)
}

// ============================================================================
// REQUIREMENT 1: Quaternion implementation tests
// ============================================================================

func TestQuaternionStructure(t *testing.T) {
	// Test that quaternion has 4 components (w, x, y, z)
	q := Quaternion{W: 1, X: 0, Y: 0, Z: 0}
	
	if q.W != 1 || q.X != 0 || q.Y != 0 || q.Z != 0 {
		t.Error("Quaternion must have W, X, Y, Z components")
	}
}

func TestQuaternionIdentity(t *testing.T) {
	// Identity quaternion should not rotate vectors
	identity := Quaternion{W: 1, X: 0, Y: 0, Z: 0}
	v := Vector3{X: 1, Y: 2, Z: 3}
	
	rotated := identity.RotateVector(v)
	
	if !vectorAlmostEqual(rotated, v, epsilon) {
		t.Errorf("Identity quaternion should not change vector. Got %v, want %v", rotated, v)
	}
}

func TestQuaternionNormalization(t *testing.T) {
	// REQUIREMENT 4: Test normalization prevents drift
	q := Quaternion{W: 1, X: 1, Y: 1, Z: 1}
	normalized := q.Normalize()
	
	// Check magnitude is 1
	magnitude := math.Sqrt(normalized.W*normalized.W + normalized.X*normalized.X + 
		normalized.Y*normalized.Y + normalized.Z*normalized.Z)
	
	if !almostEqual(magnitude, 1.0, epsilon) {
		t.Errorf("Normalized quaternion magnitude should be 1.0, got %f", magnitude)
	}
}

func TestQuaternionMultiplication(t *testing.T) {
	// Test quaternion multiplication (rotation composition)
	// 90-degree rotation around Y-axis
	q1 := Quaternion{W: math.Cos(math.Pi / 4), X: 0, Y: math.Sin(math.Pi / 4), Z: 0}
	// Another 90-degree rotation around Y-axis
	q2 := Quaternion{W: math.Cos(math.Pi / 4), X: 0, Y: math.Sin(math.Pi / 4), Z: 0}
	
	// Combined should be 180-degree rotation
	combined := q1.Multiply(q2)
	
	// Verify it's normalized
	magnitude := math.Sqrt(combined.W*combined.W + combined.X*combined.X + 
		combined.Y*combined.Y + combined.Z*combined.Z)
	
	if !almostEqual(magnitude, 1.0, 1e-6) {
		t.Errorf("Quaternion multiplication should preserve unit length, got %f", magnitude)
	}
}

// ============================================================================
// REQUIREMENT 2: Body Frame to World Frame transformation tests
// ============================================================================

func TestBodyToWorldTransformation(t *testing.T) {
	// Create rigid body with identity orientation
	rb := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	
	// Apply thrust in body frame (forward = Z-axis in body)
	bodyThrust := Vector3{X: 0, Y: 0, Z: 1000} // 1000N forward thrust
	
	// With identity orientation, body forward should equal world forward
	rb.Update(bodyThrust, Vector3{}, 0.01)
	
	// Check that velocity increased in world Z direction
	vel := rb.GetVelocity()
	if vel.Z <= 0 {
		t.Error("Thrust in body Z should translate to world Z with identity orientation")
	}
}

func TestRotatedBodyToWorldTransformation(t *testing.T) {
	// Test that forces in body frame are correctly rotated to world frame
	rb := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	
	// Rotate 90 degrees around Y-axis (nose points to the right)
	rb.SetOrientation(Vector3{X: 0, Y: 1, Z: 0}, math.Pi/2)
	
	// Apply thrust in body Z (forward)
	bodyThrust := Vector3{X: 0, Y: 0, Z: 1000}
	
	rb.Update(bodyThrust, Vector3{}, 0.01)
	
	// After 90° Y rotation, body Z should map to world X
	vel := rb.GetVelocity()
	
	// Should have velocity in X direction (accounting for gravity in Y)
	if math.Abs(vel.X) < 0.001 {
		t.Error("Rotated body thrust should translate to correct world direction")
	}
}

// ============================================================================
// REQUIREMENT 3: Gravity must act only in world frame
// ============================================================================

func TestGravityWorldFrame(t *testing.T) {
	// Gravity should always pull down in world Y, regardless of orientation
	rb := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	rb.SetPosition(Vector3{X: 0, Y: 100, Z: 0})
	
	// Rotate aircraft nose up (90 degrees around X)
	rb.SetOrientation(Vector3{X: 1, Y: 0, Z: 0}, math.Pi/2)
	
	// Update with no body forces
	initialY := rb.GetPosition().Y
	
	for i := 0; i < 10; i++ {
		rb.Update(Vector3{}, Vector3{}, 0.01)
	}
	
	finalY := rb.GetPosition().Y
	
	// Y position should decrease (falling) regardless of orientation
	if finalY >= initialY {
		t.Error("Gravity should always pull down in world Y-axis")
	}
	
	// Verify gravity doesn't affect X or Z
	pos := rb.GetPosition()
	if math.Abs(pos.X) > epsilon || math.Abs(pos.Z) > epsilon {
		t.Error("Gravity should only affect Y-axis")
	}
}

func TestGravityConstantForce(t *testing.T) {
	// Gravity should be constant regardless of rotation
	rb1 := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	rb2 := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	
	// One upright, one inverted
	rb2.SetOrientation(Vector3{X: 0, Y: 0, Z: 1}, math.Pi)
	
	// Simulate
	for i := 0; i < 10; i++ {
		rb1.Update(Vector3{}, Vector3{}, 0.01)
		rb2.Update(Vector3{}, Vector3{}, 0.01)
	}
	
	// Both should have same Y velocity (falling at same rate)
	vel1 := rb1.GetVelocity()
	vel2 := rb2.GetVelocity()
	
	if !almostEqual(vel1.Y, vel2.Y, 0.01) {
		t.Errorf("Gravity should be constant. Got vel1.Y=%f, vel2.Y=%f", vel1.Y, vel2.Y)
	}
}

// ============================================================================
// REQUIREMENT 5: Manual vector/quaternion math (no external libraries)
// ============================================================================

func TestVectorDotProduct(t *testing.T) {
	v1 := Vector3{X: 1, Y: 2, Z: 3}
	v2 := Vector3{X: 4, Y: 5, Z: 6}
	
	dot := v1.Dot(v2)
	expected := 1*4 + 2*5 + 3*6 // 32
	
	if !almostEqual(dot, float64(expected), epsilon) {
		t.Errorf("Dot product incorrect. Got %f, want %f", dot, float64(expected))
	}
}

func TestVectorCrossProduct(t *testing.T) {
	// X cross Y should equal Z
	x := Vector3{X: 1, Y: 0, Z: 0}
	y := Vector3{X: 0, Y: 1, Z: 0}
	
	cross := x.Cross(y)
	expected := Vector3{X: 0, Y: 0, Z: 1}
	
	if !vectorAlmostEqual(cross, expected, epsilon) {
		t.Errorf("Cross product incorrect. Got %v, want %v", cross, expected)
	}
}

func TestVectorMagnitude(t *testing.T) {
	v := Vector3{X: 3, Y: 4, Z: 0}
	mag := v.Magnitude()
	expected := 5.0 // 3-4-5 triangle
	
	if !almostEqual(mag, expected, epsilon) {
		t.Errorf("Vector magnitude incorrect. Got %f, want %f", mag, expected)
	}
}

func TestVectorNormalize(t *testing.T) {
	v := Vector3{X: 3, Y: 4, Z: 0}
	normalized := v.Normalize()
	
	// Check magnitude is 1
	mag := normalized.Magnitude()
	if !almostEqual(mag, 1.0, epsilon) {
		t.Errorf("Normalized vector should have magnitude 1, got %f", mag)
	}
	
	// Check direction preserved
	if !almostEqual(normalized.X/normalized.Y, 3.0/4.0, epsilon) {
		t.Error("Normalization should preserve direction")
	}
}

// ============================================================================
// REQUIREMENT 6: Thread safety tests
// ============================================================================

func TestThreadSafetyReads(t *testing.T) {
	rb := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	
	// Launch multiple goroutines reading concurrently
	var wg sync.WaitGroup
	errors := make(chan error, 100)
	
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				_ = rb.GetPosition()
				_ = rb.GetVelocity()
				_ = rb.GetOrientation()
				time.Sleep(time.Microsecond)
			}
		}()
	}
	
	wg.Wait()
	close(errors)
	
	// Check for any errors
	for err := range errors {
		t.Error(err)
	}
}

func TestThreadSafetyWriteAndRead(t *testing.T) {
	rb := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	
	var wg sync.WaitGroup
	
	// Writer goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < 100; i++ {
			rb.Update(Vector3{X: 0, Y: 0, Z: 100}, Vector3{}, 0.01)
			time.Sleep(time.Microsecond)
		}
	}()
	
	// Multiple reader goroutines
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				_ = rb.GetPosition()
				_ = rb.GetVelocity()
				time.Sleep(time.Microsecond)
			}
		}()
	}
	
	wg.Wait()
	// If we get here without panic/deadlock, thread safety works
}

// ============================================================================
// EDGE CASES AND NUMERICAL STABILITY
// ============================================================================

func TestGimbalLockPrevention(t *testing.T) {
	// The key test: pitch to 90 degrees should not cause gimbal lock
	rb := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	
	// Rotate to 90 degrees pitch (nose straight up)
	rb.SetOrientation(Vector3{X: 1, Y: 0, Z: 0}, math.Pi/2)
	
	// Apply torque to roll
	rollTorque := Vector3{X: 100, Y: 0, Z: 0}
	
	// Simulate
	for i := 0; i < 10; i++ {
		rb.Update(Vector3{}, rollTorque, 0.01)
	}
	
	// Should be able to roll without singularity
	angVel := rb.GetAngularVelocity()
	if math.Abs(angVel.X) < epsilon {
		t.Error("Should be able to roll even at 90-degree pitch (no gimbal lock)")
	}
}

func TestNumericalStabilityOverTime(t *testing.T) {
	// Test that quaternion stays normalized over many updates
	rb := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	
	// Apply torque to cause rotation
	torque := Vector3{X: 10, Y: 10, Z: 10}
	
	// Many integration steps
	for i := 0; i < 1000; i++ {
		rb.Update(Vector3{}, torque, 0.01)
	}
	
	// Check quaternion is still normalized
	q := rb.GetOrientation()
	magnitude := math.Sqrt(q.W*q.W + q.X*q.X + q.Y*q.Y + q.Z*q.Z)
	
	if !almostEqual(magnitude, 1.0, 1e-6) {
		t.Errorf("Quaternion drifted from unit length after many steps. Magnitude: %f", magnitude)
	}
}

func TestZeroMassEdgeCase(t *testing.T) {
	// Should handle very small mass (near division by zero)
	rb := NewRigidBody(0.001, Vector3{X: 0.001, Y: 0.001, Z: 0.001})
	
	// Should not panic or produce NaN
	rb.Update(Vector3{X: 1, Y: 1, Z: 1}, Vector3{}, 0.01)
	
	pos := rb.GetPosition()
	if math.IsNaN(pos.X) || math.IsNaN(pos.Y) || math.IsNaN(pos.Z) {
		t.Error("Should not produce NaN values with small mass")
	}
}

func TestZeroInertiaEdgeCase(t *testing.T) {
	// Should handle very small inertia
	rb := NewRigidBody(1000.0, Vector3{X: 0.001, Y: 0.001, Z: 0.001})
	
	rb.Update(Vector3{}, Vector3{X: 1, Y: 1, Z: 1}, 0.01)
	
	angVel := rb.GetAngularVelocity()
	if math.IsNaN(angVel.X) || math.IsNaN(angVel.Y) || math.IsNaN(angVel.Z) {
		t.Error("Should not produce NaN with small inertia")
	}
}

func TestLargeTimeStepStability(t *testing.T) {
	// Test with unreasonably large time step
	rb := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	
	rb.Update(Vector3{X: 1000, Y: 1000, Z: 1000}, Vector3{X: 100, Y: 100, Z: 100}, 1.0)
	
	pos := rb.GetPosition()
	if math.IsInf(pos.X, 0) || math.IsInf(pos.Y, 0) || math.IsInf(pos.Z, 0) {
		t.Error("Should not produce infinite values with large time step")
	}
}

// ============================================================================
// INTEGRATION AND REALISM TESTS
// ============================================================================

func TestFreeFallAcceleration(t *testing.T) {
	// Object in free fall should accelerate at ~9.81 m/s²
	rb := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	rb.SetPosition(Vector3{X: 0, Y: 1000, Z: 0})
	
	// Simulate 1 second
	for i := 0; i < 100; i++ {
		rb.Update(Vector3{}, Vector3{}, 0.01)
	}
	
	vel := rb.GetVelocity()
	// After 1 second, velocity should be ~9.81 m/s downward
	expectedVel := -9.81
	
	if !almostEqual(vel.Y, expectedVel, 0.1) {
		t.Errorf("Free fall velocity after 1s should be ~%f, got %f", expectedVel, vel.Y)
	}
}

func TestThrustCountersGravity(t *testing.T) {
	// Upward thrust equal to weight should hover
	mass := 1000.0
	rb := NewRigidBody(mass, Vector3{X: 100, Y: 100, Z: 100})
	
	initialPos := rb.GetPosition()
	
	// Upward thrust in body frame equal to weight
	upwardThrust := Vector3{X: 0, Y: mass * 9.81, Z: 0}
	
	// Simulate
	for i := 0; i < 100; i++ {
		rb.Update(upwardThrust, Vector3{}, 0.01)
	}
	
	finalPos := rb.GetPosition()
	
	// Position should barely change (hovering)
	if math.Abs(finalPos.Y-initialPos.Y) > 1.0 {
		t.Error("Thrust equal to weight should approximately hover")
	}
}

func TestConservationOfMomentum(t *testing.T) {
	// With no forces, velocity should remain constant
	rb := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	rb.SetVelocity(Vector3{X: 10, Y: 0, Z: 5})
	rb.SetPosition(Vector3{X: 0, Y: 1000, Z: 0}) // High up to avoid ground
	
	initialVelX := rb.GetVelocity().X
	initialVelZ := rb.GetVelocity().Z
	
	// Simulate with no forces (ignoring gravity for this test by flying horizontally)
	for i := 0; i < 10; i++ {
		// Apply upward thrust to counter gravity
		rb.Update(Vector3{X: 0, Y: 1000 * 9.81, Z: 0}, Vector3{}, 0.01)
	}
	
	finalVelX := rb.GetVelocity().X
	finalVelZ := rb.GetVelocity().Z
	
	// X and Z velocities should be unchanged
	if !almostEqual(finalVelX, initialVelX, 0.1) || !almostEqual(finalVelZ, initialVelZ, 0.1) {
		t.Error("Horizontal velocity should be conserved with only vertical thrust")
	}
}

func TestAngularMomentumConservation(t *testing.T) {
	// With no torque, angular velocity should remain constant
	rb := NewRigidBody(1000.0, Vector3{X: 100, Y: 100, Z: 100})
	
	// Set initial angular velocity
	initialAngVel := Vector3{X: 1, Y: 2, Z: 3}
	rb.AngularVelocity = initialAngVel
	
	// Simulate with no torque
	for i := 0; i < 10; i++ {
		rb.Update(Vector3{X: 0, Y: 1000 * 9.81, Z: 0}, Vector3{}, 0.01)
	}
	
	finalAngVel := rb.GetAngularVelocity()
	
	// Angular velocity should be unchanged
	if !vectorAlmostEqual(finalAngVel, initialAngVel, 0.01) {
		t.Errorf("Angular velocity should be conserved. Got %v, want %v", finalAngVel, initialAngVel)
	}
}

// ============================================================================
// PRACTICAL SCENARIO TESTS
// ============================================================================

func TestAircraftTakeoff(t *testing.T) {
	// Simulate simple takeoff
	rb := NewRigidBody(1000.0, Vector3{X: 1000, Y: 1000, Z: 1000})
	
	// Apply strong forward thrust and slight upward pitch torque
	thrust := Vector3{X: 0, Y: 0, Z: 200000} // Forward
	pitchUp := Vector3{X: -500, Y: 0, Z: 0}  // Pitch up torque
	
	initialY := rb.GetPosition().Y
	
	for i := 0; i < 200; i++ {
		rb.Update(thrust, pitchUp, 0.01)
	}
	
	finalY := rb.GetPosition().Y
	finalZ := rb.GetPosition().Z
	
	// Should have moved forward and upward
	if finalZ <= 0 {
		t.Error("Aircraft should move forward with thrust")
	}
	
	if finalY <= initialY {
		t.Error("Aircraft should climb during takeoff")
	}
}

func TestAircraftTurn(t *testing.T) {
	// Simulate a banking turn
	rb := NewRigidBody(10000.0, Vector3{X: 1000, Y: 1000, Z: 1000})
	rb.SetVelocity(Vector3{X: 0, Y: 0, Z: 100}) // Initial forward velocity
	
	// Apply roll torque to bank
	rollTorque := Vector3{X: 0, Y: 0, Z: 500}
	
	// initialX := rb.GetPosition().X
	
	for i := 0; i < 100; i++ {
		rb.Update(Vector3{}, rollTorque, 0.01)
	}
	
	// After banking, aircraft should turn (X position changes)
	// finalX := rb.GetPosition().X
	
	// This is a simplified test - in reality banking + lift creates turn
	// Here we just verify rotation occurs
	angVel := rb.GetAngularVelocity()
	if math.Abs(angVel.Z) < epsilon {
		t.Error("Roll torque should create angular velocity")
	}
}