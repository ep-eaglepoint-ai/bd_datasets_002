# Trajectory: Refactoring for Distributed Chat

## Analysis
The initial `ChatService` relied on `this.rooms = new Map()`. This is a classic local state bottleneck. In a Kubernetes environment with multiple pods (ReplicaSet), User A on Pod 1 cannot communicate with User B on Pod 2 because Pod 1's memory is isolated.

To solve this, we must externalize the state and the messaging bus. Redis is the industry standard for this due to its low-latency Pub/Sub capabilities and ephemeral key storage.

## Strategy: Redis Pub/Sub
1.  **Decoupling:** Instead of `socket.to(room).emit()`, which is a local operation, we will `redis.publish()`.
2.  **Global Listener:** Every instance must subscribe to a wildcard `chat:*`. This ensures that no matter where the message originates, all instances receive it.
3.  **Local Fan-out:** Once an instance receives a Redis message, it checks its *local* socket connections for that room and emits to them. This bridges the distributed gap while maintaining Socket.io's connection management.

## Implementation Details & Constraints
*   **Separation of Concerns:** We need two Redis clients. One for publishing (commands) and one strictly for subscribing (blocking mode).
*   **Resilience:** Connection drops in distributed systems are common. We rely on `ioredis`'s built-in reconnection logic but add error logging to satisfy the resilience requirement.
*   **State Management (Occupancy):** The prompt requires tracking if a room is active. A full persistent storage isn't required, just "active" status. I chose to use a Redis Key `room:{name}:active` with a TTL (Time To Live). Every time a user joins or speaks, we refresh the TTL. If no one interacts, the key expires, effectively "closing" the room globally.

## Self-Correction / Refinement
*   *Initial thought:* Should I filter messages by `instanceId` to prevent the sender from receiving their own message?
*   *Correction:* While efficient, the requirement explicitly says "Publish... instead of emitting directly". If I emit locally AND publish, I risk race conditions or code duplication. The cleanest architectural pattern is "Fire and Forget" to Redis. The instance (even the sender's instance) receives the message back from Redis and emits it. This adds a millisecond of latency but guarantees strict ordering and simplifies the logic. I added the `instanceId` to the payload to satisfy Requirement 6, allowing for future filtering if optimization is needed.

## Testing Strategy
Since this is a hermetic build, we cannot rely on a running Redis container in the test environment. I used `jest.mock` to simulate the `ioredis` class. The mock includes an `EventEmitter` that acts as the "Redis Server", passing messages from the `publish` mock to the `subscribe` mock. This proves the logic works without external dependencies.
