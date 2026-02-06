"""
Async Task Queue Implementation - Debugged Version

This module implements an asynchronous task queue system with worker pools,
task prioritization, retry logic with exponential backoff, and result caching.

FACADE: Implementation details have been moved to `async_queue` package.
This file remains for backward compatibility.
"""

import sys
import os

# Ensure the current directory is in sys.path to find async_queue package
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from async_queue import (
    Task,
    TaskStatus,
    TaskResult,
    RetryPolicy,
    PriorityTaskQueue,
    ResultCache,
    AsyncTaskQueue
)

__all__ = [
    "Task",
    "TaskStatus",
    "TaskResult",
    "RetryPolicy",
    "PriorityTaskQueue",
    "ResultCache",
    "AsyncTaskQueue",
]
