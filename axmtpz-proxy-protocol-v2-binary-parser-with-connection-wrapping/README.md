# AXMTPZ - PROXY Protocol v2 Binary Parser with Connection Wrapping

**Category:** sft

## Overview
- Task ID: AXMTPZ
- Title: PROXY Protocol v2 Binary Parser with Connection Wrapping
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: axmtpz-proxy-protocol-v2-binary-parser-with-connection-wrapping

## Requirements
- Must NOT use external libraries (e.g., go-proxyproto). Standard net only.
- Must validate the exact 12-byte binary signature (\x0D\x0A\x0D\x0A\x00\x0D\x0A\x51\x55\x49\x54\x0A)
- Must use binary.BigEndian to parse the 16-bit Length and Port fields.
- Must read the "Total Length" field first, then read exactly that many bytes to capture the full header.
- Must correctly differentiate and parse IPv4 (4-byte IPs) and IPv6 (16-byte IPs) based on the Family byte.
- Must return a custom struct that implements the net.Conn interface.
- The wrapper's RemoteAddr() method must return the extracted Client IP/Port, not the Load Balancer's IP.
- Any bytes read after the PROXY header (the application payload) must be buffered and returned in subsequent Read() calls
- Must return a specific error if the signature is invalid or the header is truncated.
- Must use net.IP types for address storage.
- Must perform the handshake immediately upon wrapping, but block payload reads until the handshake completes.

## Metadata
- Programming Languages: Go (Golang 1.18+)
- Frameworks: (none)
- Libraries: net, io, encoding/binary, bytes.
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
