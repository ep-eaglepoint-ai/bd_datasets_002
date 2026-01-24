import os
import uuid
import pytest
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta, timezone
from pathlib import Path


SQLITE_OK = 0
SQLITE_ERROR = 1
SQLITE_NOTFOUND = 12
SQLITE_CONSTRAINT = 19
SQLITE_MISMATCH = 20


def get_target_repo():
    return os.environ.get("TARGET_REPO", "repository_after")


def get_sql_path(filename):
    project_root = Path(__file__).parent.parent
    target_repo = get_target_repo()
    return project_root / target_repo / filename


def get_db_connection():
    return psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
        database=os.environ.get("POSTGRES_DB", "testdb"),
        user=os.environ.get("POSTGRES_USER", "testuser"),
        password=os.environ.get("POSTGRES_PASSWORD", "testpass")
    )


@pytest.fixture(scope="function")
def db_connection():
    conn = get_db_connection()
    conn.autocommit = False
    yield conn
    conn.rollback()
    conn.close()


@pytest.fixture(scope="module")
def setup_database():
    conn = get_db_connection()
    conn.autocommit = True
    cursor = conn.cursor()
    
    cursor.execute("DROP TABLE IF EXISTS password_reset_logs CASCADE")
    cursor.execute("DROP TABLE IF EXISTS password_reset_tokens CASCADE")
    cursor.execute("DROP TABLE IF EXISTS users CASCADE")
    cursor.execute("DROP FUNCTION IF EXISTS initiate_password_reset CASCADE")
    
    init_sql_path = get_sql_path("init.sql")
    if init_sql_path.exists():
        with open(init_sql_path, "r") as f:
            init_sql = f.read()
            cursor.execute(init_sql)
    else:
        cursor.close()
        conn.close()
        pytest.fail(f"init.sql not found at {init_sql_path} - implementation missing")
    
    function_sql_path = get_sql_path("password_reset.sql")
    if function_sql_path.exists():
        with open(function_sql_path, "r") as f:
            function_sql = f.read()
            cursor.execute(function_sql)
    else:
        cursor.close()
        conn.close()
        pytest.fail(f"password_reset.sql not found at {function_sql_path} - implementation missing")
    
    cursor.close()
    conn.close()
    
    yield
    
    conn = get_db_connection()
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS password_reset_logs CASCADE")
    cursor.execute("DROP TABLE IF EXISTS password_reset_tokens CASCADE")
    cursor.execute("DROP TABLE IF EXISTS users CASCADE")
    cursor.execute("DROP FUNCTION IF EXISTS initiate_password_reset CASCADE")
    cursor.close()
    conn.close()


