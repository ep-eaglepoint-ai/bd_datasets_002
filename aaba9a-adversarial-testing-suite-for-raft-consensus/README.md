# AABA9A - Adversarial-Testing-Suite-for-Raft-Consensus

**Category:** sft

## Overview
- Task ID: AABA9A
- Title: Adversarial-Testing-Suite-for-Raft-Consensus
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: aaba9a-adversarial-testing-suite-for-raft-consensus

## Requirements
- Mock Network Partitions via Pytest Fixtures: Implement a helper or fixture that utilizes the RaftNodeProxy to create "Bridge" and "Cyclic" partitions. Purpose: This mocks real-world network failures to verify that the cluster correctly pauses operations when a quorum is lost and does not commit split-brain data.
- Concurrent Client Simulation: Use pytest-asyncio to launch multiple concurrent tasks that perform randomized set_val and get_val calls via the Client API. Purpose: This mocks heavy user traffic during network instability to ensure the internal Raft state machine remains consistent under race conditions.
- Safety Assertions (Linearizability): Implement a validation step within your test that iterates through the recorded history to assert that no "stale reads" occurred (e.g., reading a value that was superseded by a confirmed write). Purpose: To verify the "State Machine Safety" property, ensuring the black-box system provides a single-threaded execution appearance.
- Liveness and Recovery Assertions: Write a test case that injects a partition, heals it using the Management API, and then uses a pytest.raises or a timeout-based assertion to ensure the cluster resumes processing writes within 5 seconds. Purpose: To verify "Liveness" by proving the cluster can successfully re-elect a leader and recover from transient failures.
- Term Monotonicity Polling: Within the main test loop, periodically query the Management API to assert that a node’s currentTerm never regresses to a lower number. Purpose: To catch critical protocol violations where a node might incorrectly "forget" its election state after a partition or crash.
- Post-Chaos Consistency Check: Implement a final assertion that queries the same key from every node once the network is healed. Purpose: To verify "Eventual Consistency," ensuring that all nodes in the cluster have successfully replicated and committed the same final state.
- Fault-Injection Interleaving: Use a loop within your pytest function to alternate between mocking a fault (partition/latency) and performing a data operation. Purpose: This mocks "Unstable Network" scenarios to ensure the SUT (System Under Test) can transition through multiple election cycles without losing data or deadlocking.
- Adversarial Parameterization: Use @pytest.mark.parametrize to run the same test logic with different chaos settings, such as varying packet loss percentages or different partition sizes (e.g., 2v3 vs 1v4). Purpose: To verify the robustness of the consensus logic across different cluster scales and failure severities.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: pytest, pytest-asyncio
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
