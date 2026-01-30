import os
from pathlib import Path
import pytest

def get_target_repo_root():
    # In evaluation context, PYTHONPATH is set to the target repository root.
    pp = os.environ.get("PYTHONPATH", "")
    
    # Try to find specific repo paths in PYTHONPATH
    for path_str in pp.split(os.pathsep):
        if "repository_before" in path_str or "repository_after" in path_str:
            return Path(path_str)
            
    # Fallback: logical parent of this test file (repository_after)
    return Path(__file__).resolve().parent.parent

REPO_ROOT = get_target_repo_root()

class TestRepositoryMetadata:
    """
    Meta-tests to validate the structure and presence of key files
    in the target repository.
    """

    def test_repository_structure_exists(self):
        """Verify that the main backend and frontend directories exist."""
        assert (REPO_ROOT / "backend").exists(), f"backend directory missing in {REPO_ROOT}"
        assert (REPO_ROOT / "backend").is_dir(), f"backend is not a directory in {REPO_ROOT}"
        assert (REPO_ROOT / "frontend").exists(), f"frontend directory missing in {REPO_ROOT}"
        assert (REPO_ROOT / "frontend").is_dir(), f"frontend is not a directory in {REPO_ROOT}"

    def test_essential_files_exist(self):
        """Verify that essential project files exist."""
        assert (REPO_ROOT / "requirements.txt").exists(), f"requirements.txt missing in {REPO_ROOT}"
        assert (REPO_ROOT / "README.md").exists(), f"README.md missing in {REPO_ROOT}"

    def test_backend_files_exist(self):
        """Verify critical backend files."""
        assert (REPO_ROOT / "backend" / "main.py").exists(), f"backend/main.py missing in {REPO_ROOT}"

    def test_frontend_files_exist(self):
        """Verify critical frontend files."""
        assert (REPO_ROOT / "frontend" / "package.json").exists(), f"frontend/package.json missing in {REPO_ROOT}"
        assert (REPO_ROOT / "frontend" / "src").exists(), f"frontend/src missing in {REPO_ROOT}"
