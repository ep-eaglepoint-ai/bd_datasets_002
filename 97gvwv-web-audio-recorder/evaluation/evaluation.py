#!/usr/bin/env python3
"""
Evaluation Script for Audio Recorder
Combines standard guide structure with detailed test results
"""
import sys
import json
import time
import uuid
import platform
import subprocess
import socket
from pathlib import Path
from datetime import datetime

# Paths
ROOT = Path(__file__).resolve().parent.parent
EVALUATION_ROOT = ROOT / "evaluation"

def get_timestamp_dir():
    """Create timestamp-based directory structure"""
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")
    return EVALUATION_ROOT / date_str / time_str

def environment_info():
    """Collect environment information matching sample format"""
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "os": platform.system(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "hostname": socket.gethostname(),
        "git_commit": "unknown",  # Simplified for now
        "git_branch": "unknown"
    }

def run_pytest_detailed(repo_name: str):
    """Run pytest and return detailed results like the sample"""
    try:
        # Determine which test file to run
        if repo_name == "repository_before":
            test_file = "tests/test_before.py"
        elif repo_name == "repository_after":
            test_file = "tests/test_after.py"
        else:
            test_file = "tests/"
        
        # Run pytest with verbose output
        proc = subprocess.run(
            ["pytest", test_file, "-v"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        # Parse the output to extract test details
        output = proc.stdout + proc.stderr
        tests = []
        passed_count = 0
        failed_count = 0
        error_count = 0
        total_count = 0
        
        # Parse each line to extract test results
        lines = output.split('\n')
        for line in lines:
            line = line.strip()
            
            # Look for test result lines
            if "PASSED" in line or "FAILED" in line or "ERROR" in line:
                # Extract test nodeid
                parts = line.split()
                for part in parts:
                    if "test_" in part and "::" in part:
                        nodeid = part
                        test_name = part.split("::")[-1]
                        
                        # Determine outcome
                        if "PASSED" in line:
                            outcome = "passed"
                            passed_count += 1
                        elif "FAILED" in line:
                            outcome = "failed"
                            failed_count += 1
                        elif "ERROR" in line:
                            outcome = "error"
                            error_count += 1
                        
                        tests.append({
                            "nodeid": nodeid,
                            "name": test_name,
                            "outcome": outcome
                        })
                        total_count += 1
                        break
        
        # If we couldn't parse tests from output, create a simple list
        if not tests:
            # Get all test functions from the test file
            if test_file.endswith('.py'):
                try:
                    with open(ROOT / test_file, 'r') as f:
                        content = f.read()
                        import re
                        test_functions = re.findall(r'def (test_\w+)', content)
                        
                        for func in test_functions:
                            nodeid = f"{test_file}::{func}"
                            tests.append({
                                "nodeid": nodeid,
                                "name": func,
                                "outcome": "unknown"
                            })
                            total_count += 1
                except:
                    pass
        
        # Determine success based on return code
        success = proc.returncode == 0
        
        return {
            "success": success,
            "exit_code": proc.returncode,
            "tests": tests,
            "summary": {
                "total": total_count,
                "passed": passed_count,
                "failed": failed_count,
                "errors": error_count,
                "skipped": 0
            },
            "stdout": proc.stdout[:10000],  # Truncate long output
            "stderr": proc.stderr
        }
        
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0},
            "stdout": "pytest timeout after 60 seconds",
            "stderr": ""
        }
    except Exception as e:
        return {
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0},
            "stdout": f"Error running tests: {str(e)}",
            "stderr": ""
        }

