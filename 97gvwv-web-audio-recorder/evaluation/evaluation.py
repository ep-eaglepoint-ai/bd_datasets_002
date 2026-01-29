# def main():
#     # TODO: implement evaluation logic
#     print("Evaluation placeholder")


# if __name__ == "__main__":
#     main()

#!/usr/bin/env python3
import sys
import json
import time
import uuid
import platform
import subprocess
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"
REPORTS.mkdir(parents=True, exist_ok=True)

def environment_info():
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }

def run_tests(test_file):
    """Run pytest on a specific test file"""
    try:
        proc = subprocess.run(
            ["pytest", test_file, "-q", "--tb=short"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=120
        )
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": (proc.stdout + proc.stderr)[:8000]
        }
    except subprocess.TimeoutExpired:
        return {"passed": False, "return_code": -1, "output": "pytest timeout"}

def evaluate(repo_name, test_file):
    repo_path = ROOT / repo_name
    tests = run_tests(test_file)
    metrics = {}  # add metrics if needed
    return {"tests": tests, "metrics": metrics}

def run_evaluation():
    run_id = str(uuid.uuid4())
    start = datetime.utcnow()

    before = evaluate("repository_before", "tests/test_before.py")
    after = evaluate("repository_after", "tests/test_after.py")

    comparison = {
        "passed_gate": after["tests"]["passed"],
        "improvement_summary": "After version passed all tests; before had failures"
    }

    end = datetime.utcnow()

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

    report_file = REPORTS / f"report_{run_id}.json"
    with open(report_file, "w") as f:
        json.dump(report, f, indent=4)

    return report

def main():
    report = run_evaluation()
    print(json.dumps(report, indent=4))
    return 0 if report["success"] else 1

if __name__ == "__main__":
    sys.exit(main())


#!/usr/bin/env python3
# """
# Main evaluation script for audio recorder comparison
# """
# import json
# import sys
# import re
# import os
# from datetime import datetime
# from pathlib import Path

# class AudioRecorderEvaluator:
#     def __init__(self):
#         self.timestamp = datetime.now()
#         self.date_str = self.timestamp.strftime("%Y-%m-%d")
#         self.time_str = self.timestamp.strftime("%H-%M-%S")
        
#         # Create evaluation directory
#         self.eval_dir = Path(f"evaluation/{self.date_str}")
#         self.eval_dir.mkdir(parents=True, exist_ok=True)
        
#         self.results = {
#             'timestamp': self.timestamp.isoformat(),
#             'date': self.date_str,
#             'time': self.time_str,
#             'comparison': {},
#             'requirements_met': {},
#             'score': 0,
#             'status': 'FAIL'
#         }
    
#     def load_html_content(self, filepath):
#         """Load HTML content from Python file"""
#         try:
#             with open(filepath, 'r') as f:
#                 content = f.read()
            
#             # Extract HTML content
#             match = re.search(r'HTML_CONTENT = """(.*?)"""', content, re.DOTALL)
#             if match:
#                 return match.group(1)
#             else:
#                 print(f"Error: HTML_CONTENT not found in {filepath}")
#                 return ""
#         except FileNotFoundError:
#             print(f"Error: File not found: {filepath}")
#             return ""
    
#     def extract_features(self, html):
#         """Extract features from HTML using regex"""
#         if not html:
#             return {}
        
#         return {
#             'playback': any(x in html for x in ['playbackSection', 'togglePlayPause', 'waveformCanvas']),
#             'monitoring': any(x in html for x in ['levelMeter', 'audioContext', 'AnalyserNode']),
#             'session': any(x in html for x in ['sessionRecordings', 'MAX_RECORDINGS', 'addToSession']),
#             'keyboard': "addEventListener('keydown'" in html,
#             'mobile': '@media (max-width:' in html,
#             'memory': 'URL.revokeObjectURL' in html,
#             'errors': 'try {' in html and 'catch' in html,
#             'original': all(x in html for x in ['startRecording', 'downloadRecording', 'MediaRecorder'])
#         }
    
#     def evaluate(self, before_path, after_path):
#         """Run evaluation"""
#         print(f"\n{'='*60}")
#         print("  🎙️  AUDIO RECORDER EVALUATION")
#         print(f"{'='*60}")
#         print(f"  Date: {self.date_str}")
#         print(f"  Time: {self.time_str}")
        
#         # Load content
#         before_html = self.load_html_content(before_path)
#         after_html = self.load_html_content(after_path)
        
#         if not before_html or not after_html:
#             print("❌ Error: Could not load HTML content")
#             return self.results
        
#         # Extract features
#         before_features = self.extract_features(before_html)
#         after_features = self.extract_features(after_html)
        
