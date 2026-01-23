import pytest
import psycopg2
import psycopg2.extras
import uuid
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

psycopg2.extras.register_uuid()

@pytest.fixture(scope="session")
def db_config():
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": os.getenv("DB_PORT", "5432"),
        "database": os.getenv("DB_NAME", "registration_db"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "postgres"),
    }


@pytest.fixture(scope="session")
def db_connection(db_config):
    conn = psycopg2.connect(**db_config)
    conn.autocommit = True
    yield conn
    conn.close()


@pytest.fixture(scope="session", autouse=True)
def setup_database(db_connection):
    with db_connection.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS audit_log CASCADE")
        cur.execute("DROP TABLE IF EXISTS processed_requests CASCADE")
        cur.execute("DROP TABLE IF EXISTS user_profiles CASCADE")
        cur.execute("DROP TABLE IF EXISTS users CASCADE")
        cur.execute("DROP TYPE IF EXISTS user_registration_result CASCADE")
        
        cur.execute("""
            CREATE TABLE users (
                id BIGSERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL
            )
        """)
        
        cur.execute("""
            CREATE TABLE user_profiles (
                user_id BIGINT PRIMARY KEY REFERENCES users(id),
                full_name TEXT NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL
            )
        """)
        
        cur.execute("""
            CREATE TABLE processed_requests (
                request_id UUID PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id),
                processed_at TIMESTAMP WITH TIME ZONE NOT NULL
            )
        """)
        
        cur.execute("""
            CREATE TABLE audit_log (
                id BIGSERIAL PRIMARY KEY,
                request_id UUID,
                email TEXT,
                user_id BIGINT,
                status TEXT NOT NULL,
                details TEXT,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL
            )
        """)
        
        with open("/app/repository_after/user-registration.sql", "r") as f:
            cur.execute(f.read())
    
    yield
    
    with db_connection.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS audit_log CASCADE")
        cur.execute("DROP TABLE IF EXISTS processed_requests CASCADE")
        cur.execute("DROP TABLE IF EXISTS user_profiles CASCADE")
        cur.execute("DROP TABLE IF EXISTS users CASCADE")
        cur.execute("DROP TYPE IF EXISTS user_registration_result CASCADE")


@pytest.fixture(autouse=True)
def clean_tables(db_connection):
    yield
    with db_connection.cursor() as cur:
        cur.execute("TRUNCATE audit_log, processed_requests, user_profiles, users RESTART IDENTITY CASCADE")


def register_user(conn, email, password_hash, full_name, timestamp, request_id):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM register_user(%s, %s, %s, %s, %s::uuid)",
            (email, password_hash, full_name, timestamp, str(request_id) if request_id else None)
        )
        return cur.fetchone()


class TestCorrectBillingResults:
    def test_successful_registration(self, db_connection):
        result = register_user(
            db_connection,
            "test@example.com",
            "hash123",
            "Test User",
            datetime.now(timezone.utc),
            uuid.uuid4()
        )
        assert result[0] == 0
        assert "successfully" in result[1].lower()
        assert result[2] is not None

    def test_duplicate_email_rejected(self, db_connection):
        email = "duplicate@example.com"
        register_user(db_connection, email, "hash1", "User One", datetime.now(timezone.utc), uuid.uuid4())
        
        result = register_user(db_connection, email, "hash2", "User Two", datetime.now(timezone.utc), uuid.uuid4())
        assert result[0] == 19
        assert "already registered" in result[1].lower()
        assert result[2] is None

    def test_idempotent_request(self, db_connection):
        request_id = uuid.uuid4()
        result1 = register_user(db_connection, "idempotent@example.com", "hash", "User", datetime.now(timezone.utc), request_id)
        result2 = register_user(db_connection, "idempotent@example.com", "hash", "User", datetime.now(timezone.utc), request_id)
        
        assert result1[0] == 0
        assert result2[0] == 0
        assert result1[2] == result2[2]


