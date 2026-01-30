# F6R421 - Windows Thread Suspension via P/Invoke and Token Privilege Elevation

**Category:** sft

## Overview
- Task ID: F6R421
- Title: Windows Thread Suspension via P/Invoke and Token Privilege Elevation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: f6r421-windows-thread-suspension-via-p-invoke-and-token-privilege-elevation

## Requirements
- The following system Requirements are for windows users only for those of you who are on linux distros use you own choice packages and implementation accordingly
- Must use ctypes.windll.kernel32. Usage of psutil for the suspension action is an automatic failure
- The code must call CreateToolhelp32Snapshot and Thread32First/Thread32Next.
- Every OpenThread handle must be closed via CloseHandle. Leaking handles is a failure.
- Any reference to signal.SIGSTOP is a failure.
- Must use GetForegroundWindow to find the active PID.
- The code must attempt to enable SeDebugPrivilege. Without this, it cannot suspend Admin processes (and often even User processes depending on UAC).
- The code must theoretically support (or implement) the matching ResumeThread loop.
- UWP/Modern App Handling: The logic should effectively handle the PID mapping (standard GetWindowThreadProcessId is usually sufficient for the benchmark, but awareness of UWP ApplicationFrameHost is a plus).
- The ctypes structures (PROCESSENTRY32, THREADENTRY32) must be defined correctly with the right field types (c_long, c_char, etc.) and packing.
- If SuspendThread fails (returns -1), the code should log it and not crash.

## Metadata
- Programming Languages: Python 3.10+
- Frameworks: (none)
- Libraries: ctypes, time. (Forbidden: psutil.suspend, pywin32 wrappers).
- Databases: (none)
- Tools: (none)
- Best Practices: For those of you who are on linux, you can change the same exact problem statement to the linux distros u are using
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
