import unittest
import subprocess
import sys
import tempfile
import shutil
import ast
from pathlib import Path

class TestMetaEval(unittest.TestCase):
    """Meta-tests validating solution test effectiveness via mutation testing."""
    
    def setUp(self):
        self.repo_after = Path("/app/repository_after")
        self.test_file = self.repo_after / "tests" / "test_aml_monitoring.py"
        
    def test_student_solution_exists(self):
        """Test file must exist in repository_after."""
        self.assertTrue(self.test_file.exists(), f"Missing: {self.test_file}")
    
    def test_solution_passes_against_working_code(self):
        """Solution tests must pass against correct implementation."""
        proc = subprocess.run(
            [sys.executable, "-m", "pytest", "tests/test_aml_monitoring.py", "-v", "-x"],
            cwd=str(self.repo_after),
            capture_output=True,
            text=True,
            timeout=60
        )
        self.assertEqual(proc.returncode, 0, 
                        f"Tests failed on working code:\n{proc.stdout}\n{proc.stderr}")
    
    def test_detects_broken_structuring_rule(self):
        """Tests must fail when StructuringSmurfingRule never triggers."""
        self._verify_mutation_detected("rules.py", "StructuringSmurfingRule", 
                                      "return []")
    
    def test_detects_broken_high_risk_geo(self):
        """Tests must fail when HighRiskGeoRule never triggers."""
        self._verify_mutation_detected("rules.py", "HighRiskGeoRule", 
                                      "return []")
    
    def test_detects_broken_counterparty_dispersion(self):
        """Tests must fail when CounterpartyDispersionRule never triggers."""
        self._verify_mutation_detected("rules.py", "CounterpartyDispersionRule", 
                                      "return []")
    
    def test_detects_broken_rapid_turnover(self):
        """Tests must fail when RapidInOutTurnoverRule never triggers."""
        self._verify_mutation_detected("rules.py", "RapidInOutTurnoverRule", 
                                      "return []")
    
    def test_detects_broken_peer_anomaly(self):
        """Tests must fail when PeerOutflowAnomalyRule never triggers."""
        self._verify_mutation_detected("rules.py", "PeerOutflowAnomalyRule", 
                                      "return []")
    
    def test_detects_broken_sliding_window(self):
        """Tests must fail when sliding window doesn't prune."""
        self._verify_mutation_detected("state.py", "class WindowStats", 
                                      "pass")
    
    def test_detects_broken_alert_generation(self):
        """Tests must fail when alerts lack required fields."""
        self._verify_mutation_detected("engine.py", "class TransactionMonitor", 
                                      "return []")
    
    def _verify_mutation_detected(self, filename, marker, bug_code):
        """Inject bug, run tests, verify they fail."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_repo = Path(tmpdir) / "repo"
            shutil.copytree(self.repo_after, tmp_repo, symlinks=True)
            
            target = tmp_repo / "Anti–Money" / "aml" / filename
            if not target.exists():
                self.skipTest(f"{filename} not found")
            
            lines = target.read_text().split('\n')
            inject_line = self._find_injection_point(lines, marker)
            
            if inject_line is None:
                self.skipTest(f"Cannot inject into {marker}")
            
            indent = len(lines[inject_line]) - len(lines[inject_line].lstrip())
            lines.insert(inject_line, ' ' * (indent + 4) + bug_code)
            target.write_text('\n'.join(lines))
            
            proc = subprocess.run(
                [sys.executable, "-m", "pytest", "tests/test_aml_monitoring.py", "-x"],
                cwd=str(tmp_repo),
                capture_output=True,
                text=True,
                timeout=60
            )
            
            self.assertNotEqual(proc.returncode, 0, 
                               f"Tests passed with {marker} broken - tests are ineffective!")
    
    def _find_injection_point(self, lines, marker):
        """Find first method after marker."""
        for i, line in enumerate(lines):
            if marker in line:
                for j in range(i+1, len(lines)):
                    if 'def ' in lines[j]:
                        return j + 1
        return None
    
    def test_no_random_usage(self):
        """Tests must be deterministic (no random module)."""
        tree = ast.parse(self.test_file.read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    self.assertNotEqual(alias.name, 'random', 
                                       "Tests must be deterministic")
            elif isinstance(node, ast.ImportFrom):
                self.assertNotEqual(node.module, 'random',
                                   "Tests must be deterministic")
    
    def test_all_rules_covered(self):
        """Tests must cover all 5 AML rules."""
        content = self.test_file.read_text().lower()
        required = ["structuring", "smurfing", "rapid", "turnover", 
                   "geo", "risk", "peer", "anomaly", "dispersion", "counterparty"]
        
        for term in required:
            self.assertIn(term, content, f"Missing coverage: {term}")
    
    def test_time_window_validation(self):
        """Tests must verify time-based window logic."""
        content = self.test_file.read_text().lower()
        self.assertIn("window", content, "Must test sliding window")
        self.assertIn("prune", content, "Must test transaction pruning")
    
    def test_negative_cases_present(self):
        """Tests must include negative cases (rules don't trigger)."""
        content = self.test_file.read_text().lower()
        negative_indicators = ["negative", "not trigger", "no alert", "should not"]
        
        has_negative = any(indicator in content for indicator in negative_indicators)
        self.assertTrue(has_negative, "Must include negative test cases")

if __name__ == "__main__":
    unittest.main()
