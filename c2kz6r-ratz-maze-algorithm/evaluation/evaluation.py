import os
import sys
import json
import uuid
import platform
import subprocess
import argparse
from datetime import datetime
from pathlib import Path

# --- Helper functions ---

def generate_run_id():
    return uuid.uuid4().hex[:8]

def get_git_info():
    git_info = {"git_commit": "unknown", "git_branch": "unknown"}
    try:
        # Simple timeout to prevent hanging if git is not configured
        result = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0: git_info["git_commit"] = result.stdout.strip()[:8]
        result = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0: git_info["git_branch"] = result.stdout.strip()
    except Exception: pass
    return git_info

def get_environment_info():
    git = get_git_info()
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "os": platform.system(),
        "git_commit": git["git_commit"],
        "git_branch": git["git_branch"],
    }

def generate_output_path(project_root):
    now = datetime.now()
    # Save reports to project_root/evaluation/reports/...
    output_dir = project_root / "evaluation" / "reports" / now.strftime("%Y-%m-%d") / now.strftime("%H-%M-%S")
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / "report.json"

def parse_pytest_verbose_output(output):
    """
    Parses pytest stdout to identify which specific tests passed/failed.
    """
    tests = []
    lines = output.split('\n')
    for line in lines:
        line = line.strip()
        # Look for standard pytest verbose output (e.g., tests/test_maze.py::test_name PASSED)
        if '::' in line:
            outcome = None
            if ' PASSED' in line: outcome = "passed"
            elif ' FAILED' in line: outcome = "failed"
            elif ' ERROR' in line: outcome = "error"
            elif ' SKIPPED' in line: outcome = "skipped"

            if outcome:
                parts = line.split(' ')
                # Extract the test path/nodeid
                nodeid = parts[0]
                # Extract just the function name (test_basic_correctness)
                test_name = nodeid.split("::")[-1]
                tests.append({"nodeid": nodeid, "name": test_name, "outcome": outcome})
    return tests

def run_evaluation_tests(tests_dir, repo_dir):
    """
    Runs pytest with the specific repository directory added to PYTHONPATH.
    This ensures 'import maze' loads the version from repo_dir.
    """
    env = os.environ.copy()

    # CRITICAL: We strictly set PYTHONPATH to ONLY the target repo + standard paths.
    # We do NOT append to existing PYTHONPATH if it contains conflicting repo paths.
    # However, for safety in this environment, prepending is usually sufficient
    # because Python imports from the first match.
    env["PYTHONPATH"] = str(repo_dir) + os.pathsep + env.get("PYTHONPATH", "")

    # Run pytest
    # -v: verbose (needed for parser)
    # --tb=short: shorter tracebacks to keep log size manageable
    cmd = [sys.executable, "-m", "pytest", str(tests_dir), "-v", "--tb=short"]

    try:
        # 120s timeout should be plenty for unit tests, even the slow legacy ones
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120, env=env)
        stdout = result.stdout
        stderr = result.stderr
        tests = parse_pytest_verbose_output(stdout)

        summary = {
            "total": len(tests),
            "passed": sum(1 for t in tests if t["outcome"] == "passed"),
            "failed": sum(1 for t in tests if t["outcome"] == "failed"),
            "errors": sum(1 for t in tests if t["outcome"] == "error"),
            "skipped": sum(1 for t in tests if t["outcome"] == "skipped"),
        }

        # Determine success based on return code
        # Pytest returns 0 if all passed, 1 if some failed
        success = (result.returncode == 0)

        return {
            "success": success,
            "exit_code": result.returncode,
            "tests": tests,
            "summary": summary,
            "stdout": stdout,
            "stderr": stderr
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 1},
            "stdout": "",
            "stderr": "Evaluation timed out (likely infinite loop or recursion hang)."
        }
    except Exception as e:
        return {
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 1},
            "stdout": "",
            "stderr": str(e)
        }

