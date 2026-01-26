import pytest
import psycopg2
from psycopg2.extras import RealDictCursor
import os


@pytest.fixture(scope="session")
def db_connection():
    # Use environment variables or defaults for test DB
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "db"),
        port=os.getenv("DB_PORT", 5432),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "password"),
        database=os.getenv("DB_NAME", "test_db")
    )
    conn.autocommit = True
    yield conn
    conn.close()

@pytest.fixture(scope="function")
def setup_schema(db_connection, request):
    repo = request.config.getoption("--repo")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    with db_connection.cursor() as cur:
        # Drop if exists
        cur.execute("DROP TABLE IF EXISTS audit_log CASCADE")
        cur.execute("DROP TABLE IF EXISTS transaction_ledger CASCADE")
        cur.execute("DROP TABLE IF EXISTS accounts CASCADE")
        # Create schema
        schema_path = os.path.join(script_dir, f"../repository_{repo}/schema.sql")
        with open(schema_path, "r") as f:
            cur.execute(f.read())
        # Create function
        transfer_path = os.path.join(script_dir, f"../repository_{repo}/transfer.sql")
        with open(transfer_path, "r") as f:
            cur.execute(f.read())
    yield
    # Cleanup after each test
    with db_connection.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS audit_log CASCADE")
        cur.execute("DROP TABLE IF EXISTS transaction_ledger CASCADE")
        cur.execute("DROP TABLE IF EXISTS accounts CASCADE")

def call_transfer(db_connection, source_id, dest_id, amount, transfer_ts, request_id):
    with db_connection.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM transfer_funds(%s, %s, %s, %s, %s)",
                    (source_id, dest_id, amount, transfer_ts, request_id))
        return cur.fetchall()

def test_successful_transfer(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert len(result) == 1
    assert result[0]['status'] == 'SUCCESS'
    assert result[0]['message'] == 'Transfer completed'
    # Check balances
    with db_connection.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT balance FROM accounts WHERE id = 1")
        assert cur.fetchone()['balance'] == 75.00
        cur.execute("SELECT balance FROM accounts WHERE id = 2")
        assert cur.fetchone()['balance'] == 75.00
    # Check ledger
    with db_connection.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM transaction_ledger WHERE request_id = 'req1'")
        ledger = cur.fetchone()
        assert ledger['source_id'] == 1
        assert ledger['dest_id'] == 2
        assert ledger['amount'] == 25.00
    # Check audit
    with db_connection.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM audit_log WHERE action = 'TRANSFER'")
        audit = cur.fetchone()
        assert 'req1' in audit['details']

def test_idempotent_transfer(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    # First call
    result1 = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result1[0]['status'] == 'SUCCESS'
    # Second call with same request_id
    result2 = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result2[0]['status'] == 'SUCCESS'
    assert result2[0]['message'] == 'Transfer already processed'
    # Balances should not change again
    with db_connection.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT balance FROM accounts WHERE id = 1")
        assert cur.fetchone()['balance'] == 75.00

def test_source_account_not_exist(db_connection, setup_schema):
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == 'ERROR'
    assert 'Source account does not exist' in result[0]['message']

def test_dest_account_not_exist(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == 'ERROR'
    assert 'Destination account does not exist' in result[0]['message']

def test_source_account_inactive(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, FALSE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == 'ERROR'
    assert 'Source account is not active' in result[0]['message']

def test_dest_account_inactive(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, FALSE)")
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == 'ERROR'
    assert 'Destination account is not active' in result[0]['message']

def test_negative_amount(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, -25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == 'ERROR'
    assert 'Transfer amount must be positive' in result[0]['message']

def test_zero_amount(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 0.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == 'ERROR'
    assert 'Transfer amount must be positive' in result[0]['message']

def test_insufficient_balance(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 10.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == 'ERROR'
    assert 'Insufficient balance' in result[0]['message']

def test_same_account(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE)")
    result = call_transfer(db_connection, 1, 1, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == 'ERROR'
    assert 'Source and destination accounts must be different' in result[0]['message']