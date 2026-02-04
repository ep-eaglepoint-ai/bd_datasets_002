import pytest
import psycopg2
from psycopg2.extras import RealDictCursor
import os

# SQLite-style error codes for reference
SQLITE_OK = 0
SQLITE_ERROR = 1
SQLITE_ABORT = 4
SQLITE_BUSY = 5
SQLITE_NOTFOUND = 12
SQLITE_CONSTRAINT = 19
SQLITE_MISMATCH = 20


@pytest.fixture(scope="session")
def db_connection():
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
        cur.execute("DROP TABLE IF EXISTS audit_log CASCADE")
        cur.execute("DROP TABLE IF EXISTS transaction_ledger CASCADE")
        cur.execute("DROP TABLE IF EXISTS accounts CASCADE")
        schema_path = os.path.join(script_dir, f"../repository_{repo}/schema.sql")
        with open(schema_path, "r") as f:
            cur.execute(f.read())
        transfer_path = os.path.join(script_dir, f"../repository_{repo}/transfer.sql")
        with open(transfer_path, "r") as f:
            cur.execute(f.read())
    yield
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
    assert result[0]['status'] == SQLITE_OK
    assert result[0]['message'] == 'Transfer completed'
    with db_connection.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT balance FROM accounts WHERE id = 1")
        assert cur.fetchone()['balance'] == 75.00
        cur.execute("SELECT balance FROM accounts WHERE id = 2")
        assert cur.fetchone()['balance'] == 75.00
    with db_connection.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM transaction_ledger WHERE request_id = 'req1'")
        ledger = cur.fetchone()
        assert ledger['source_id'] == 1
        assert ledger['dest_id'] == 2
        assert ledger['amount'] == 25.00
    with db_connection.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM audit_log WHERE action = 'TRANSFER'")
        audit = cur.fetchone()
        assert 'req1' in audit['details']

def test_idempotent_transfer(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result1 = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result1[0]['status'] == SQLITE_OK
    result2 = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result2[0]['status'] == SQLITE_OK
    assert result2[0]['message'] == 'Transfer already processed'
    with db_connection.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT balance FROM accounts WHERE id = 1")
        assert cur.fetchone()['balance'] == 75.00

def test_source_account_not_exist(db_connection, setup_schema):
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == SQLITE_NOTFOUND
    assert 'Source account does not exist' in result[0]['message']

def test_dest_account_not_exist(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == SQLITE_NOTFOUND
    assert 'Destination account does not exist' in result[0]['message']

def test_source_account_inactive(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, FALSE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == SQLITE_CONSTRAINT
    assert 'Source account is not active' in result[0]['message']

def test_dest_account_inactive(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, FALSE)")
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == SQLITE_CONSTRAINT
    assert 'Destination account is not active' in result[0]['message']

def test_negative_amount(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, -25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == SQLITE_MISMATCH
    assert 'Transfer amount must be positive' in result[0]['message']

def test_zero_amount(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 0.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == SQLITE_MISMATCH
    assert 'Transfer amount must be positive' in result[0]['message']

def test_insufficient_balance(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 10.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == SQLITE_ABORT
    assert 'Insufficient balance' in result[0]['message']

def test_same_account(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE)")
    result = call_transfer(db_connection, 1, 1, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == SQLITE_CONSTRAINT
    assert 'Source and destination accounts must be different' in result[0]['message']

def test_null_source_id(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, None, 2, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == SQLITE_MISMATCH
    assert 'Invalid input parameters' in result[0]['message']

def test_null_dest_id(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, None, 25.00, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == SQLITE_MISMATCH
    assert 'Invalid input parameters' in result[0]['message']

def test_null_amount(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, None, '2023-01-01 12:00:00', 'req1')
    assert result[0]['status'] == SQLITE_MISMATCH
    assert 'Invalid input parameters' in result[0]['message']

def test_null_transfer_ts(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 25.00, None, 'req1')
    assert result[0]['status'] == SQLITE_MISMATCH
    assert 'Invalid input parameters' in result[0]['message']

def test_null_request_id(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', None)
    assert result[0]['status'] == SQLITE_MISMATCH
    assert 'Invalid input parameters' in result[0]['message']

def test_empty_request_id(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', '')
    assert result[0]['status'] == SQLITE_MISMATCH
    assert 'Invalid input parameters' in result[0]['message']

def test_whitespace_request_id(db_connection, setup_schema):
    with db_connection.cursor() as cur:
        cur.execute("INSERT INTO accounts (id, balance, active) VALUES (1, 100.00, TRUE), (2, 50.00, TRUE)")
    result = call_transfer(db_connection, 1, 2, 25.00, '2023-01-01 12:00:00', '   ')
    assert result[0]['status'] == SQLITE_MISMATCH
    assert 'Invalid input parameters' in result[0]['message']
