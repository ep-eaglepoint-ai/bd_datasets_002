import pytest
import psycopg2
import uuid
import json
from datetime import datetime, timezone
import os

@pytest.fixture(scope="session")
def db_connection():
    """Database connection fixture"""
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "subscription"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres")
    )
    
    # Load schema
    repo_path = os.getenv("REPO_PATH", "repository_after")
    with open(f"{repo_path}/subscription.sql", "r") as f:
        schema = f.read()
    
    with conn.cursor() as cur:
        cur.execute(schema)
    conn.commit()
    
    yield conn
    conn.close()

@pytest.fixture
def clean_db(db_connection):
    """Clean database before each test"""
    with db_connection.cursor() as cur:
        cur.execute("TRUNCATE subscription_idempotency_log, subscription_audit_log, subscription_history, subscriptions, subscription_plans, users CASCADE")
    db_connection.commit()

@pytest.fixture
def sample_data(db_connection, clean_db):
    """Insert sample test data"""
    user_id = uuid.uuid4()
    plan_id = uuid.uuid4()
    
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO users (user_id, email) VALUES (%s, %s)", (str(user_id), "test@example.com"))
        cur.execute("INSERT INTO subscription_plans (plan_id, name, is_active, price_cents) VALUES (%s, %s, %s, %s)", 
                   (str(plan_id), "Basic Plan", True, 999))
    db_connection.commit()
    
    return {"user_id": user_id, "plan_id": plan_id}

def call_function(db_connection, user_id, plan_id, start_date, status, request_id):
    """Helper to call the subscription function"""
    with db_connection.cursor() as cur:
        cur.execute(
            "SELECT manage_user_subscription(%s, %s, %s, %s, %s)",
            (str(user_id) if user_id else None, str(plan_id) if plan_id else None, start_date, status, str(request_id) if request_id else None)
        )
        return cur.fetchone()[0]

# Accept user ID, plan ID, start date, status, and request identifier as inputs
def test_accepts_all_required_inputs(db_connection, sample_data):
    result = call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"], 
        datetime.now(timezone.utc),
        "active",
        uuid.uuid4()
    )
    assert result["result_code"] == 0

#Verify that the referenced user exists
def test_rejects_nonexistent_user(db_connection, sample_data):
    result = call_function(
        db_connection,
        uuid.uuid4(),  # Non-existent user
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "active", 
        uuid.uuid4()
    )
    assert result["result_code"] == 19
    assert "User does not exist" in result["message"]

#erify that the referenced subscription plan exists and is active
def test_rejects_nonexistent_plan(db_connection, sample_data):
    result = call_function(
        db_connection,
        sample_data["user_id"],
        uuid.uuid4(),
        datetime.now(timezone.utc),
        "active",
        uuid.uuid4()
    )
    assert result["result_code"] == 19
    assert "Plan does not exist" in result["message"]

def test_rejects_inactive_plan(db_connection, sample_data):
    inactive_plan_id = uuid.uuid4()
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO subscription_plans (plan_id, name, is_active, price_cents) VALUES (%s, %s, %s, %s)",
                   (str(inactive_plan_id), "Inactive Plan", False, 999))
    db_connection.commit()
    
    result = call_function(
        db_connection,
        sample_data["user_id"],
        inactive_plan_id,
        datetime.now(timezone.utc),
        "active",
        uuid.uuid4()
    )
    assert result["result_code"] == 19
    assert "Plan is not active" in result["message"]

#Prevent duplicate operations using the request identifier
def test_prevents_duplicate_operations(db_connection, sample_data):
    request_id = uuid.uuid4()
    
    # First call
    result1 = call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "active",
        request_id
    )
    
    # Second call with same request_id
    result2 = call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "pending",  # Different status
        request_id
    )
    
    assert result1 == result2  # Should return identical response

#Create a new subscription or update an existing one as appropriate
def test_creates_new_subscription(db_connection, sample_data):
    result = call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "active",
        uuid.uuid4()
    )
    assert result["result_code"] == 0
    assert result["action"] == "CREATE"

def test_updates_existing_subscription(db_connection, sample_data):
    # Create subscription
    call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "active",
        uuid.uuid4()
    )
    
    # Update subscription
    result = call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "cancelled",
        uuid.uuid4()
    )
    assert result["result_code"] == 0
    assert result["action"] == "UPDATE"

#Record all subscription changes in a history table
def test_records_subscription_history(db_connection, sample_data):
    call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "active",
        uuid.uuid4()
    )
    
    with db_connection.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM subscription_history WHERE user_id = %s", (str(sample_data["user_id"]),))
        count = cur.fetchone()[0]
    
    assert count == 1

# Log each subscription operation for auditing and debugging
def test_logs_subscription_operations(db_connection, sample_data):
    request_id = uuid.uuid4()
    call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "active",
        request_id
    )
    
    with db_connection.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM subscription_audit_log WHERE request_identifier = %s", (str(request_id),))
        count = cur.fetchone()[0]
    
    assert count == 1

#Execute all writes within a transactional scope
def test_transactional_rollback_on_error(db_connection, sample_data):
    # This test verifies that if an error occurs, no partial writes are committed
    with db_connection.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM subscriptions")
        initial_count = cur.fetchone()[0]
    
    # Try to create subscription with invalid status transition logic
    # The function should handle this and not leave partial data
    try:
        call_function(
            db_connection,
            sample_data["user_id"],
            sample_data["plan_id"],
            datetime.now(timezone.utc),
            "invalid_status",  # This should fail validation
            uuid.uuid4()
        )
    except:
        pass
    
    with db_connection.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM subscriptions")
        final_count = cur.fetchone()[0]
    
    assert initial_count == final_count

#Reject invalid subscription state transitions
def test_rejects_invalid_state_transitions(db_connection, sample_data):
    # Create cancelled subscription
    call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "cancelled",
        uuid.uuid4()
    )
    
    result = call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "past_due",
        uuid.uuid4()
    )
    
    assert result["result_code"] == 19

# Map all errors to SQLite-style error codes
def test_sqlite_error_codes(db_connection, sample_data):
    # Test constraint violation (code 19)
    result = call_function(
        db_connection,
        uuid.uuid4(),  # Non-existent user
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "active",
        uuid.uuid4()
    )
    assert result["result_code"] == 19
    
    # Test misuse (code 21) - missing request_id
    result = call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "active",
        None
    )
    assert result["result_code"] == 21

# Defensively handle malformed or unexpected input
def test_handles_null_inputs(db_connection, sample_data):
    result = call_function(
        db_connection,
        None,  # Null user_id
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "active",
        uuid.uuid4()
    )
    assert result["result_code"] == 21
    assert "Missing required parameters" in result["message"]

def test_handles_invalid_status(db_connection, sample_data):
    result = call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "invalid_status",
        uuid.uuid4()
    )
    assert result["result_code"] == 19
    assert "Invalid status value" in result["message"]

#Return a structured result describing the subscription outcome
def test_returns_structured_result(db_connection, sample_data):
    result = call_function(
        db_connection,
        sample_data["user_id"],
        sample_data["plan_id"],
        datetime.now(timezone.utc),
        "active",
        uuid.uuid4()
    )
    
    assert "result_code" in result
    assert "message" in result
    assert "subscription_id" in result
    assert "action" in result
    assert isinstance(result["result_code"], int)
    assert isinstance(result["message"], str)