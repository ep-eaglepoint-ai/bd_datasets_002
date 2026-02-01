#!/usr/bin/env python3
import sys
import os
import json
import uuid
import platform
import subprocess
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"

def environment_info() -> dict:
    """Capture execution environment"""
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }

def run_tests(repo_name: str) -> dict:
    """
    Execute pytest on specified repository.
    Returns: {passed: bool, return_code: int, output: str}
    """
    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = f"{ROOT / repo_name}:{ROOT}"
        proc = subprocess.run(
            ["pytest", "../tests/comprehensive", "-v"],
            cwd=ROOT / repo_name,
            capture_output=True,
            text=True,
            env=env,
            timeout=360 # Increased to match or exceed pytest timeout
        )
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": (proc.stdout + proc.stderr)[:8000]  # Truncate
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": "pytest timeout (>360s)"
        }

def run_metrics(repo_path: Path) -> dict:
    """
    Collect performance metrics by running a controlled benchmark.
    Measures actual execution time to demonstrate optimization impact.
    """
    try:
        import tempfile
        import time
        
        # Create a small benchmark dataset (100 records for speed)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            for i in range(100):
                f.write(json.dumps({"text": f"Benchmark record {i} " * 10}) + "\n")
            input_path = f.name
        
        with tempfile.TemporaryDirectory() as tmp_dir:
            index_path = os.path.join(tmp_dir, "bench.faiss")
            store_path = os.path.join(tmp_dir, "bench.jsonl")
            
            env = os.environ.copy()
            env["PYTHONPATH"] = str(repo_path) + ":" + str(ROOT)
            
            # Measure execution time
            start = time.perf_counter()
            proc = subprocess.run(
                [
                    "python", str(repo_path / "build_index.py"),
                    "--input", input_path,
                    "--index", index_path,
                    "--store", store_path
                ],
                capture_output=True,
                text=True,
                env=env,
                timeout=30
            )
            duration_ms = (time.perf_counter() - start) * 1000
            
        os.unlink(input_path)
        
        if proc.returncode == 0:
            return {
                "avg_time_ms": round(duration_ms, 2),
                "records_processed": 100,
                "throughput_records_per_sec": round(100 / (duration_ms / 1000), 2)
            }
        else:
            return {"error": "benchmark_failed"}
            
    except Exception as e:
        return {"error": str(e)}

def _generate_improvement_summary(before: dict, after: dict) -> str:
    """Generate a human-readable summary of improvements"""
    parts = []
    
    # Test status
    if after["tests"]["passed"] and not before["tests"]["passed"]:
        parts.append("✅ All tests passing after optimization")
    elif after["tests"]["passed"]:
        parts.append("✅ Tests passing (maintained correctness)")
    
    # Performance metrics
    before_metrics = before.get("metrics", {})
    after_metrics = after.get("metrics", {})
    
    if "avg_time_ms" in before_metrics and "avg_time_ms" in after_metrics:
        before_time = before_metrics["avg_time_ms"]
        after_time = after_metrics["avg_time_ms"]
        speedup = before_time / after_time if after_time > 0 else 0
        parts.append(f"⚡ {speedup:.1f}x faster ({before_time:.0f}ms → {after_time:.0f}ms)")
    
    return " | ".join(parts) if parts else "Optimization complete"

def run_evaluation() -> dict:
    """
    Main evaluation logic.
    Returns: Standard report structure
    """
    run_id = str(uuid.uuid4())
    start = datetime.now(timezone.utc)
    
    before = {
        "tests": run_tests("repository_before"),
        "metrics": run_metrics(ROOT / "repository_before")
    }
    
    after = {
        "tests": run_tests("repository_after"),
        "metrics": run_metrics(ROOT / "repository_after")
    }
    
    comparison = {
        "passed_gate": after["tests"]["passed"],
        "improvement_summary": _generate_improvement_summary(before, after)
    }
    
    end = datetime.now(timezone.utc)
    
    report = {
        "run_id": run_id,
        "started_at": start.isoformat() + "Z",
        "finished_at": end.isoformat() + "Z",
        "duration_seconds": (end - start).total_seconds(),
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison["passed_gate"],
        "error": None
    }
    
    # Save report
    REPORTS.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS / f"report_{run_id}.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    return report

def main() -> int:
    """
    Entry point. Returns 0 for success, 1 for failure.
    """
    try:
        report = run_evaluation()
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"Evaluation Report: {report['run_id']}")
        print(f"{'='*60}")
        print(f"Before - Passed: {report['before']['tests']['passed']}")
        print(f"After  - Passed: {report['after']['tests']['passed']}")
        print(f"Success: {report['success']}")
        print(f"{'='*60}\n")
        
        return 0
    except Exception as e:
        print(f"Evaluation failed: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
