# VZDTIC - Distributed-Consensus-Raft-KV-Store

**Category:** sft

## Overview
- Task ID: VZDTIC
- Title: Distributed-Consensus-Raft-KV-Store
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: vzdtic-distributed-consensus-raft-kv-store

## Requirements
- Implement the complete Raft state machine including Leader Election with randomized timeouts and heartbeat mechanisms.
- Develop a log replication protocol that ensures all committed entries are eventually present on a majority of cluster nodes in the correct order.
- Ensure linearizability for all read and write operations; stale reads from partitioned leaders must be prevented via 'read indices' or heartbeats.
- Implement a persistent Write-Ahead Log (WAL) that stores the current term, votedFor, and all log entries to allow for crash recovery.
- Design a membership management interface that allows for the graceful addition or removal of nodes without taking the cluster offline.
- Testing: Implement a deterministic simulation environment to inject network partitions (e.g., isolating the leader) and verify cluster safety properties.
- Testing: Provide a suite of TLA+ inspired model-checking tests or randomized 'Jepsen-style' tests to validate that no two nodes ever commit different values for the same index.
- The system must handle 'log compaction' via snapshots when the WAL exceeds a configurable size to prevent unbounded disk usage.

## Metadata
- Programming Languages: Go
- Frameworks: gRPC, Protobuf
- Libraries: (none)
- Databases: A custom Write-Ahead Log (WAL), with mocked db layer
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: Election Convergence Time, Commit Latency, Throughput
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