def map_criteria(tests):
    """
    Maps specific Maze Solver test names to the architectural criteria
    defined in the task requirements.
    """
    def check(name_fragment):
        for t in tests:
            if name_fragment in t["name"]:
                return "Pass" if t["outcome"] == "passed" else "Fail"
        return "Not Run"

    return {
        # Requirement 1 & 7: BFS Shortest Path Guarantee
        "optimality_guarantee": check("test_bfs_optimality_trap"),

        # Requirement 2: In-place modification (Memory Efficiency)
        "memory_efficiency": check("test_maze_is_modified_in_place"),

        # Requirement 4: Iterative Implementation (No Recursion Limit)
        "scalability_recursion_safety": check("test_recursion_limit_safe"),

        # Requirement 7: Strict Return Type (Empty Path vs Exception)
        "strict_return_contract": check("test_no_solution_returns_empty"),

        # Requirement 8: Edge Case Handling
        "input_validation_empty": check("test_empty_maze_raises"),
        "input_validation_bounds": check("test_out_of_bounds_raises"),
        "input_validation_walls": check("test_walls_raise_error"),
    }

# --- Main Evaluation Logic ---

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=str, default=None, help="Custom path for report.json")
    args = parser.parse_args()

    run_id = generate_run_id()

    # PATH RESOLUTION
    current_file_path = Path(__file__).resolve()

    # Determine Project Root
    # If script is in /app/evaluation/evaluation.py, root is /app
    if current_file_path.parent.name == "evaluation":
        project_root = current_file_path.parent.parent
    else:
        project_root = current_file_path.parent

    tests_dir = project_root / "tests"

    if not tests_dir.exists():
        # Fallback check
        if (project_root / "test_maze.py").exists():
             tests_dir = project_root
        else:
            print(f"Error: Could not locate tests directory or test_maze.py at {tests_dir}")
            sys.exit(1)

    print(f"🔍 Starting Maze Solver Evaluation [Run ID: {run_id}]")

    # 1. Evaluate BEFORE (Legacy / Recursive DFS)
    repo_before = project_root / "repository_before"
    results_before = None
    if repo_before.exists():
        print(f"Running evaluation on BEFORE (Legacy Implementation)...")
        results_before = run_evaluation_tests(tests_dir, repo_before)
    else:
        print(f"Warning: {repo_before} not found. Skipping baseline comparison.")

    # 2. Evaluate AFTER (Optimized / Iterative BFS)
    repo_after = project_root / "repository_after"
    results_after = None
    if repo_after.exists():
        print(f"Running evaluation on AFTER (Optimized Implementation)...")
        results_after = run_evaluation_tests(tests_dir, repo_after)
    else:
        print(f"Error: {repo_after} not found at {repo_after}. Cannot proceed.")
        sys.exit(1)

    # 3. Analyze Criteria (Based on AFTER results)
    criteria_analysis = map_criteria(results_after["tests"]) if results_after else {}

    # 4. Construct Report
    report = {
        "run_id": run_id,
        "tool": "Maze Solver Performance Evaluator",
        "started_at": datetime.now().isoformat(),
        "environment": get_environment_info(),
        "before": results_before,
        "after": results_after,
        "criteria_analysis": criteria_analysis,
        "comparison": {
            "summary": "Comparison of Recursive DFS vs Iterative BFS",
            "improvement_detected": (
                results_before and results_after and
                results_after["summary"]["passed"] > results_before["summary"]["passed"]
            ),
            "recursion_crash_fixed": (
                results_before and results_before["summary"]["errors"] > 0 and
                results_after and results_after["summary"]["errors"] == 0
            ) if results_before else None
        },
        "success": results_after["success"]
    }

    # 5. Output
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = generate_output_path(project_root)

    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n✅ Report saved to: {output_path}")

    if results_before:
        print(f"Before: {results_before['summary']['passed']} passed, {results_before['summary']['failed']} failed, {results_before['summary']['errors']} errors")
        # Explicitly mention if legacy crashed (common with recursion tests)
        if results_before['summary']['errors'] > 0:
            print("        (Legacy code likely crashed on recursion/timeout tests)")

    if results_after:
        print(f"After : {results_after['summary']['passed']} passed, {results_after['summary']['failed']} failed, {results_after['summary']['errors']} errors")
        print("-" * 50)
        print("ARCHITECTURAL CRITERIA STATUS:")
        for k, v in criteria_analysis.items():
            icon = '✅' if v == 'Pass' else '❌' if v == 'Fail' else '⚠️'
            print(f"{icon} {k.replace('_', ' ').title()}: {v}")

    sys.exit(0 if results_after["success"] else 1)

if __name__ == "__main__":
    main()