class TestPerformanceOnLargeDatasets:
    def test_bulk_registration_performance(self, db_connection):
        import time
        start = time.time()
        
        for i in range(100):
            register_user(
                db_connection,
                f"user{i}@example.com",
                f"hash{i}",
                f"User {i}",
                datetime.now(timezone.utc),
                uuid.uuid4()
            )
        
        elapsed = time.time() - start
        assert elapsed < 10

    def test_query_with_existing_users(self, db_connection):
        for i in range(50):
            register_user(db_connection, f"existing{i}@example.com", "hash", "User", datetime.now(timezone.utc), uuid.uuid4())
        
        import time
        start = time.time()
        register_user(db_connection, "new@example.com", "hash", "New User", datetime.now(timezone.utc), uuid.uuid4())
        elapsed = time.time() - start
        
        assert elapsed < 1


class TestConcurrentExecution:
    def test_concurrent_different_users(self, db_connection):
        def register(index):
            conn = psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432"),
                database=os.getenv("DB_NAME", "registration_db"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres")
            )
            conn.autocommit = True
            result = register_user(conn, f"concurrent{index}@example.com", "hash", f"User {index}", datetime.now(timezone.utc), uuid.uuid4())
            conn.close()
            return result
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(register, i) for i in range(10)]
            results = [f.result() for f in as_completed(futures)]
        
        assert all(r[0] == 0 for r in results)
        assert len(set(r[2] for r in results)) == 10

    def test_concurrent_same_email(self, db_connection):
        email = "race@example.com"
        
        def register(_):
            conn = psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432"),
                database=os.getenv("DB_NAME", "registration_db"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres")
            )
            conn.autocommit = True
            result = register_user(conn, email, "hash", "User", datetime.now(timezone.utc), uuid.uuid4())
            conn.close()
            return result
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(register, i) for i in range(5)]
            results = [f.result() for f in as_completed(futures)]
        
        success_count = sum(1 for r in results if r[0] == 0)
        constraint_count = sum(1 for r in results if r[0] == 19)
        
        assert success_count == 1
        assert constraint_count == 4

    def test_concurrent_idempotent_requests(self, db_connection):
        request_id = uuid.uuid4()
        
        def register(_):
            conn = psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432"),
                database=os.getenv("DB_NAME", "registration_db"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres")
            )
            conn.autocommit = True
            result = register_user(conn, "idempotent@example.com", "hash", "User", datetime.now(timezone.utc), request_id)
            conn.close()
            return result
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(register, i) for i in range(5)]
            results = [f.result() for f in as_completed(futures)]
        
        success_results = [r for r in results if r[0] == 0]
        assert len(success_results) >= 1
        assert all(r[2] == success_results[0][2] for r in success_results)


class TestErrorCodes:
    def test_missing_email_returns_misuse(self, db_connection):
        result = register_user(db_connection, None, "hash", "User", datetime.now(timezone.utc), uuid.uuid4())
        assert result[0] == 21

    def test_empty_email_returns_misuse(self, db_connection):
        result = register_user(db_connection, "   ", "hash", "User", datetime.now(timezone.utc), uuid.uuid4())
        assert result[0] == 21

    def test_invalid_email_format_returns_misuse(self, db_connection):
        result = register_user(db_connection, "notanemail", "hash", "User", datetime.now(timezone.utc), uuid.uuid4())
        assert result[0] == 21

    def test_missing_password_returns_misuse(self, db_connection):
        result = register_user(db_connection, "test@example.com", None, "User", datetime.now(timezone.utc), uuid.uuid4())
        assert result[0] == 21

    def test_missing_name_returns_misuse(self, db_connection):
        result = register_user(db_connection, "test@example.com", "hash", None, datetime.now(timezone.utc), uuid.uuid4())
        assert result[0] == 21

    def test_missing_request_id_returns_misuse(self, db_connection):
        result = register_user(db_connection, "test@example.com", "hash", "User", datetime.now(timezone.utc), None)
        assert result[0] == 21

    def test_duplicate_email_returns_constraint(self, db_connection):
        register_user(db_connection, "dup@example.com", "hash", "User", datetime.now(timezone.utc), uuid.uuid4())
        result = register_user(db_connection, "dup@example.com", "hash", "User", datetime.now(timezone.utc), uuid.uuid4())
        assert result[0] == 19


