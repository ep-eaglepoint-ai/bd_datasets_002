import pytest
import os
import sys
from fastapi.testclient import TestClient

# The evaluation script will enforce PYTHONPATH to point to the repository root
# e.g. /app/repository_before or /app/repository_after

def get_app():
    # Attempt to import assuming PYTHONPATH includes the repository root
    try:
        from backend.main import app
        return app
    except ImportError:
        return None

def test_health():
    app = get_app()
    if app is None:
        pytest.fail("Backend application not found (Intentional failure for repository_before)")
    
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_train_and_predict():
    app = get_app()
    if app is None:
        pytest.fail("Backend application not found (Intentional failure for repository_before)")
        
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

def test_predict_batch():
    app = get_app()
    if app is None:
        pytest.fail("Backend application not found (Intentional failure for repository_before)")
        
    client = TestClient(app)
    
    # Train first to ensure model exists
    train_data = {
        "texts": ["spam one", "ham one"],
        "labels": ["spam", "ham"]
    }
    client.post("/train", json=train_data)
    
    # Test batch prediction
    batch_data = {
        "texts": ["spam one", "ham one"]
    }
    response = client.post("/predict_batch", json=batch_data)
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 2
    assert results[0]["label"] == "spam"
    assert results[1]["label"] == "ham"

def test_validation_errors():
    app = get_app()
    if app is None:
        pytest.fail("Backend application not found (Intentional failure for repository_before)")

    client = TestClient(app)

    # Test mismatched lengths
    bad_train_data = {
        "texts": ["one"],
        "labels": ["spam", "ham"]
    }
    response = client.post("/train", json=bad_train_data)
    assert response.status_code == 400
    assert "Number of texts and labels must be equal" in response.json()["detail"]

    # Test empty data
    empty_train_data = {
        "texts": [],
        "labels": []
    }
    response = client.post("/train", json=empty_train_data)
    assert response.status_code == 400
    assert "Training data cannot be empty" in response.json()["detail"]

