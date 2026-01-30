# 4K3UBR - Docker Socket Proxy with Multiplexed Log Inspection

**Category:** sft

## Overview
- Task ID: 4K3UBR
- Title: Docker Socket Proxy with Multiplexed Log Inspection
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 4k3ubr-docker-socket-proxy-with-multiplexed-log-inspection

## Requirements
- Unix Socket Dialing: The code must implement a custom http.Transport that dials unix:///var/run/docker.sock. Trying to dial TCP is a failure.
- Binary Header Parsing: The code must explicitly read the first 8 bytes of a chunk to determine the length.
- Big-Endian Decoding: The payload size (bytes 4-7) must be decoded using binary.BigEndian.Uint32.
- Payload Isolation: Regex matching must occur only on the payload bytes, not on the header bytes.
- Streaming Architecture: The proxy must loop (Read Header -> Read Payload -> Audit -> Write to Client). buffering the whole response is a failure.
- StdOut/StdErr Distinction: The code should correctly identify if the stream is type 1 or 2 (though auditing both is fine).
- Non-Blocking Audit: The regex check should ideally not hold up the byte stream significantly; usage of highly inefficient regex (backtracking) on large chunks should be minimized.
- When a match is found, the side effect (logging) must happen.
- The proxy must handle client disconnection (context.Done) to stop reading from the Docker socket.
- No External SDK: Usage of the official Docker Go SDK is a failure; this is a protocol parsing test.

## Metadata
- Programming Languages: Golang
- Frameworks: (none)
- Libraries: net, net/http, regexp, encoding/binary.
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
