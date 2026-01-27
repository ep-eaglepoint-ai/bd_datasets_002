# 72473Z - Interface Pollution Map Races and Goroutine Leaks

**Category:** sft

## Overview
- Task ID: 72473Z
- Title: Interface Pollution Map Races and Goroutine Leaks
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 72473z-interface-pollution-map-races-and-goroutine-leaks

## Requirements
- The Plugin interface signature must be changed to return error (standard interface), OR the AnalyticsPlugin.Execute must return nil (untyped) directly, not a variable of type *PluginError. If the refactor keeps var err *PluginError = nil; return err, it is a Fail.
- The stats map must be protected by a sync.RWMutex or replaced with sync/atomic counters
- The resultChan must be buffered (make(chan error, 1)) so the goroutine doesn't block forever if the parent times out, OR the goroutine must respect a context.Context to exit early.
- The ProcessTransaction signature should ideally update to accept context.Context for proper cancellation propagation.
- The final code, when run with "good_input", must print "Transaction SUCCESS". If it still prints "FAILED", the interface bug wasn't fixed.
- The loop inside the goroutine must correctly handle the error.
- The refactored code should typically implement a Mutex inside the PluginManager struct.
- Cancellation Propagation: The internal loop iterating over plugins must check ctx.Done() between iterations. If the user cancels the request (or the timeout fires), the system must stop executing subsequent plugins immediately rather than finishing the list uselessly
- Error Type Fidelity: The refactor must preserve the custom PluginError type information. If the solution catches an error and returns a generic fmt.Errorf("error occurred"), losing the original Code (500), it is a failure. The caller must be able to use errors.As to retrieve the original code.

## Metadata
- Programming Languages: Go (GoLang 1.20+)
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
