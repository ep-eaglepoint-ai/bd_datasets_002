# Flight Dynamics Implementation Trajectory

1.  **Fundamental Representation: Choosing Quaternions over Euler Angles**
    I started by addressing the critical requirement to avoid Gimbal Lock, which makes Euler angles (roll, pitch, yaw) unsuitable for full 6DOF vertical maneuvers. I chose to represent orientation using unit Quaternions (w, x, y, z), which provide a singularity-free mathematical framework for spatial rotation. This decision ensures the aircraft can loop and fly vertically without losing a degree of freedom.
    *   [Visualizing Quaternions vs Euler Angles](https://eater.net/quaternions)
    *   [Gimbal Lock Explanation](https://www.youtube.com/watch?v=BczeMqU_u2Y)

2.  **Building a Dependency-Free Math Kernel**
    Since the simulation requires a self-contained environment without external libraries, I implemented a custom vector and quaternion math library from first principles. I defined `Vector3` and `Quaternion` structs and implemented core operations like dot products, cross products, and quaternion multiplication. This ensures the simulation is deterministic, portable, and has no hidden dependencies.
    *   [Euclidean Vector Operations](https://www.mathsisfun.com/algebra/vectors.html)
    *   [Quaternion Arithmetic and Geometry](https://www.3dgep.com/understanding-quaternions/)

3.  **Designing the Thread-Safe Physics State**
    To satisfy the requirement for high-frequency concurrent reads from the rendering engine, I designed the `RigidBody` struct with an embedded `sync.RWMutex`. This allows the physics loop to lock the state for writing (exclusive access) during updates, while multiple render threads can simultaneously lock for reading (shared access), minimizing contention and creating a robust multi-threaded architecture.
    *   [Go Maps and sync.RWMutex](https://go.dev/tour/concurrency/9)
    *   [Designing Thread-Safe Data Structures](https://medium.com/golangspec/sync-rwmutex-in-go-275d3115456d)

4.  **Implementing Inter-Frame Transformations**
    I addressed the core physics challenge of frame relativity: thrust and drag originate in the aircraft's "Body Frame" (forward is always "nose-direction"), while gravity acts in the "World Frame" (down is always -Y). I implemented a `RotateVector` method using quaternion conjugation ($v' = q \cdot v \cdot q^{-1}$) to transform body-frame forces into world-frame vectors before applying Newton's laws.
    *   [Rotating Vectors with Quaternions](https://danceswithcode.net/engineeringnotes/quaternions/quaternions.html)
    *   [Newton's Laws of Motion](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/newtons-laws-of-motion/)

5.  **Developing the State Integration Loop**
    I constructed the main `Update(dt)` loop to integrate the physical state over time. This loop first transforms local forces to world space, adds the constant gravity vector, computes linear acceleration ($F=ma$), and effectively integrates velocity and position. For rotation, it converts angular velocity into a quaternion derivative to update the orientation, creating a complete 6DOF simulation step.
    *   [Integration Basics for Game Physics](https://gafferongames.com/post/integration_basics/)
    *   [Flight Dynamics Equations](https://www.grc.nasa.gov/www/k-12/airplane/forces.html)

6.  **Enforcing Numerical Stability**
    To prevent the physics simulation from degrading over time due to floating-point errors, I explicitly required the orientation quaternion to be normalized ($q = q / |q|$) at the end of every update frame. This step corrects the gradual "drift" where the quaternion's magnitude deviates from 1.0, which would otherwise distort the geometry of the simulation.
    *   [Floating Point Errors in Physics](https://docs.nvidia.com/gameworks/content/gameworkslibrary/physx/guide/Manual/BestPractices.html)
    *   [Unit Quaternions](https://mathworld.wolfram.com/UnitQuaternion.html)
