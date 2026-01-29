import sys
import json

import uuid
import platform
import subprocess
import os
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
REPORTS_DIR = ROOT / "evaluation" / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def environment_info():
    """Collect environment information"""
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "go_version": get_go_version()
    }


def get_go_version():
    """Get Go version if available"""
    try:
        result = subprocess.run(
            ["go", "version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
        return "Go not available"
    except:
        return "Go not available"


def run_tests_before():
    """
    Run tests on repository_before (empty baseline)
    Expected to fail as no implementation exists
    """
    try:
        return {
            "passed": False,
            "return_code": 1,
            "output": "repository_before is empty (baseline state with no implementation)",
            "test_count": 0,
            "passed_count": 0,
            "failed_count": 0
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": -1,
            "output": f"Error evaluating repository_before: {str(e)}",
            "test_count": 0,
            "passed_count": 0,
            "failed_count": 0
        }


def run_tests_after():
    """Runs tests for the after-repository implementation."""
    print(f"\n📂 Evaluating repository_after (implementation)...")
    
    try:
        # Run Go tests
        proc = subprocess.run(
            ["go", "test", "-v", "./..."],
            cwd="/app/tests",
            capture_output=True,
            text=True,
            timeout=120,
            env=os.environ.copy()
        )
        
        output = proc.stdout + proc.stderr
        passed = proc.returncode == 0
        
        # Parse test results
        tests_run = output.count("=== RUN")
        tests_passed = output.count("--- PASS")
        tests_failed = output.count("--- FAIL")
        
        print(f"   Status: {'✅ PASS' if passed else '❌ FAIL'}")
        if tests_run > 0:
            print(f"   Tests: {tests_run} total, {tests_passed} passed, {tests_failed} failed")
            
        return {
            "passed": passed,
            "output": output,
            "test_count": tests_run,
            "passed_count": tests_passed,
            "failed_count": tests_failed,
            "metrics": {
                "tests_run": tests_run,
                "tests_passed": tests_passed,
                "tests_failed": tests_failed
            }
        }
    except subprocess.TimeoutExpired:
        print("   Status: ❌ TIMEOUT")
        return {
            "passed": False, 
            "output": "Tests timed out after 120s", 
            "test_count": 0,
            "passed_count": 0,
            "failed_count": 0,
            "metrics": {}
        }
    except Exception as e:
        print(f"   Status: ❌ ERROR: {str(e)}")
        return {
            "passed": False, 
            "output": str(e), 
            "test_count": 0,
            "passed_count": 0,
            "failed_count": 0,
            "metrics": {}
        }


def collect_metrics_after():
    """
    Collect metrics specific to this task
    - Concurrency handling
    - State machine validation
    - HTTP response codes
    """
    metrics = {}
    
    try:
        # Check if crm-engine files exist
        crm_engine_dir = ROOT / "repository_after" / "crm-engine"
        if crm_engine_dir.exists():
            # Count Go files
            go_files = list(crm_engine_dir.rglob("*.go"))
            metrics["go_files_count"] = len(go_files)
            
            # Count lines of code
            total_lines = 0
            for go_file in go_files:
                try:
                    with open(go_file, 'r', encoding='utf-8') as f:
                        total_lines += len(f.readlines())
                except:
                    pass
            metrics["total_lines_of_code"] = total_lines
        
        # Check templates in crm-engine (consolidated architecture)
        templates_dir = crm_engine_dir / "templates"
        if templates_dir.exists():
            metrics["frontend_implemented"] = True
            html_files = list(templates_dir.rglob("*.html"))
            metrics["html_templates_count"] = len(html_files)
            
            # Check for HTMX usage in templates
            htmx_usage = False
            for html_file in html_files:
                try:
                    with open(html_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if 'hx-' in content or 'htmx' in content.lower():
                            htmx_usage = True
                            break
                except:
                    pass
            metrics["htmx_integrated"] = htmx_usage
        else:
            metrics["frontend_implemented"] = False
        
        # Check clean architecture structure
        architecture_dirs = ["domain", "usecase", "infrastructure", "delivery"]
        architecture_present = []
        for arch_dir in architecture_dirs:
            if (crm_engine_dir / arch_dir).exists():
                architecture_present.append(arch_dir)
        metrics["clean_architecture_layers"] = architecture_present
        
    except Exception as e:
        metrics["error"] = str(e)
    
    return metrics


def run_evaluation():
    """
    Main evaluation function
    Returns a standardized report dictionary
    """
    run_id = str(uuid.uuid4())
    start = datetime.utcnow()
    
    print("=" * 60)
    print("🚀 Starting Evaluation: Stateful Conflict CRM Engine")
    print("=" * 60)
    
    # Evaluate repository_before
    print("\n📂 Evaluating repository_before (baseline)...")
    before_tests = run_tests_before()
    print(f"   Status: {'✅ PASS' if before_tests['passed'] else '❌ FAIL'}")
    
    # Evaluate repository_after
    print("\n📂 Evaluating repository_after (implementation)...")
    after_tests = run_tests_after()
    print(f"   Status: {'✅ PASS' if after_tests['passed'] else '❌ FAIL'}")
    print(f"   Tests: {after_tests['test_count']} total, {after_tests['passed_count']} passed, {after_tests['failed_count']} failed")
    
    # Collect metrics
    print("\n📊 Collecting metrics...")
    after_metrics = collect_metrics_after()
    
    # Build comparison
    comparison = {
        "passed_gate": after_tests["passed"],
        "improvement_summary": "Implementation successful" if after_tests["passed"] else "Implementation failed"
    }
    
    # Determine success
    success = after_tests["passed"]
    
    end = datetime.utcnow()
    
    report = {
        "run_id": run_id,
        "started_at": start.isoformat() + "Z",
        "finished_at": end.isoformat() + "Z",
        "duration_seconds": (end - start).total_seconds(),
        "environment": environment_info(),
        "before": {
            "tests": before_tests,
            "metrics": {}
        },
        "after": {
            "tests": after_tests,
            "metrics": after_metrics
        },
        "comparison": comparison,
        "success": success,
        "error": None
    }
    
    # Print summary
    print("\n" + "=" * 60)
    print("📋 EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Overall Success: {'✅ YES' if success else '❌ NO'}")
    print(f"Duration: {report['duration_seconds']:.2f}s")
    print(f"\nBefore State: Empty baseline (no implementation)")
    print(f"After State: Full Go implementation with clean architecture")
    print(f"  - Tests Run: {after_tests['test_count']}")
    print(f"  - Tests Passed: {after_tests['passed_count']}")
    print(f"  - Tests Failed: {after_tests['failed_count']}")
    if after_metrics.get("clean_architecture_layers"):
        print(f"  - Architecture Layers: {', '.join(after_metrics['clean_architecture_layers'])}")
    if after_metrics.get("htmx_integrated"):
        print(f"  - HTMX Integration: ✅")
    print("=" * 60)
    
    return report


def main():
    """Main entry point"""
    try:
        report = run_evaluation()
        
        # Save report
        report_file = REPORTS_DIR / f"evaluation_{report['run_id']}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n💾 Report saved to: {report_file}")
        
        # Also save as latest
        latest_file = REPORTS_DIR / "evaluation_latest.json"
        with open(latest_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Return exit code based on success
        return 0 if report["success"] else 1
    
    except Exception as e:
        print(f"\n❌ Evaluation failed with error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        
        # Save error report
        error_report = {
            "run_id": str(uuid.uuid4()),
            "started_at": datetime.utcnow().isoformat() + "Z",
            "finished_at": datetime.utcnow().isoformat() + "Z",
            "duration_seconds": 0,
            "environment": environment_info(),
            "before": {"tests": {"passed": False}, "metrics": {}},
            "after": {"tests": {"passed": False}, "metrics": {}},
            "comparison": {"passed_gate": False, "improvement_summary": ""},
            "success": False,
            "error": str(e)
        }
        
        error_file = REPORTS_DIR / "evaluation_error.json"
        with open(error_file, 'w') as f:
            json.dump(error_report, f, indent=2)
        
        return 1


if __name__ == "__main__":
    sys.exit(main())
