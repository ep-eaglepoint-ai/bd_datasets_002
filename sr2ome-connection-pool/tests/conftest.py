import sys
from pathlib import Path

# Ensure repository_after is on sys.path so tests can import the local package
ROOT = Path(__file__).resolve().parent.parent
REPOSITORY_AFTER = ROOT / "repository_after"
if str(REPOSITORY_AFTER) not in sys.path:
    sys.path.insert(0, str(REPOSITORY_AFTER))
