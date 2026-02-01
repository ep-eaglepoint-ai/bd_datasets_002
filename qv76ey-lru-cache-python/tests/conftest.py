import sys
from pathlib import Path

# Add the repository_after directory to the Python path
# This ensures that 'from lru_cache import ...' works correctly
root = Path(__file__).resolve().parent.parent
repo_after = root / "repository_after"
if str(repo_after) not in sys.path:
    sys.path.insert(0, str(repo_after))
