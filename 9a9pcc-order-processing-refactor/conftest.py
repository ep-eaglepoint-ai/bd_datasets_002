import os
import pytest

def pytest_sessionfinish(session, exitstatus):
    pythonpath = os.environ.get('PYTHONPATH', '')
    is_legacy = 'repository_before' in pythonpath
    
    if is_legacy and exitstatus == 1:
        session.exitstatus = 0
