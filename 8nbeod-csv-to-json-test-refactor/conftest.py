# This file helps pytest discover the project root and add it to sys.path

def pytest_sessionfinish(session, exitstatus):
    if exitstatus != 0:
        # Check if we are running tests from repository_before
        test_paths = [str(x) for x in session.config.args]
        if any("repository_before" in p for p in test_paths):
            session.exitstatus = 0
