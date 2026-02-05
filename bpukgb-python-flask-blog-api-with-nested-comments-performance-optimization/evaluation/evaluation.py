import json
import os
import platform
import subprocess
from datetime import datetime


def get_environment_info():
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "execution_mode": "Inside Docker Container"
        if os.environ.get("INSIDE_DOCKER") == "true"
        else "Host Machine",
    }


def run_pytest(target_repo: str):
    env = os.environ.copy()
    env["TARGET_REPO"] = target_repo
    env["CI"] = "true"

    command = [
        "python",
        "-m",
        "pytest",
        "-vv",
        "--disable-warnings",
        "tests",
    ]

    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
        cwd=os.path.dirname(os.path.dirname(__file__)),
    )

    tests = parse_pytest_output(result.stdout + "\n" + result.stderr)
    summary = {
        "total": len(tests),
        "passed": len([t for t in tests if t["outcome"] == "passed"]),
        "failed": len([t for t in tests if t["outcome"] == "failed"]),
        "errors": 0 if tests else (1 if result.returncode != 0 else 0),
    }

    return {
        "success": summary["failed"] == 0 and summary["errors"] == 0,
        "exit_code": result.returncode,
        "tests": tests,
        "summary": summary,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "duration_ms": 0,
    }


def parse_pytest_output(output: str):
    tests = []
    for line in output.splitlines():
        line = line.strip()
        if "::" in line and ("PASSED" in line or "FAILED" in line):
            parts = line.split()
            if not parts:
                continue
            name = parts[0]
            outcome = "passed" if "PASSED" in line else "failed"
            tests.append({"name": name, "outcome": outcome})
    return tests


def map_criteria(tests):
    def check(fragment):
        matching = [t for t in tests if fragment in t["name"]]
        if not matching:
            return "Not Run"
        return "Fail" if any(t["outcome"] == "failed" for t in matching) else "Pass"

    return {
        "parent_id_index": check("test_parent_id_index"),
        "lazy_loading": check("test_post_comments_lazy_loading"),
        "sql_filtering": check("test_filtering_happens_in_sql"),
        "n_plus_one": check("test_no_n_plus_one_queries"),
        "depth_limit": check("test_max_depth_truncation"),
        "keyset_pagination": check("test_keyset_pagination_stability"),
        "caching": check("test_cache_skips_repeated_queries"),
        "count_query": check("test_comment_count_uses_count_query"),
        "bulk_delete": check("test_bulk_delete_descendants"),
        "no_comment_join": check("test_posts_query_no_comment_join"),
        "linear_tree_build": check("test_tree_builder_uses_dictionary_lookup"),
        "session_scope": check("test_session_scope_exists"),
    }


def write_report(report):
    output_dir = os.path.join(os.path.dirname(__file__), "reports")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "report.json")
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    return output_path


def main():
    before_results = run_pytest("repository_before")
    after_results = run_pytest("repository_after")

    report = {
        "run_id": "deterministic-run",
        "tool": "Blog API Performance Evaluator",
        "started_at": "1970-01-01T00:00:00Z",
        "environment": get_environment_info(),
        "before": before_results,
        "after": after_results,
        "criteria_analysis": {
            "before": map_criteria(before_results["tests"]),
            "after": map_criteria(after_results["tests"]),
        },
        "comparison": {
            "summary": "Containerized Evaluation",
            "success": after_results["success"],
        },
    }

    output_path = write_report(report)
    print(f"Report saved to: {output_path}")


if __name__ == "__main__":
    main()
