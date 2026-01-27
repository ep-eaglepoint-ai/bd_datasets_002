import pytest
from fastapi.testclient import TestClient
from repository_after.server import app, balances, processed_transactions
from repository_after.client import TransactionOrchestrator
import httpx


@pytest.fixture(autouse=True)
def reset_state():
    balances.clear()
    balances.update({"alice": 1000, "bob": 1000, "charlie": 1000})
    processed_transactions.clear()


def test_debit_endpoint():
    client = TestClient(app)
    response = client.post(
        "/debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": "test-1"}
    )
    assert response.status_code == 200
    assert balances["alice"] == 900


def test_credit_endpoint():
    client = TestClient(app)
    response = client.post(
        "/credit",
        json={"user": "bob", "amount": 100},
        headers={"transaction-id": "test-2"}
    )
    assert response.status_code in [200, 500]


def test_compensate_debit_endpoint():
    client = TestClient(app)
    balances["alice"] = 900
    response = client.post(
        "/compensate_debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": "test-3"}
    )
    assert response.status_code == 200
    assert balances["alice"] == 1000


def test_missing_transaction_id():
    client = TestClient(app)
    response = client.post("/debit", json={"user": "alice", "amount": 100})
    assert response.status_code == 422


def test_idempotency():
    client = TestClient(app)
    response1 = client.post(
        "/debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": "idempotent-1"}
    )
    assert response1.status_code == 200
    assert balances["alice"] == 900
    
    response2 = client.post(
        "/debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": "idempotent-1"}
    )
    assert response2.status_code == 200
    assert balances["alice"] == 900  # Should not deduct again


def test_total_money_preserved():
    client = TestClient(app)
    initial_total = sum(balances.values())
    
    # Successful debit
    debit_response = client.post(
        "/debit",
        json={"user": "alice", "amount": 100},
        headers={"transaction-id": "transfer-1-debit"}
    )
    assert debit_response.status_code == 200
    
    # Try credit - may fail due to fault injection
    credit_response = client.post(
        "/credit",
        json={"user": "bob", "amount": 100},
        headers={"transaction-id": "transfer-1-credit"}
    )
    
    # If credit failed, compensate
    if credit_response.status_code == 500:
        compensate_response = client.post(
            "/compensate_debit",
            json={"user": "alice", "amount": 100},
            headers={"transaction-id": "transfer-1-compensate"}
        )
        assert compensate_response.status_code == 200
    
    final_total = sum(balances.values())
    assert initial_total == final_total