class TestInvalidInputHandling:
    def test_null_inputs(self, db_connection):
        result = register_user(db_connection, None, None, None, None, None)
        assert result[0] == 21
        assert result[2] is None

    def test_whitespace_only_inputs(self, db_connection):
        result = register_user(db_connection, "   ", "   ", "   ", datetime.now(timezone.utc), uuid.uuid4())
        assert result[0] == 21

    def test_invalid_email_formats(self, db_connection):
        invalid_emails = ["notanemail", "@example.com", "user@", "user@.com"]
        for email in invalid_emails:
            result = register_user(db_connection, email, "hash", "User", datetime.now(timezone.utc), uuid.uuid4())
            assert result[0] == 21


class TestSafeDeterministicBehavior:
    def test_email_normalized_to_lowercase(self, db_connection):
        result = register_user(db_connection, "Test@EXAMPLE.COM", "hash", "User", datetime.now(timezone.utc), uuid.uuid4())
        
        with db_connection.cursor() as cur:
            cur.execute("SELECT email FROM users WHERE id = %s", (result[2],))
            stored_email = cur.fetchone()[0]
        
        assert stored_email == "test@example.com"

    def test_whitespace_trimmed(self, db_connection):
        result = register_user(db_connection, "  test@example.com  ", "hash", "  Test User  ", datetime.now(timezone.utc), uuid.uuid4())
        
        assert result[0] == 0
        assert result[2] is not None
        
        with db_connection.cursor() as cur:
            cur.execute("SELECT email FROM users WHERE id = %s", (result[2],))
            email = cur.fetchone()[0]
            cur.execute("SELECT full_name FROM user_profiles WHERE user_id = %s", (result[2],))
            name = cur.fetchone()[0]
        
        assert email == "test@example.com"
        assert name == "Test User"

    def test_audit_log_created(self, db_connection):
        request_id = uuid.uuid4()
        register_user(db_connection, "audit@example.com", "hash", "User", datetime.now(timezone.utc), request_id)
        
        with db_connection.cursor() as cur:
            cur.execute("SELECT status FROM audit_log WHERE request_id = %s", (request_id,))
            status = cur.fetchone()[0]
        
        assert status == "SUCCESS"

    def test_audit_log_on_failure(self, db_connection):
        request_id = uuid.uuid4()
        register_user(db_connection, "invalid", "hash", "User", datetime.now(timezone.utc), request_id)
        
        with db_connection.cursor() as cur:
            cur.execute("SELECT status FROM audit_log WHERE request_id = %s", (request_id,))
            status = cur.fetchone()[0]
        
        assert status == "FAILURE"


class TestPostgreSQLBestPractices:
    def test_atomic_transaction(self, db_connection):
        register_user(db_connection, "atomic@example.com", "hash", "User", datetime.now(timezone.utc), uuid.uuid4())
        
        with db_connection.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM users WHERE email = 'atomic@example.com'")
            user_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM user_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'atomic@example.com')")
            profile_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM processed_requests WHERE user_id = (SELECT id FROM users WHERE email = 'atomic@example.com')")
            request_count = cur.fetchone()[0]
        
        assert user_count == 1
        assert profile_count == 1
        assert request_count == 1

    def test_function_signature_unchanged(self, db_connection):
        with db_connection.cursor() as cur:
            cur.execute("""
                SELECT proname, pronargs 
                FROM pg_proc 
                WHERE proname = 'register_user'
            """)
            result = cur.fetchone()
        
        assert result[0] == "register_user"
        assert result[1] == 5
