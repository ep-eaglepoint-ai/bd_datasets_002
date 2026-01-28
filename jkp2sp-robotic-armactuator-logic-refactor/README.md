# JKP2SP - robotic-ArmActuator-Logic-Refactor

**Category:** sft

## Overview
- Task ID: JKP2SP
- Title: robotic-ArmActuator-Logic-Refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: jkp2sp-robotic-armactuator-logic-refactor

## Requirements
- Decoupled Architecture: Separate the code into three distinct entities: an `IProtocolDecoder`, a `KinematicsTransformer`, and a `SafetyWatchdog`.
- State Management: Eliminate global package variables (`CurrentX`) in favor of an instance-based 'ArmState' struct that is passed via dependency injection or managed via a secure constructor.
- Safety Enforcement: Refactor the 'SafetyWatchdog' so it is called as a separate validator step; it must operate strictly on standardized internal units (mm) to avoid unit-conversion errors in its checks.
- rotocol Independence: Ensure that the binary parsing logic can be changed or extended without touching the movement logic or the safety rules.
- Error Transparency: Return detailed custom errors (e.g., `ProtocolError`, `SafetyThresholdError`) instead of using generic string-based errors.
- Concurrency: Implement thread-safe access to the state using a `sync.RWMutex`, allowing multiple readers to check current coordinates while only allowing one concurrent 'Write' (Move) command.
- Testing Requirement: Write a test that uses a mock 'SafetyMonitor' that intentionally returns an error; verify the system rejects the `MoveCommand` before updating the internal `CurrentX` position.
- Testing Requirement: Provide a unit test demonstrating correct coordinate transformation for 'inches' to 'mm', ensuring the SafetyWatchdog sees the correct converted value.
- Testing Requirement: Verify that a malformed byte buffer results in a specific protocol error and does not enter the kinematic or safety processing blocks.

## Metadata
- Programming Languages: Go
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
