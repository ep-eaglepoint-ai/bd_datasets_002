import pytest
import os
import sys

# The evaluation script will set the 'REPO_PATH' environment variable
# to either 'repository_before' or 'repository_after'

def get_app():
    repo_name = os.getenv("REPO_NAME", "repository_after")
    
    # Add the repo path to sys.path so we can import from it
    
    if repo_name == "repository_after":
        from repository_after.backend.main import app
        return app
    else:
        # repository_before only has __init__.py usually, 
        # but let's try to import it if it exists.
        try:
            from repository_before.backend.main import app
            return app
        except ImportError:
            # If it doesn't exist, we'll return None or raise error
            # so the test can fail gracefully
            return None

def test_health():
    from fastapi.testclient import TestClient
    app = get_app()
    if app is None:
        pytest.fail("App not found in this repository")
    
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_train_and_predict():
    from fastapi.testclient import TestClient
    app = get_app()
    if app is None:
        pytest.fail("App not found in this repository")
        
    client = TestClient(app)
    
    # Predict before train
    response = client.post("/predict", json={"text": "hello"})
    assert response.status_code == 400
    assert "Model not trained yet" in response.json()["detail"]

    # Train
    train_data = {
        "texts": ["win money now", "how are you", "get free gift", "see you tomorrow"],
        "labels": ["spam", "ham", "spam", "ham"]
    }
    response = client.post("/train", json=train_data)
    assert response.status_code == 200

    # Predict
    response = client.post("/predict", json={"text": "congratulations on your win"})
    assert response.status_code == 200
    assert response.json()["label"] == "spam"
