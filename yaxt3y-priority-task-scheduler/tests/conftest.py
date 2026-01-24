import sys
import os

# Get the directory containing this file (tests/)
TESTS_DIR = os.path.dirname(os.path.abspath(__file__))

# Add it to sys.path if not present
if TESTS_DIR not in sys.path:
    sys.path.insert(0, TESTS_DIR)
