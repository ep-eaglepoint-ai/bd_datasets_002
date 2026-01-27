import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

AFTER_SRC = str(ROOT / "repository_after" / "src")
if AFTER_SRC not in sys.path:
    sys.path.insert(0, AFTER_SRC)
