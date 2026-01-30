import os
from pathlib import Path
import pytest

def get_repo_root():
    # Use TEST_REPO_DIR environment variable to find the repository to test
    repo_dir_name = os.environ.get("TEST_REPO_DIR")
    if not repo_dir_name:
        pytest.fail("TEST_REPO_DIR environment variable not set")
    
    repo_root = Path(__file__).resolve().parent.parent / repo_dir_name
    return repo_root

REPO_ROOT = get_repo_root()

class TestCacheMeta:
    """
    Metadata tests for the repository structure and caching capabilities.
    """

    def test_repo_exists(self):
        """Verify the target repository directory exists."""
        assert REPO_ROOT.exists(), f"Repository directory {REPO_ROOT} does not exist"
        assert REPO_ROOT.is_dir(), f"{REPO_ROOT} is not a directory"

    def test_essential_structure(self):
        """Verify essential directories and files are present."""
        # Check for backend
        backend_dir = REPO_ROOT / "backend"
        assert backend_dir.exists(), f"Backend directory missing in {REPO_ROOT}"
        
        # Check for frontend
        frontend_dir = REPO_ROOT / "frontend"
        assert frontend_dir.exists(), f"Frontend directory missing in {REPO_ROOT}"

    def test_requirements_file(self):
        """Verify requirements.txt is present."""
        req_file = REPO_ROOT / "requirements.txt"
        assert req_file.exists(), f"requirements.txt missing in {REPO_ROOT}"

    def test_readme_file(self):
        """Verify README.md is present."""
        readme_file = REPO_ROOT / "README.md"
        assert readme_file.exists(), f"README.md missing in {REPO_ROOT}"

    def test_backend_entrypoint(self):
        """Verify backend/main.py exists."""
        main_py = REPO_ROOT / "backend" / "main.py"
        assert main_py.exists(), f"backend/main.py missing in {REPO_ROOT}"