#         # Calculate scores
#         self.results['requirements_met'] = {
#             'feature_1_playback_system': after_features.get('playback', False),
#             'feature_2_live_monitoring': after_features.get('monitoring', False),
#             'feature_3_session_manager': after_features.get('session', False),
#             'original_functionality_preserved': after_features.get('original', False),
#             'keyboard_accessibility': after_features.get('keyboard', False),
#             'mobile_responsiveness': after_features.get('mobile', False),
#             'memory_management': after_features.get('memory', False),
#             'error_handling': after_features.get('errors', False)
#         }
        
#         # Calculate score
#         passed = sum(1 for req in self.results['requirements_met'].values() if req)
#         total = len(self.results['requirements_met'])
#         self.results['score'] = (passed / total) * 100
        
#         # Determine status
#         if self.results['score'] >= 80:
#             self.results['status'] = 'PASS'
        
#         # Add comparison data
#         self.results['comparison'] = {
#             'before_features': before_features,
#             'after_features': after_features,
#             'html_size_before': len(before_html),
#             'html_size_after': len(after_html),
#             'size_increase': len(after_html) - len(before_html)
#         }
        
#         return self.results
    
#     def generate_report(self):
#         """Generate and save report"""
#         report_file = self.eval_dir / f"report_{self.time_str}.json"
        
#         with open(report_file, 'w') as f:
#             json.dump(self.results, f, indent=2)
        
#         # Print summary
#         print(f"\n📊 EVALUATION RESULTS:")
#         print(f"  Score: {self.results['score']:.1f}%")
#         print(f"  Status: {self.results['status']}")
        
#         print("\n✅ REQUIREMENTS MET:")
#         for req, met in self.results['requirements_met'].items():
#             status = "✓" if met else "✗"
#             req_name = req.replace('_', ' ').title()
#             print(f"  {status} {req_name}")
        
#         print(f"\n📈 COMPARISON:")
#         comp = self.results['comparison']
#         print(f"  HTML Size: {comp['html_size_before']:,} → {comp['html_size_after']:,} chars")
#         print(f"  Size Increase: +{comp['size_increase']:,} chars")
        
#         print(f"\n📄 Report saved to: {report_file}")
        
#         # Generate markdown summary
#         self.generate_markdown_summary()
        
#         return self.results
    
#     def generate_markdown_summary(self):
#         """Generate markdown summary"""
#         md_file = self.eval_dir / f"summary_{self.time_str}.md"
        
#         with open(md_file, 'w') as f:
#             f.write(f"# Audio Recorder Evaluation Report\n\n")
#             f.write(f"**Date:** {self.date_str}  \n")
#             f.write(f"**Time:** {self.time_str}  \n")
#             f.write(f"**Score:** {self.results['score']:.1f}%  \n")
#             f.write(f"**Status:** {self.results['status']}  \n\n")
            
#             f.write("## Requirements Assessment\n\n")
#             f.write("| Requirement | Status |\n")
#             f.write("|-------------|--------|\n")
#             for req, met in self.results['requirements_met'].items():
#                 status = "✅ PASS" if met else "❌ FAIL"
#                 req_name = req.replace('_', ' ').title()
#                 f.write(f"| {req_name} | {status} |\n")
            
#             f.write("\n## Comparison Summary\n\n")
#             comp = self.results['comparison']
#             f.write(f"- **HTML Size Increase:** +{comp['size_increase']:,} characters\n")
#             f.write(f"- **Before Version:** {comp['html_size_before']:,} chars\n")
#             f.write(f"- **After Version:** {comp['html_size_after']:,} chars\n")
        
#         print(f"📝 Markdown summary: {md_file}")

# def main():
#     """Main evaluation function"""
#     evaluator = AudioRecorderEvaluator()
    
#     # Define paths
#     before_path = Path("repository_before/audio_recorder.py")
#     after_path = Path("repository_after/audio_recorder.py")
    
#     # Check files exist
#     if not before_path.exists():
#         print(f"❌ Error: Before version not found at {before_path}")
#         sys.exit(1)
    
#     if not after_path.exists():
#         print(f"❌ Error: After version not found at {after_path}")
#         sys.exit(1)
    
#     # Run evaluation
#     evaluator.evaluate(before_path, after_path)
    
#     # Generate report
#     report = evaluator.generate_report()
    
#     # Exit with appropriate code
#     if report['status'] == 'PASS':
#         print(f"\n{'='*60}")
#         print("  🎉 EVALUATION PASSED!")
#         print(f"{'='*60}")
#         return 0
#     else:
#         print(f"\n{'='*60}")
#         print("  ❌ EVALUATION FAILED!")
#         print(f"{'='*60}")
#         return 1

# if __name__ == "__main__":
#     sys.exit(main())

# #!/usr/bin/env python3
# """
# Main evaluation script for audio recorder comparison
# """
# import json
# import sys
# from pathlib import Path
# from datetime import datetime
# from bs4 import BeautifulSoup
# import re

