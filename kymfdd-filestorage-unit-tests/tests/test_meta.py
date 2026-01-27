#!/usr/bin/python3

import pytest
import os
import re
import glob
import subprocess
import sys


REPO_BASE = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


def get_target_repo():
    repo_path = os.environ.get("REPO_PATH", "repository_after")
    if os.path.isabs(repo_path):
        return repo_path
    return os.path.join(REPO_BASE, repo_path)


def get_tests_dir():
    return os.path.join(get_target_repo(), "tests")


def get_test_files():
    tests_dir = get_tests_dir()
    if not os.path.isdir(tests_dir):
        return []
    return glob.glob(os.path.join(tests_dir, "test_*.py"))


class TestUnittestFilesExist:
    

    def test_tests_directory_exists(self):
        """META-01: Target repository must have a 'tests' directory."""
        tests_dir = get_tests_dir()
        target_repo = get_target_repo()
        assert os.path.isdir(tests_dir), (
            f"Target repository '{os.path.basename(target_repo)}' must have a 'tests' directory. "
            f"Not found at: {tests_dir}"
        )

    def test_unittest_files_exist(self):
        
        tests_dir = get_tests_dir()
        target_repo = get_target_repo()
        
        if not os.path.isdir(tests_dir):
            pytest.fail(f"No 'tests' directory in '{os.path.basename(target_repo)}'")
        
        test_files = get_test_files()
        assert len(test_files) > 0, (
            f"Target repsitory must have at least one test file (test_*.py) in: {tests_dir}"
        )

    def test_unittest_files_use_unittest_module(self):
        test_files = get_test_files()
        
        if not test_files:
            pytest.fail("No test files found")
        
        for test_file in test_files:
            with open(test_file, "r") as f:
                content = f.read()
            assert "import unittest" in content, (
                f"Test file {os.path.basename(test_file)} must use unittest module"
            )

    def test_unittest_files_have_test_classes(self):
        test_files = get_test_files()
        
        if not test_files:
            pytest.fail("No test files found")
        
        for test_file in test_files:
            with open(test_file, "r") as f:
                content = f.read()
            has_test_class = "unittest.TestCase" in content or re.search(r"class\s+Test\w+", content)
            assert has_test_class, (
                f"Test file {os.path.basename(test_file)} must have TestCase classes"
            )

    def test_unittest_files_have_test_methods(self):
        test_files = get_test_files()
        
        if not test_files:
            pytest.fail("No test files found")
        
        for test_file in test_files:
            with open(test_file, "r") as f:
                content = f.read()
            test_methods = re.findall(r"def\s+test_\w+", content)
            assert len(test_methods) > 0, (
                f"Test file {os.path.basename(test_file)} must have test methods"
            )

    def test_unittest_files_have_requirement_markers(self):
        
        test_files = get_test_files()
        
        if not test_files:
            pytest.fail("No test files found")
        
        all_markers = []
        for test_file in test_files:
            with open(test_file, "r") as f:
                content = f.read()
            markers = re.findall(r"TC-\d{2}", content)
            all_markers.extend(markers)
        
        unique_markers = set(all_markers)
        assert len(unique_markers) >= 7, (
            f"Test files must have at least 7 requirement markers (TC-XX). "
            f"Found {len(unique_markers)}: {sorted(unique_markers)}"
        )

    def test_unittest_files_no_pytest(self):
        test_files = get_test_files()
        
        if not test_files:
            pytest.fail("No test files found")
        
        for test_file in test_files:
            with open(test_file, "r") as f:
                content = f.read()
            assert "import pytest" not in content, (
                f"Test file {os.path.basename(test_file)} must not use pytest"
            )


class TestUnittestsPass:

    def test_run_unittests(self):
        test_files = get_test_files()
        target_repo = get_target_repo()
        
        if not test_files:
            pytest.fail(f"No test files found in '{os.path.basename(target_repo)}'")
        
        env = os.environ.copy()
        repo_before = os.path.join(REPO_BASE, "repository_before")
        env["PYTHONPATH"] = f"{REPO_BASE}{os.pathsep}{repo_before}{os.pathsep}{target_repo}{os.pathsep}{env.get('PYTHONPATH', '')}"
        
        tests_dir = get_tests_dir()
        
        cmd = [sys.executable, "-m", "unittest", "discover", "-s", tests_dir, "-v"]
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        
        assert result.returncode == 0, (
            f"Unit tests in '{os.path.basename(target_repo)}' failed!\n"
            f"STDOUT:\n{result.stdout}\n"
            f"STDERR:\n{result.stderr}"
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
