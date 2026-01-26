import os
import json
import subprocess
import time
import uuid
import platform
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

ROOT = Path(__file__).parent.parent.resolve()
REPORTS = ROOT / "evaluation" / "reports"

def environment_info() -> Dict[str, str]:
    """Gather environment information."""
    return {
        "python_version": platform.python_version(),
        "platform": f"{platform.system()} {platform.release()}",
        "java_version": get_java_version()
    }

def get_java_version() -> str:
    """Get Java version."""
    try:
        result = subprocess.run(
            ["java", "-version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        # Java version is in stderr
        version_line = result.stderr.split('\n')[0]
        return version_line.strip()
    except Exception:
        return "unknown"

def run_tests(repo_path: Path) -> Dict[str, Any]:
    """Run Maven tests for a repository."""
    test_result = {
        "passed": False,
        "return_code": 1,
        "output": "",
        "tests_run": 0,
        "failures": 0,
        "errors": 0,
        "skipped": 0
    }
    
    if not repo_path.exists():
        test_result["output"] = f"Repository path does not exist: {repo_path}"
        return test_result
    
    # Create temporary directory for testing
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        temp_repo = Path(temp_dir) / "repo"
        
        try:
            # Copy repository to temporary location
            shutil.copytree(repo_path, temp_repo)
            
            # Helper to copy from source repo if missing in target
            def copy_if_missing(src_subpath, dest_subpath):
                src = ROOT / src_subpath
                dest = temp_repo / dest_subpath
                if src.exists() and not dest.exists():
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    if src.is_dir():
                        shutil.copytree(src, dest, dirs_exist_ok=True)
                    else:
                        shutil.copy(src, dest)

            # Ensure pom.xml and basic integrity
            # For repository_before, we might need infrastructure from repository_after or root
            if not (temp_repo / "pom.xml").exists():
                 copy_if_missing("repository_after/pom.xml", "pom.xml")
                 copy_if_missing("repository_after/src/main/java/com/example/inventory/InventoryApplication.java", "src/main/java/com/example/inventory/InventoryApplication.java")
                 # We might also need Item.java if the tests rely on it and the old code has it as inner class
                 # But if we copy Item.java, we might conflict with inner class. 
                 # Let's try to copy it only if it doesn't conflict or needed. 
                 # Verification strategy: try to run tests.
                 copy_if_missing("repository_after/src/main/java/com/example/inventory/Item.java", "src/main/java/com/example/inventory/Item.java")

            # Copy tests
            tests_src_dir = ROOT / "tests"
            test_dest_dir = temp_repo / "src" / "test" / "java"
            if tests_src_dir.exists():
                shutil.copytree(tests_src_dir, test_dest_dir, dirs_exist_ok=True)

        except Exception as e:
            test_result["output"] = f"Failed to prepare test environment: {str(e)}"
            return test_result
        
        # Run Maven clean test
        cmd = [
            "mvn",
            "-Dmaven.test.failure.ignore=true",
            "-Dsurefire.useFile=false",
            "-DredirectTestOutputToFile=false",
            "-DtrimStackTrace=false",
            "clean",
            "test"
        ]
        
        try:
            result = subprocess.run(
                cmd,
                cwd=temp_repo,
                capture_output=True,
                text=True,
                timeout=240
            )
            
            output = result.stdout + result.stderr
            test_result["return_code"] = result.returncode
            
            if len(output) > 20000:
                output = output[:4000] + "\n...[truncated]...\n" + output[-16000:]
            
            test_result["output"] = output
            
            stats = parse_surefire_reports(temp_repo / "target" / "surefire-reports")
            if stats["tests_run"] == 0:
                stats = parse_maven_output(output)
            test_result.update(stats)

            test_result["passed"] = (
                test_result["tests_run"] > 0 and
                test_result["failures"] == 0 and
                test_result["errors"] == 0
            )
            
        except subprocess.TimeoutExpired:
            test_result["output"] = "Test execution timed out after 240 seconds"
        except Exception as e:
            test_result["output"] = f"Test execution failed: {str(e)}"
    
    return test_result

def parse_maven_output(output: str) -> Dict[str, int]:
    """Parse Maven test output."""
    stats = {"tests_run": 0, "failures": 0, "errors": 0, "skipped": 0}
    for line in output.split('\n'):
        if "Tests run:" in line:
            try:
                parts = line.split(',')
                for part in parts:
                    if "Tests run:" in part:
                        stats["tests_run"] = int(part.split(':')[1].strip())
                    elif "Failures:" in part:
                        stats["failures"] = int(part.split(':')[1].strip())
                    elif "Errors:" in part:
                        stats["errors"] = int(part.split(':')[1].strip())
                    elif "Skipped:" in part:
                        stats["skipped"] = int(part.split(':')[1].strip())
            except (ValueError, IndexError):
                pass
    return stats

def parse_surefire_reports(report_dir: Path) -> Dict[str, int]:
    """Parse Surefire XML reports."""
    stats = {"tests_run": 0, "failures": 0, "errors": 0, "skipped": 0}
    try:
        import xml.etree.ElementTree as ET
        if not report_dir.exists():
            return stats
        for xml_file in report_dir.glob("TEST-*.xml"):
            try:
                tree = ET.parse(xml_file)
                root = tree.getroot()
                tests = root.attrib.get("tests")
                failures = root.attrib.get("failures")
                errors = root.attrib.get("errors")
                skipped = root.attrib.get("skipped")
                if tests: stats["tests_run"] += int(tests)
                else: stats["tests_run"] += len(root.findall(".//testcase"))
                
                if failures: stats["failures"] += int(failures)
                else: stats["failures"] += len(root.findall(".//failure"))
                
                if errors: stats["errors"] += int(errors)
                else: stats["errors"] += len(root.findall(".//error"))
                
                if skipped: stats["skipped"] += int(skipped)
                else: stats["skipped"] += len(root.findall(".//skipped"))
            except Exception:
                pass
    except Exception:
        return stats
    return stats

def run_metrics(repo_path: Path) -> Dict[str, Any]:
    metrics = {"java_file_count": 0, "lines_of_code": 0, "error": None}
    if not repo_path.exists(): return metrics
    try:
        for java_file in repo_path.rglob("*.java"):
            if "/test/" in str(java_file) or "\\test\\" in str(java_file): continue
            metrics["java_file_count"] += 1
            try:
                with open(java_file, 'r', encoding='utf-8', errors='ignore') as f:
                    metrics["lines_of_code"] += len(f.readlines())
            except Exception: pass
    except Exception as e: metrics["error"] = str(e)
    return metrics

def evaluate(repo_name: str) -> Dict[str, Any]:
    repo_path = ROOT / repo_name
    return {"tests": run_tests(repo_path), "metrics": run_metrics(repo_path)}

def print_report(report: Dict[str, Any], report_path: Path):
    print("=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    print(f"Run ID: {report['run_id']}")
    
    before = report["before"]
    print(f"\nBEFORE (repository_before):")
    print(f"  Tests passed: {before['tests']['passed']}")
    print(f"  Tests run: {before['tests']['tests_run']}")
    print(f"  Failures: {before['tests']['failures']}")
    
    after = report["after"]
    print(f"\nAFTER (repository_after):")
    print(f"  Tests passed: {after['tests']['passed']}")
    print(f"  Tests run: {after['tests']['tests_run']}")
    print(f"  Failures: {after['tests']['failures']}")
    
    print(f"\nSUCCESS: {report['success']}")
    print(f"Report written to {report_path}")

def main():
    run_id = str(uuid.uuid4())
    start_time = time.time()
    
    print("Starting evaluation...")
    before = evaluate("repository_before")
    after = evaluate("repository_after")
    
    passed_gate = after["tests"]["passed"] and after["tests"]["tests_run"] > 0
    
    report = {
        "run_id": run_id,
        "environment": environment_info(),
        "before": before,
        "after": after,
        "success": passed_gate,
        "comparison": {
            "passed_gate": passed_gate,
            "test_improvement": after["tests"]["tests_run"] - after["tests"]["failures"]
        },
        "duration_seconds": time.time() - start_time
    }
    
    report_dir = REPORTS / datetime.now().strftime("%Y-%m-%d/%H-%M-%S")
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "report.json"
    
    with open(report_path, 'w') as f: json.dump(report, f, indent=2)
    
    print_report(report, report_path)
    exit(0 if passed_gate else 1)

if __name__ == "__main__":
    main()
