import json
import subprocess
import datetime
import os

print("============================================================")
print("MVCC KV Store - Evaluation")
print("============================================================\n")

# Run pytest on repository_after
result = subprocess.run(["pytest", "-q", "tests"], capture_output=True, text=True)

passed = result.stdout.count(".")
failed = result.stdout.count("F")

total = passed + failed

print(" Evaluating repository_after...")
print(f"    Passed: {passed}")
print(f"    Failed: {failed}")

now = datetime.datetime.utcnow()
date_str = now.strftime("%Y-%m-%d")
time_str = now.strftime("%H-%M-%S")
output_dir = os.path.join("evaluation", date_str, time_str)
os.makedirs(output_dir, exist_ok=True)

report = {
    "timestamp": now.isoformat(),
    "repository_after": {
        "metrics": {"total": total, "passed": passed, "failed": failed}
    },
    "success": failed == 0 and total > 0,
}

with open(os.path.join(output_dir, "report.json"), "w") as f:
    json.dump(report, f, indent=2)

print("\n============================================================")
print("EVALUATION SUMMARY")
print("============================================================")
print(f"Total Tests: {total}")
print(f"Passed: {passed}")
print(f"Failed: {failed}")
print(f"Success Rate: {(passed/total*100) if total else 0:.1f}%")
print(f"Overall: {'PASS' if report['success'] else 'FAIL'}")
print("============================================================")

if not report["success"]:
    exit(1)
