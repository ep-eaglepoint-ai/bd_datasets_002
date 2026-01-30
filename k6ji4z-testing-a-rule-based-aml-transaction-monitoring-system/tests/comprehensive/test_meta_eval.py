
import unittest
import subprocess
import os
import sys
import ast

class TestMetaEval(unittest.TestCase):
    def test_student_solution_exists(self):
        """Verify that the student created the test file."""
        # Check absolute path in container
        # The docker-compose mounts ./tests to /app/tests
        self.assertTrue(os.path.exists("/app/tests/test_aml_monitoring.py"), "Solution file not found in /app/tests/ directory")

    def test_solution_executes_successfully(self):
        """Verify the student's test suite passes via unittest."""
        # Executing absolute path
        cmd = [sys.executable, "/app/tests/test_aml_monitoring.py"]
        
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        print("Stdout:", proc.stdout)
        print("Stderr:", proc.stderr)
        self.assertEqual(proc.returncode, 0, f"Student tests failed to execute. Output: {proc.stderr}")

    def test_no_random_usage(self):
        """Verify strictly no random module usage without seeding (or better, no random at all)."""
        if not os.path.exists("/app/tests/test_aml_monitoring.py"):
            return 

        with open("/app/tests/test_aml_monitoring.py", "r", encoding="utf-8") as f:
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
        if not os.path.exists("/app/tests/test_aml_monitoring.py"):
            return

        with open("/app/tests/test_aml_monitoring.py", "r", encoding="utf-8") as f:
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
