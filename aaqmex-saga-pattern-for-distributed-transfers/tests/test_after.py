import pytest
from fastapi.testclient import TestClient
from repository_after.server import app, balances, saga_states


@pytest.fixture(autouse=True)
def reset_state():
    balances.clear()
    balances.update({"alice": 1000, "bob": 1000, "charlie": 1000})
    saga_states.clear()


def test_debit_endpoint():
    client = TestClient(app)
    response = client.post(
        "/debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": "saga-1"}
    )
    assert response.status_code == 200
    assert balances["alice"] == 900
    assert "saga-1" in saga_states
    assert saga_states["saga-1"]["state"] == "DEBITED"


def test_credit_endpoint():
    client = TestClient(app)
    # Must debit first
    client.post(
        "/debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": "saga-2"}
    )
    response = client.post(
        "/credit",
        json={"user": "bob", "amount": 100},
        headers={"transaction-id": "saga-2"}
    )
    assert response.status_code in [200, 500]


def test_compensate_debit_endpoint():
    client = TestClient(app)
    # Must debit first
    client.post(
        "/debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": "saga-3"}
    )
    response = client.post(
        "/compensate_debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": "saga-3"}
    )
    assert response.status_code == 200
    assert balances["alice"] == 1000
    assert saga_states["saga-3"]["state"] == "COMPENSATED"


def test_missing_transaction_id():
    client = TestClient(app)
    response = client.post("/debit", json={"user": "alice", "amount": 100})
    assert response.status_code == 400
    assert "transaction-id header is required" in response.json()["detail"]


def test_idempotency():
    client = TestClient(app)
    response1 = client.post(
        "/debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": "saga-idempotent"}
    )
    assert response1.status_code == 200
    assert balances["alice"] == 900
    
    response2 = client.post(
        "/debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": "saga-idempotent"}
    )
    assert response2.status_code == 200
    assert balances["alice"] == 900  # Should not deduct again
    assert "already processed" in response2.json()["message"]


def test_total_money_preserved():
    client = TestClient(app)
    initial_total = sum(balances.values())
    
    # Debit
    debit_response = client.post(
        "/debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": "saga-transfer"}
    )
    assert debit_response.status_code == 200
    
    # Try credit - may fail due to fault injection
    credit_response = client.post(
        "/credit",
        json={"user": "bob", "amount": 100},
        headers={"transaction-id": "saga-transfer"}
    )
    
    # If credit failed, compensate
    if credit_response.status_code == 500:
        compensate_response = client.post(
            "/compensate_debit",
            json={"user": "alice", "amount": 100},
            headers={"transaction-id": "saga-transfer"}
        )
        assert compensate_response.status_code == 200
    
    final_total = sum(balances.values())
    assert initial_total == final_total


def test_saga_state_tracking():
    client = TestClient(app)
    saga_id = "saga-state-test"
    
    # Debit
    client.post(
        "/debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": saga_id}
    )
    
    # Check saga state
    saga_response = client.get(f"/saga/{saga_id}")
    assert saga_response.status_code == 200
    saga_data = saga_response.json()
    assert saga_data["state"] == "DEBITED"
    assert saga_data["source_user"] == "alice"
    assert saga_data["amount"] == 100


def test_cannot_credit_without_debit():
    client = TestClient(app)
    response = client.post(
        "/credit",
        json={"user": "bob", "amount": 100},
        headers={"transaction-id": "saga-no-debit"}
    )
    assert response.status_code == 400
    assert "must call /debit first" in response.json()["detail"]


def test_cannot_compensate_after_credit():
    client = TestClient(app)
    saga_id = "saga-no-compensate"
    
    # Debit
    client.post(
        "/debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": saga_id}
    )
    
    # Credit (retry until success)
    while True:
        credit_response = client.post(
            "/credit",
            json={"user": "bob", "amount": 100},
            headers={"transaction-id": saga_id}
        )
        if credit_response.status_code == 200:
            break
    
    # Try to compensate after successful credit
    compensate_response = client.post(
        "/compensate_debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": saga_id}
    )
    assert compensate_response.status_code == 400
    assert "already completed" in compensate_response.json()["detail"]