def run_metrics(repo_path: Path):
    """Collect metrics for the repository"""
    metrics = {}
    
    try:
        # Check if audio_recorder.py exists
        recorder_file = repo_path / "audio_recorder.py"
        if recorder_file.exists():
            with open(recorder_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract HTML if it's embedded in Python
            import re
            match = re.search(r'HTML_CONTENT = """(.*?)"""', content, re.DOTALL)
            html_content = match.group(1) if match else content
            
            # Calculate feature metrics
            has_playback = any(x in html_content for x in ['playbackSection', 'togglePlayPause', 'waveformCanvas'])
            has_monitoring = any(x in html_content for x in ['levelMeter', 'audioContext', 'AnalyserNode'])
            has_session = any(x in html_content for x in ['sessionRecordings', 'MAX_RECORDINGS', 'addToSession'])
            
            # Quality metrics
            quality_checks = {
                "keyboard_accessibility": "addEventListener('keydown'" in html_content,
                "memory_management": 'URL.revokeObjectURL' in html_content,
                "mobile_responsive": '@media' in html_content,
                "error_handling": 'try {' in html_content and 'catch' in html_content,
                "web_audio_api": any(x in html_content for x in ['AudioContext', 'AnalyserNode']),
                "media_recorder": 'MediaRecorder' in html_content,
                "wav_format": 'audio/wav' in html_content
            }
            
            # Convert quality checks to numeric metrics
            quality_score = sum(1 for check in quality_checks.values() if check)
            
            metrics = {
                "size_chars": len(html_content),
                "lines": html_content.count('\n') + 1,
                "functions": len(re.findall(r'function\s+(\w+)\s*\(', html_content)),
                "features_present": sum([has_playback, has_monitoring, has_session]),
                "has_playback": has_playback,
                "has_monitoring": has_monitoring,
                "has_session": has_session,
                "quality_score": quality_score,
                "quality_percentage": int((quality_score / len(quality_checks)) * 100) if quality_checks else 0
            }
    
    except Exception as e:
        # Metrics are optional
        print(f"Note: Could not collect metrics for {repo_path}: {e}")
    
    return metrics

def evaluate(repo_name: str):
    """Evaluate a single repository"""
    repo_path = ROOT / repo_name
    
    # Run tests with detailed output
    test_results = run_pytest_detailed(repo_name)
    
    # Collect metrics
    metrics = run_metrics(repo_path)
    
    # Combine into standard format but with detailed test results
    return {
        "tests": {
            "passed": test_results["success"],
            "return_code": test_results["exit_code"],
            "output": test_results["stdout"][:8000]  # Truncated as per standard
        },
        "metrics": metrics,
        # Additional detailed results (for the sample-like structure)
        "detailed": {
            "success": test_results["success"],
            "exit_code": test_results["exit_code"],
            "tests": test_results["tests"],
            "summary": test_results["summary"],
            "stdout": test_results["stdout"],
            "stderr": test_results["stderr"]
        }
    }

def run_evaluation():
    """Main evaluation function - combines standard and detailed formats"""
    run_id = str(uuid.uuid4())[:8]  # Short ID like in sample
    started_at = datetime.utcnow()
    
    # Create timestamp directory
    report_dir = get_timestamp_dir()
    report_dir.mkdir(parents=True, exist_ok=True)
    report_file = report_dir / "report.json"
    
    print("="*70)
    print("🎯 AUDIO RECORDER EVALUATION")
    print("="*70)
    
    # Collect environment info
    environment = environment_info()
    
    # Evaluate before repository
    print("\n📋 Evaluating BEFORE repository (should be minimal)...")
    before = evaluate("repository_before")
    
    # Evaluate after repository
    print("📋 Evaluating AFTER repository (should have all features)...")
    after = evaluate("repository_after")
    
    # Generate improvement summary
    before_features = before.get("metrics", {}).get("features_present", 0)
    after_features = after.get("metrics", {}).get("features_present", 0)
    features_added = after_features - before_features
    
    if features_added == 3:
        improvement_summary = "All 3 features successfully added"
    elif features_added > 0:
        improvement_summary = f"{features_added}/3 features added"
    elif after["tests"]["passed"] and not before["tests"]["passed"]:
        improvement_summary = "After version passes tests (before fails as expected)"
    elif after["tests"]["passed"] and before["tests"]["passed"]:
        improvement_summary = "Both versions pass tests"
    else:
        improvement_summary = "After version fails tests"
    
    # Create comparison section
    comparison = {
        "passed_gate": after["tests"]["passed"],  # Standard guide field
        "improvement_summary": improvement_summary,  # Standard guide field
        # Additional comparison details
        "before_tests_passed": before["detailed"]["success"],
        "after_tests_passed": after["detailed"]["success"],
        "before_total": before["detailed"]["summary"]["total"],
        "before_passed": before["detailed"]["summary"]["passed"],
        "before_failed": before["detailed"]["summary"]["failed"],
        "after_total": after["detailed"]["summary"]["total"],
        "after_passed": after["detailed"]["summary"]["passed"],
        "after_failed": after["detailed"]["summary"]["failed"],
        "features_added": features_added
    }
    
    finished_at = datetime.utcnow()
    duration = (finished_at - started_at).total_seconds()
    
    # Build the hybrid report structure
    report = {
        # Standard guide fields
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round(duration, 5),
        "success": after["tests"]["passed"],  # Standard: success = after.tests.passed
        "error": None,
        "environment": environment,
        
        # Results section with detailed test info (like sample)
        "results": {
            "before": before["detailed"],
            "after": after["detailed"],
            "comparison": {
                "before_tests_passed": before["detailed"]["success"],
                "after_tests_passed": after["detailed"]["success"],
                "before_total": before["detailed"]["summary"]["total"],
                "before_passed": before["detailed"]["summary"]["passed"],
                "before_failed": before["detailed"]["summary"]["failed"],
                "after_total": after["detailed"]["summary"]["total"],
                "after_passed": after["detailed"]["summary"]["passed"],
                "after_failed": after["detailed"]["summary"]["failed"]
            }
        },
        
        # Standard guide structure (for compatibility)
        "before": {
            "tests": before["tests"],
            "metrics": before["metrics"]
        },
        "after": {
            "tests": after["tests"],
            "metrics": after["metrics"]
        },
        "comparison": {
            "passed_gate": after["tests"]["passed"],
            "improvement_summary": improvement_summary
        }
    }
    
    # Save report
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print("\n" + "="*70)
    print("📊 EVALUATION SUMMARY")
    print("="*70)
    
    print(f"\n📋 Test Results:")
    print(f"  • Before: {'✅ PASS' if before['tests']['passed'] else '❌ FAIL'} "
          f"({before['detailed']['summary']['passed']}/{before['detailed']['summary']['total']} tests)")
    print(f"  • After:  {'✅ PASS' if after['tests']['passed'] else '❌ FAIL'} "
          f"({after['detailed']['summary']['passed']}/{after['detailed']['summary']['total']} tests)")
    
    print(f"\n🎯 Features Status:")
    print(f"  • Before: {before_features}/3 features present")
    print(f"  • After:  {after_features}/3 features present")
    print(f"  • Added:  {features_added}/3 features")
    
    print(f"\n📝 Improvement Summary:")
    print(f"  {improvement_summary}")
    
    print(f"\n🏆 Overall Success: {'✅ YES' if report['success'] else '❌ NO'}")
    print(f"\n📁 Report saved to: evaluation/{report_dir.relative_to(EVALUATION_ROOT)}/report.json")
    print("="*70)
    
    return report

def main():
    """Main entry point"""
    try:
        report = run_evaluation()
        return 0 if report["success"] else 1
    except Exception as e:
        # Create error report directory
        error_dir = get_timestamp_dir()
        error_dir.mkdir(parents=True, exist_ok=True)
        error_file = error_dir / "error.json"
        
        error_report = {
            "run_id": str(uuid.uuid4())[:8],
            "started_at": datetime.utcnow().isoformat(),
            "finished_at": datetime.utcnow().isoformat(),
            "duration_seconds": 0,
            "success": False,
            "error": str(e),
            "environment": environment_info()
        }
        
        with open(error_file, 'w', encoding='utf-8') as f:
            json.dump(error_report, f, indent=2, ensure_ascii=False)
        
        print(f"\n❌ Evaluation failed: {e}")
        print(f"📁 Error report: evaluation/{error_dir.relative_to(EVALUATION_ROOT)}/error.json")
        return 1

if __name__ == "__main__":
    sys.exit(main())

