import os
import pytest

def test_frontend_structure():

    
    pythonpath = os.environ.get("PYTHONPATH", "")
    target_repo = None
    if "repository_before" in pythonpath:
        target_repo = "repository_before"
    elif "repository_after" in pythonpath:
        target_repo = "repository_after"
    else:
   
        # Let's assume the user runs from root.
        pass

    if not target_repo:

        # Check all paths in PYTHONPATH
        found = False
        for path in pythonpath.split(os.pathsep):
            pkg_path = os.path.join(path, "frontend", "package.json")
            if os.path.exists(pkg_path):
                found = True
                break
        
        if not found:
             pytest.fail("Frontend package.json not found in pythonpath targets (Intentional failure for repository_before)")
        return

    # If we know the target repo, check it specifically
    # Note: PYTHONPATH usually points to the absolute path of repository_X
    repo_path = [p for p in pythonpath.split(os.pathsep) if target_repo in p][0]
    
    frontend_path = os.path.join(repo_path, "frontend")
    package_json = os.path.join(frontend_path, "package.json")
    app_tsx = os.path.join(frontend_path, "src", "App.tsx")

    if not os.path.exists(package_json):
        pytest.fail(f"frontend/package.json missing in {target_repo}")
    
    if not os.path.exists(app_tsx):
        pytest.fail(f"frontend/src/App.tsx missing in {target_repo}")

    # Check Content
    with open(app_tsx, 'r', encoding='utf-8') as f:
        content = f.read()
        assert "Predict" in content, "App.tsx should contain 'Predict'"
        assert "Train" in content, "App.tsx should contain 'Train'"