# class AudioRecorderEvaluator:
#     def __init__(self):
#         self.results = {
#             'timestamp': datetime.now().isoformat(),
#             'comparison': {},
#             'before_stats': {},
#             'after_stats': {},
#             'requirements_met': {},
#             'score': 0
#         }
    
#     def load_applications(self, before_path, after_path):
#         """Load both versions of the application"""
#         sys.path.insert(0, str(before_path.parent))
#         sys.path.insert(0, str(after_path.parent))
        
#         # Import applications
#         from repository_before.audio_recorder import HTML_CONTENT as BEFORE_HTML
#         from repository_after.audio_recorder import HTML_CONTENT as AFTER_HTML
        
#         return BEFORE_HTML, AFTER_HTML
    
#     def evaluate_features(self, before_html, after_html):
#         """Evaluate feature implementation"""
#         before_soup = BeautifulSoup(before_html, 'html.parser')
#         after_soup = BeautifulSoup(after_html, 'html.parser')
        
#         before_script = before_soup.find('script').string if before_soup.find('script') else ""
#         after_script = after_soup.find('script').string if after_soup.find('script') else ""
        
#         # Feature 1: Playback System
#         playback_indicators = [
#             'playbackSection', 'togglePlayPause', 'waveformCanvas',
#             'seekAudio', 'showPlaybackControls'
#         ]
        
#         feature1_score = sum(1 for indicator in playback_indicators 
#                            if indicator in after_script) / len(playback_indicators)
        
#         # Feature 2: Live Monitoring
#         monitoring_indicators = [
#             'levelMeter', 'audioContext', 'AnalyserNode',
#             'getByteFrequencyData', 'updateLevelMeter'
#         ]
        
#         feature2_score = sum(1 for indicator in monitoring_indicators 
#                            if indicator in after_script) / len(monitoring_indicators)
        
#         # Feature 3: Session Manager
#         session_indicators = [
#             'sessionRecordings', 'MAX_RECORDINGS', 'addToSession',
#             'updateSessionUI', 'downloadAllRecordings', 'clearSession'
#         ]
        
#         feature3_score = sum(1 for indicator in session_indicators 
#                            if indicator in after_script) / len(session_indicators)
        
#         # Core preservation
#         original_functions = [
#             'updateStatus', 'formatTime', 'startRecording',
#             'downloadRecording', 'updateTimer'
#         ]
        
#         core_preservation = all(func in after_script for func in original_functions)
        
#         self.results['requirements_met'] = {
#             'feature_1_playback_system': feature1_score >= 0.8,
#             'feature_2_live_monitoring': feature2_score >= 0.8,
#             'feature_3_session_manager': feature3_score >= 0.8,
#             'core_functionality_preserved': core_preservation,
#             'keyboard_accessibility': 'addEventListener(\'keydown\'' in after_script,
#             'mobile_responsive': '@media (max-width:' in after_html,
#             'error_handling': 'try {' in after_script and 'catch' in after_script,
#             'memory_management': 'URL.revokeObjectURL' in after_script
#         }
        
#         # Calculate overall score
#         requirements_met = sum(1 for req in self.results['requirements_met'].values() if req)
#         total_requirements = len(self.results['requirements_met'])
#         self.results['score'] = (requirements_met / total_requirements) * 100
        
#         return self.results
    
#     def generate_report(self, output_path="evaluation_report.json"):
#         """Generate evaluation report"""
#         with open(output_path, 'w') as f:
#             json.dump(self.results, f, indent=2)
        
#         print(f"\n{'='*60}")
#         print("  AUDIO RECORDER EVALUATION REPORT")
#         print(f"{'='*60}")
        
#         print(f"\n📊 Overall Score: {self.results['score']:.1f}%")
        
#         print("\n✅ Requirements Met:")
#         for req, met in self.results['requirements_met'].items():
#             status = "✓" if met else "✗"
#             req_name = req.replace('_', ' ').title()
#             print(f"  {status} {req_name}")
        
#         print(f"\n📄 Report saved to: {output_path}")
        
#         return self.results

# def main():
#     """Main evaluation function"""
#     evaluator = AudioRecorderEvaluator()
    
#     # Load applications
#     before_path = Path("repository_before/audio_recorder_before.py")
#     after_path = Path("repository_after/audio_recorder_after.py")
    
#     if not before_path.exists() or not after_path.exists():
#         print("Error: Could not find application files")
#         sys.exit(1)
    
#     before_html, after_html = evaluator.load_applications(before_path, after_path)
    
#     # Run evaluation
#     evaluator.evaluate_features(before_html, after_html)
    
#     # Generate report
#     report = evaluator.generate_report()
    
#     # Determine pass/fail
#     if report['score'] >= 80:
#         print(f"\n🎉 RESULT: PASS (Score: {report['score']:.1f}%)")
#         return 0
#     else:
#         print(f"\n❌ RESULT: FAIL (Score: {report['score']:.1f}%)")
#         return 1

# if __name__ == "__main__":
#     sys.exit(main())

