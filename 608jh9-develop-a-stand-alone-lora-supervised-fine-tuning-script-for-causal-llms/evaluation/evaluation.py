import json
import os
import platform
import re
import subprocess
import time
from datetime import datetime
from pathlib import Path
from secrets import token_hex


def generate_run_id() -> str:
    return token_hex(4)


def get_environment_info() -> dict:
    return {
        "python_version": platform.python_version(),
        "platform": platform.system(),
        "os_type": platform.platform(),
        "execution_mode": "Inside Docker Container"
        if os.getenv("INSIDE_DOCKER") == "true"
        else "Host Machine",
    }


def generate_output_path(custom_path: str | None = None) -> Path:
    if custom_path:
        return Path(custom_path).resolve()

    now = datetime.utcnow()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")
    eval_dir = Path(__file__).resolve().parent
    output_dir = eval_dir / "reports" / date_str / time_str
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / "report.json"


def parse_pytest_output(stdout: str, stderr: str) -> list[dict]:
    tests = []
    combined = stdout + "\n" + stderr
    ansi_escape = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]")
    clean_output = ansi_escape.sub("", combined)

    pattern = re.compile(
        r"^(.*?::.*?)(?:\s+)(PASSED|FAILED|SKIPPED|XFAILED|XPASSED)(?:\s+\[.*?\])?$",
        re.MULTILINE,
    )
    matches = pattern.findall(clean_output)
    for name, status in matches:
        if status in {"PASSED", "XPASSED"}:
            outcome = "passed"
        elif status in {"FAILED", "XFAILED"}:
            outcome = "failed"
        else:
            outcome = "skipped"
        tests.append({"suite": "pytest", "name": name.strip(), "outcome": outcome})

    if tests:
        return tests

    for line in clean_output.splitlines():
        line = line.strip()
        match = re.match(r"(.+?)\s+(PASSED|FAILED)(\s+\[.*\])?$", line)
        if match:
            name, status = match.groups()
            tests.append(
                {
                    "suite": "pytest",
                    "name": name,
                    "outcome": "passed" if status == "PASSED" else "failed",
                }
            )

    return tests


def run_evaluation_tests() -> dict:
    print("Starting Evaluation Tests...")

    if os.getenv("INSIDE_DOCKER") == "true":
        command = ["pytest", "-v", "tests/sft_lora_test.py"]
    else:
        command = [
            "docker",
            "compose",
            "run",
            "--rm",
            "app",
            "pytest",
            "-v",
            "tests/sft_lora_test.py",
        ]

    start_time = time.time()

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=120,
            env={**os.environ, "CI": "true"},
        )

        tests = parse_pytest_output(result.stdout, result.stderr)
        summary = {
            "total": len(tests),
            "passed": sum(1 for t in tests if t["outcome"] == "passed"),
            "failed": sum(1 for t in tests if t["outcome"] == "failed"),
            "errors": 1 if result.returncode != 0 and not tests else 0,
        }

        return {
            "success": result.returncode == 0 or summary["failed"] == 0,
            "exit_code": result.returncode,
            "tests": tests,
            "summary": summary,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "duration_ms": int((time.time() - start_time) * 1000),
        }
    except Exception as exc:
        return {
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 1},
            "stdout": "",
            "stderr": str(exc),
            "duration_ms": int((time.time() - start_time) * 1000),
        }


def map_criteria(tests: list[dict]) -> dict:
    def check(name_fragments: list[str]) -> str:
        matches = [
            t
            for t in tests
            if any(frag.lower() in t["name"].lower() for frag in name_fragments)
        ]
        if not matches:
            return "Not Run"
        return "Fail" if any(t["outcome"] == "failed" for t in matches) else "Pass"

    return {
        "prompt_format": check(["prompt_structure"]),
        "jsonl_tokenization": check(["jsonl_loading_and_tokenization"]),
        "lora_training_and_merge": check(["train_sft_saves_adapter_and_merge"]),
    }


def main() -> None:
    run_id = generate_run_id()
    print(f"Starting LoRA SFT Evaluation [Run ID: {run_id}]")

    results = run_evaluation_tests()
    criteria_analysis = map_criteria(results["tests"])

    report = {
        "run_id": run_id,
        "tool": "LoRA SFT Evaluator",
        "started_at": datetime.utcnow().isoformat() + "Z",
        "environment": get_environment_info(),
        "before": None,
        "after": results,
        "criteria_analysis": criteria_analysis,
        "comparison": {
            "summary": "Containerized Evaluation",
            "success": results["success"],
        },
    }

    output_path = generate_output_path()
    output_path.write_text(json.dumps(report, indent=2))

    print("\n---------------------------------------------------")
    print(f"Tests Run: {results['summary']['total']}")
    print(f"Passed:    {results['summary']['passed']}")
    print(f"Failed:    {results['summary']['failed']}")
    print("---------------------------------------------------")
    print(f"Report saved to: {output_path}")


if __name__ == "__main__":
    main()