@pytest.fixture
def active_user(db_connection, setup_database):
    cursor = db_connection.cursor(cursor_factory=RealDictCursor)
    user_id = str(uuid.uuid4())
    
    cursor.execute("""
        INSERT INTO users (id, email, password_hash, is_active)
        VALUES (%s, %s, %s, TRUE)
        RETURNING id, email, is_active
    """, (user_id, f"test_{user_id[:8]}@example.com", "hashed_password"))
    
    user = cursor.fetchone()
    db_connection.commit()
    yield user
    
    cursor.execute("DELETE FROM password_reset_logs WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM password_reset_tokens WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    db_connection.commit()


@pytest.fixture
def inactive_user(db_connection, setup_database):
    cursor = db_connection.cursor(cursor_factory=RealDictCursor)
    user_id = str(uuid.uuid4())
    
    cursor.execute("""
        INSERT INTO users (id, email, password_hash, is_active)
        VALUES (%s, %s, %s, FALSE)
        RETURNING id, email, is_active
    """, (user_id, f"inactive_{user_id[:8]}@example.com", "hashed_password"))
    
    user = cursor.fetchone()
    db_connection.commit()
    yield user
    
    cursor.execute("DELETE FROM password_reset_logs WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM password_reset_tokens WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    db_connection.commit()


class TestPasswordResetInitiation:
    
    def test_successful_password_reset(self, db_connection, active_user, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user_id = str(active_user["id"])
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (user_id, reset_token, expires_at, request_id))
        
        result = cursor.fetchone()["result"]
        
        assert result["success"] is True
        assert result["error_code"] == SQLITE_OK
        assert result["error_message"] is None
        assert result["data"] is not None
        assert result["data"]["user_id"] == user_id
        assert result["data"]["token"] == reset_token
        assert result["data"]["is_active"] is True
        assert result["data"]["idempotent"] is False
        
        cursor.execute("""
            SELECT * FROM password_reset_tokens WHERE request_id = %s
        """, (request_id,))
        token_record = cursor.fetchone()
        
        assert token_record is not None
        assert str(token_record["user_id"]) == user_id
        assert token_record["token"] == reset_token
        assert token_record["is_active"] is True
    
    def test_user_not_found(self, db_connection, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        non_existent_user_id = str(uuid.uuid4())
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (non_existent_user_id, reset_token, expires_at, request_id))
        
        result = cursor.fetchone()["result"]
        
        assert result["success"] is False
        assert result["error_code"] == SQLITE_NOTFOUND
        assert "not found" in result["error_message"].lower()
        assert result["data"] is None
    
    def test_inactive_user_error(self, db_connection, inactive_user, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user_id = str(inactive_user["id"])
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (user_id, reset_token, expires_at, request_id))
        
        result = cursor.fetchone()["result"]
        
        assert result["success"] is False
        assert result["error_code"] == SQLITE_CONSTRAINT
        assert "not active" in result["error_message"].lower()
        assert result["data"] is None
    
    def test_invalidates_existing_active_tokens(self, db_connection, active_user, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user_id = str(active_user["id"])
        
        old_token = str(uuid.uuid4())
        old_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        old_request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (user_id, old_token, old_expires, old_request_id))
        
        first_result = cursor.fetchone()["result"]
        assert first_result["success"] is True
        old_token_id = first_result["data"]["token_id"]
        
        new_token = str(uuid.uuid4())
        new_expires = datetime.now(timezone.utc) + timedelta(hours=2)
        new_request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (user_id, new_token, new_expires, new_request_id))
        
        second_result = cursor.fetchone()["result"]
        assert second_result["success"] is True
        assert second_result["data"]["invalidated_tokens"] >= 1
        
        cursor.execute("""
            SELECT is_active FROM password_reset_tokens WHERE id = %s
        """, (old_token_id,))
        old_token_record = cursor.fetchone()
        
        assert old_token_record is not None
        assert old_token_record["is_active"] is False
        
        cursor.execute("""
            SELECT is_active FROM password_reset_tokens WHERE request_id = %s
        """, (new_request_id,))
        new_token_record = cursor.fetchone()
        
        assert new_token_record is not None
        assert new_token_record["is_active"] is True
    
    def test_duplicate_request_idempotent(self, db_connection, active_user, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user_id = str(active_user["id"])
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (user_id, reset_token, expires_at, request_id))
        
        first_result = cursor.fetchone()["result"]
        assert first_result["success"] is True
        first_token_id = first_result["data"]["token_id"]
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (user_id, reset_token, expires_at, request_id))
        
        second_result = cursor.fetchone()["result"]
        
        assert second_result["success"] is True
        assert second_result["error_code"] == SQLITE_OK
        assert second_result["data"]["idempotent"] is True
        assert second_result["data"]["token_id"] == first_token_id
        
        cursor.execute("""
            SELECT COUNT(*) as count FROM password_reset_tokens WHERE request_id = %s
        """, (request_id,))
        count = cursor.fetchone()["count"]
        assert count == 1
    
    def test_expired_token_handling(self, db_connection, active_user, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user_id = str(active_user["id"])
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (user_id, reset_token, expires_at, request_id))
        
        result = cursor.fetchone()["result"]
        
        assert result["success"] is True
        assert result["error_code"] == SQLITE_OK
        
        cursor.execute("""
            SELECT * FROM password_reset_tokens WHERE request_id = %s
        """, (request_id,))
        token_record = cursor.fetchone()
        
        assert token_record is not None
        assert token_record["expires_at"] < datetime.now(timezone.utc)
    
    def test_null_user_id_validation(self, db_connection, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(NULL::uuid, %s, %s, %s) as result
        """, (reset_token, expires_at, request_id))
        
        result = cursor.fetchone()["result"]
        
        assert result["success"] is False
        assert result["error_code"] == SQLITE_MISMATCH
        assert "null" in result["error_message"].lower()
    
    def test_null_token_validation(self, db_connection, active_user, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user_id = str(active_user["id"])
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, NULL, %s, %s) as result
        """, (user_id, expires_at, request_id))
        
        result = cursor.fetchone()["result"]
        
        assert result["success"] is False
        assert result["error_code"] == SQLITE_MISMATCH
        assert "null" in result["error_message"].lower() or "empty" in result["error_message"].lower()
    
    def test_null_expiration_validation(self, db_connection, active_user, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user_id = str(active_user["id"])
        reset_token = str(uuid.uuid4())
        request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, NULL, %s) as result
        """, (user_id, reset_token, request_id))
        
        result = cursor.fetchone()["result"]
        
        assert result["success"] is False
        assert result["error_code"] == SQLITE_MISMATCH
        assert "null" in result["error_message"].lower()
    
    def test_null_request_id_validation(self, db_connection, active_user, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user_id = str(active_user["id"])
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, NULL) as result
        """, (user_id, reset_token, expires_at))
        
        result = cursor.fetchone()["result"]
        
        assert result["success"] is False
        assert result["error_code"] == SQLITE_MISMATCH
        assert "null" in result["error_message"].lower() or "empty" in result["error_message"].lower()
    
    def test_logs_created(self, db_connection, active_user, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user_id = str(active_user["id"])
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        request_id = str(uuid.uuid4())
        
        cursor.execute("DELETE FROM password_reset_logs WHERE user_id = %s", (user_id,))
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (user_id, reset_token, expires_at, request_id))
        
        result = cursor.fetchone()["result"]
        assert result["success"] is True
        
        cursor.execute("""
            SELECT * FROM password_reset_logs 
            WHERE request_id = %s AND action = 'RESET_INITIATION_SUCCESS'
        """, (request_id,))
        log_record = cursor.fetchone()
        
        assert log_record is not None
        assert str(log_record["user_id"]) == user_id
        assert log_record["error_code"] == SQLITE_OK
        assert log_record["details"] is not None
    
    def test_error_codes_format(self, db_connection, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        non_existent_user_id = str(uuid.uuid4())
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (non_existent_user_id, reset_token, expires_at, request_id))
        
        result = cursor.fetchone()["result"]
        
        assert "error_code" in result
        assert isinstance(result["error_code"], int)
        assert result["error_code"] in [SQLITE_OK, SQLITE_ERROR, SQLITE_NOTFOUND, 
                                         SQLITE_CONSTRAINT, SQLITE_MISMATCH]
    
    def test_structured_result_format(self, db_connection, active_user, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user_id = str(active_user["id"])
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (user_id, reset_token, expires_at, request_id))
        
        result = cursor.fetchone()["result"]
        
        assert "success" in result
        assert "error_code" in result
        assert "error_message" in result
        assert "data" in result
        
        assert isinstance(result["success"], bool)
        assert isinstance(result["error_code"], int)
        
        if result["success"]:
            assert result["data"] is not None
            assert "token_id" in result["data"]
            assert "user_id" in result["data"]
            assert "token" in result["data"]
            assert "expires_at" in result["data"]
            assert "is_active" in result["data"]
    
    def test_empty_token_validation(self, db_connection, active_user, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user_id = str(active_user["id"])
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, '', %s, %s) as result
        """, (user_id, expires_at, request_id))
        
        result = cursor.fetchone()["result"]
        
        assert result["success"] is False
        assert result["error_code"] == SQLITE_MISMATCH
    
    def test_empty_request_id_validation(self, db_connection, active_user, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user_id = str(active_user["id"])
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, '') as result
        """, (user_id, reset_token, expires_at))
        
        result = cursor.fetchone()["result"]
        
        assert result["success"] is False
        assert result["error_code"] == SQLITE_MISMATCH
    
    def test_multiple_users_tokens_isolation(self, db_connection, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        user1_id = str(uuid.uuid4())
        user2_id = str(uuid.uuid4())
        
        cursor.execute("""
            INSERT INTO users (id, email, password_hash, is_active)
            VALUES (%s, %s, %s, TRUE)
        """, (user1_id, f"user1_{user1_id[:8]}@example.com", "hash"))
        
        cursor.execute("""
            INSERT INTO users (id, email, password_hash, is_active)
            VALUES (%s, %s, %s, TRUE)
        """, (user2_id, f"user2_{user2_id[:8]}@example.com", "hash"))
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (user1_id, str(uuid.uuid4()), datetime.now(timezone.utc) + timedelta(hours=1), str(uuid.uuid4())))
        
        user1_result = cursor.fetchone()["result"]
        assert user1_result["success"] is True
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (user2_id, str(uuid.uuid4()), datetime.now(timezone.utc) + timedelta(hours=1), str(uuid.uuid4())))
        
        user2_result = cursor.fetchone()["result"]
        assert user2_result["success"] is True
        
        cursor.execute("""
            SELECT COUNT(*) as count FROM password_reset_tokens WHERE user_id = %s AND is_active = TRUE
        """, (user1_id,))
        user1_count = cursor.fetchone()["count"]
        assert user1_count == 1
        
        cursor.execute("""
            SELECT COUNT(*) as count FROM password_reset_tokens WHERE user_id = %s AND is_active = TRUE
        """, (user2_id,))
        user2_count = cursor.fetchone()["count"]
        assert user2_count == 1
        
        cursor.execute("DELETE FROM password_reset_logs WHERE user_id IN (%s, %s)", (user1_id, user2_id))
        cursor.execute("DELETE FROM password_reset_tokens WHERE user_id IN (%s, %s)", (user1_id, user2_id))
        cursor.execute("DELETE FROM users WHERE id IN (%s, %s)", (user1_id, user2_id))
    
    def test_log_entries_for_failed_operations(self, db_connection, setup_database):
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)
        
        non_existent_user_id = str(uuid.uuid4())
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        request_id = str(uuid.uuid4())
        
        cursor.execute("""
            SELECT initiate_password_reset(%s::uuid, %s, %s, %s) as result
        """, (non_existent_user_id, reset_token, expires_at, request_id))
        
        result = cursor.fetchone()["result"]
        assert result["success"] is False
        
        cursor.execute("""
            SELECT * FROM password_reset_logs 
            WHERE request_id = %s AND action = 'RESET_INITIATION_FAILED'
        """, (request_id,))
        log_record = cursor.fetchone()
        
        assert log_record is not None
        assert log_record["error_code"] == SQLITE_NOTFOUND
        assert log_record["details"]["reason"] == "user_not_found"
