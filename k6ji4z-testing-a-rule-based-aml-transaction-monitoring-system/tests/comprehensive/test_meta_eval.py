
import unittest
import subprocess
import os
import sys
import ast
from pathlib import Path

class TestMetaEval(unittest.TestCase):
    # Use relative path for portability across environments
    TEST_FILE_PATH = Path(__file__).resolve().parent.parent / "test_aml_monitoring.py"
    def test_student_solution_exists(self):
        """Verify that the student created the test file."""
        self.assertTrue(self.TEST_FILE_PATH.exists(), f"Solution file not found at {self.TEST_FILE_PATH}")

    def test_solution_executes_successfully(self):
        """Verify the student's test suite passes via unittest."""
        cmd = [sys.executable, str(self.TEST_FILE_PATH)]
        
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        print("Stdout:", proc.stdout)
        print("Stderr:", proc.stderr)
        self.assertEqual(proc.returncode, 0, f"Student tests failed to execute. Output: {proc.stderr}")

    def test_no_random_usage(self):
        """Verify strictly no random module usage without seeding (or better, no random at all)."""
        if not self.TEST_FILE_PATH.exists():
            return

        with open(self.TEST_FILE_PATH, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read())
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name == 'random':
                        self.fail("Imported 'random' module. Use deterministic values.")
            elif isinstance(node, ast.ImportFrom):
                if node.module == 'random':
                    self.fail("Imported from 'random' module. Use deterministic values.")

    def test_required_rules_covered(self):
        """Check if test methods cover the required rules (naive string check)."""
        if not self.TEST_FILE_PATH.exists():
            return

        with open(self.TEST_FILE_PATH, "r", encoding="utf-8") as f:
            content = f.read().lower()
        
        required_terms = [
            "structuring", 
            "smurfing",
            "rapid", 
            "in", 
            "out",
            "geo",
            "risk",
            "peer",
            "anomaly",
            "process",
            "monitor"
        ]
        
        for term in required_terms:
            self.assertIn(term, content, f"Test file seems to miss coverage for '{term}'")

if __name__ == "__main__":
    unittest.main()
