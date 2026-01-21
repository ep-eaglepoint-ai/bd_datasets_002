# 3TXGYR - Comprehensive Test Suite for EDI Claims Parser

**Category:** sft

## Overview
- Task ID: 3TXGYR
- Title: Comprehensive Test Suite for EDI Claims Parser
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 3txgyr-comprehensive-test-suite-for-edi-claims-parser

## Requirements
- Must cover all 10 segment types (BHT, HI, CLM, DTP, NM1, LX, SV1, SV2, SBR, REF) with table-driven tests validating correct field extraction, business rule application, and edge cases for each segment.
- Must test all error paths including HTTP service failures (timeout, non-200 status, network errors), zip file read errors (corrupted files, permission issues), JSON unmarshal failures, and context cancellation with proper error type validation using errors.Is() and errors.As(). Concurrency Safety: Must include tests with 10+ concur
- Must include tests with 10+ concurrent goroutines validating thread-safe operation. Must pass with -race flag. MockLogger must use proper mutex synchronization for goroutine safety.
- Must verify no goroutine leaks (runtime.NumGoroutine() returns to baseline), no file descriptor leaks (on Linux, check /proc/self/fd count), and proper cleanup of HTTP connections using t.Cleanup() or defer statements.
- Tests must validate exact claim.Claim structure population with correct patient names, insurance IDs, service line amounts, dates, modifiers, and all fields matching expected business logic outputs.
- Must use Go 1.21+ features, no deprecated APIs (no ioutil package). All code must compile without warnings using go vet. Uses only standard library (testing, httptest, context, etc.) - no external test frameworks.
- Tests must pass with -shuffle=on -count=10 proving no shared state between tests. Each test uses isolated temp directories and independent mock servers. No cross-test contamination.
- Test suite must complete in under 30 seconds. Must include benchmark tests with memory allocation tracking (testing.B.ReportAllocs()) validating reasonable resource usage per operation.
- Must include 3+ fuzz tests using Go 1.18+ testing.F for random EDI content, corrupted ZIP structures, and malformed JSON responses. Fuzz tests must run minimum 10 seconds without panics.
- est names must serve as living compliance documentation (e.g., Test_BHT_Segment_ValidSubmissionDate_SetsClaimDate). Must include business rule descriptions in test logs for SOC 2 audit requirements.

## Metadata
- Programming Languages: GO
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
