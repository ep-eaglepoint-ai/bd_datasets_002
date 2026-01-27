# 8E11LO - Epidemic-Style Gossip Protocol with Eventual Consistency

**Category:** sft

## Overview
- Task ID: 8E11LO
- Title: Epidemic-Style Gossip Protocol with Eventual Consistency
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8e11lo-epidemic-style-gossip-protocol-with-eventual-consistency

## Requirements
- Epidemic-Style Gossip Protocol - Each node must periodically execute gossip rounds at a configurable interval (default 1 second). - During each gossip round, a node must select fanout random peers (default 3) from its list of alive nodes. - The node must send its local state (all known node metadata) to the selected peers via UDP messages. - The gossip round must complete in < 100ms including peer selection, message serialization, and network transmission. - When a cluster has 100 nodes with fanout=3, each node sends 3 messages per round, totaling 300 messages/round across the cluster. - The gossip protocol must use a push-pull strategy: nodes both push their state to peers and pull state from peers who contact them.
- Cluster Membership Tracking - Each node must maintain a list of all known nodes in the cluster with their current status: "alive", "suspected", or "dead". - When a new node joins the cluster, it must contact seed nodes to bootstrap and learn about existing members. - Within O(log N) gossip rounds, all nodes must learn about the new member (where N = cluster size). - For a 100-node cluster with fanout=3, a new node must be discovered by all nodes within ~7 rounds (7 seconds at 1s interval). - When a node leaves gracefully, it must broadcast a "leave" message to all known peers before shutting down. - When a node crashes (ungraceful exit), other nodes must detect the failure within 5 seconds using heartbeat timeouts.
- Arbitrary Metadata Support - Each node must support arbitrary key-value metadata: service name, version, endpoints, health status, tags, etc. - Metadata must be stored as Dict[str, Any] supporting str, int, float, bool, list, dict (JSON-serializable types). - When a node updates its metadata (e.g., health status changes from "healthy" to "degraded"), the change must propagate to all nodes within O(log N) rounds. - For a 100-node cluster, a metadata update must reach all nodes within ~7 rounds (7 seconds). - Metadata size per node must be limited to 10KB to prevent excessive network bandwidth usage. - When metadata exceeds 10KB, the update must be rejected with error: "Metadata size {size}KB exceeds limit of 10KB".  ### 4. Eventual Consistency Guarantee - The gossip protocol must guarantee eventual consistency: given enough time and no new updates, all nodes will converge to the same state. - Convergence must occur within O(log N) gossip rounds with high probability (99%). - For a 100-node cluster with fanout=3, convergence must occur within ~7 rounds (7 seconds) for 99% of updates. - The protocol must handle concurrent updates: when 2 nodes update different metadata keys simultaneously, both updates must eventually propagate to all nodes. - The protocol must handle conflicting updates: when 2 nodes update the same metadata key simultaneously, conflict resolution must use version numbers (higher version wins).
- Failure Detection Mechanism - Each node must track the last_updated timestamp for every peer, updated whenever a message is received from that peer. - A node must be marked as "suspected" if no message has been received for suspicion_timeout seconds (default 5 seconds). - A node must be marked as "dead" if no message has been received for failure_timeout seconds (default 10 seconds). - The failure detection must use the following state transitions: alive → suspected → dead. - When a node is marked as "dead", it must be removed from the list of peers to gossip with (but kept in metadata for anti-entropy). - When a "dead" node comes back online, it must be re-added to the alive list after receiving a message from it. - Failure detection must run in a background thread, checking peer timeouts every 1 second.  . Heartbeat and Version Tracking - Each node must maintain a monotonically increasing heartbeat counter, incremented on every gossip round. - The heartbeat must be included in every gossip message to help peers detect liveness. - Each node metadata must have a version number, incremented on every local update. - When merging remote state, the node with the higher version number wins (conflict resolution). - When version numbers are equal, the node with the higher heartbeat wins (tie-breaker). - When both version and heartbeat are equal, the node with the lexicographically larger node_id wins (final tie-breaker).
- State Merging and Conflict Resolution - When a node receives a gossip message, it must merge the remote state with its local state. - For each node in the remote state:   - If the node is unknown locally, add it to local state (new node discovered)   - If the node is known locally, compare version numbers:     - If remote version > local version, replace local state with remote state     - If remote version == local version, compare heartbeats (higher wins)     - If remote version < local version, keep local state (ignore remote) - State merging must be atomic: lock the peers dictionary during the entire merge operation. - State merging must complete in < 50ms for merging 100 node entries.   UDP Message Format and Handling - Gossip messages must be sent via UDP (connectionless, low overhead, fire-and-forget). - Each message must be JSON-serialized and optionally compressed with gzip to reduce bandwidth. - Message size must be limited to 64KB (UDP datagram limit) to prevent fragmentation. - When a message exceeds 64KB, it must be split into multiple messages or the state must be pruned to fit. - The node must run a background thread to receive UDP messages on its listening port. - When a message is received, it must be deserialized, validated, and merged with local state. - Message loss must be tolerated: the protocol must converge correctly even if 10% of messages are lost (UDP is unreliable).
- Network Partition Handling - The protocol must handle network partitions gracefully: when the cluster splits into 2 partitions, each partition operates independently. - When the partition heals, nodes from both partitions must exchange state and converge to a consistent view. - During a partition, nodes in partition A must mark nodes in partition B as "suspected" → "dead" after timeouts. - When the partition heals, nodes must detect each other as alive again (receive messages) and update status to "alive". - The protocol must prevent split-brain issues: use version numbers and timestamps to resolve conflicts when partitions merge. - Partition healing must complete within O(log N) rounds after network connectivity is restored.  # Anti-Entropy Mechanism - The protocol must implement anti-entropy: periodic full state synchronization to repair inconsistencies. - Every 60 seconds (configurable), each node must perform a full state exchange with a random peer. - Anti-entropy must send the complete local state (all known nodes) to the peer, not just a digest. - Anti-entropy must help recover from message loss, network partitions, and other transient failures. - Anti-entropy overhead must be < 5% of total network bandwidth (most bandwidth used by regular gossip).
- Convergence Time Analysis - For a cluster of N nodes with fanout F, the expected convergence time is O(log_F N) rounds. - For N=10 nodes, F=3: ~2 rounds (2 seconds at 1s interval) - For N=100 nodes, F=3: ~7 rounds (7 seconds) - For N=1000 nodes, F=3: ~10 rounds (10 seconds) - Convergence must be verified by simulation: inject an update at one node, measure time until all nodes have the update. - The protocol must achieve 99% convergence probability within O(log N) rounds (1% of nodes may take longer due to randomness).   Bandwidth and Message Overhead - Each node must send fanout messages per gossip round (default 3 messages/second). - For a 100-node cluster with fanout=3, total network traffic is 300 messages/second across the cluster. - Each message must contain metadata for all known nodes (up to 100 nodes × 1KB metadata = 100KB per message). - With compression, message size should be reduced by ~50% (50KB per message). - Total bandwidth per node: 3 messages/sec × 50KB/message = 150KB/sec = 1.2 Mbps (acceptable for most networks). - Bandwidth must scale linearly with cluster size: doubling cluster size doubles total bandwidth (but per-node bandwidth remains constant).

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
