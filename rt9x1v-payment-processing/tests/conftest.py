import os
import pytest
import psycopg2
from pathlib import Path

# Database configuration used in Docker
DB_HOST = os.environ.get("DB_HOST", "db")
DB_NAME = os.environ.get("POSTGRES_DB", "postgres")
DB_USER = os.environ.get("POSTGRES_USER", "postgres")
DB_PASS = os.environ.get("POSTGRES_PASSWORD", "postgres")

@pytest.fixture(scope="session")
def db_connection():
    """Create a database connection."""
    max_retries = 5
    import time
    conn = None
    for i in range(max_retries):
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASS
            )
            conn.autocommit = True
            break
        except psycopg2.OperationalError:
            if i == max_retries - 1:
                raise
            time.sleep(2)
    
    yield conn
    if conn:
        conn.close()

@pytest.fixture(scope="function")
def db_cursor(db_connection):
    """Provide a database cursor and clean up after test."""
    cur = db_connection.cursor()
    yield cur
    cur.close()

@pytest.fixture(scope="function", autouse=True)
def setup_database(db_cursor):
    """
    Load schema and functions from the target repository.
    The target repository directory is determined by TARGET_REPO env var.
    Default to 'repository_after' if not set, but for the task we use env vars.
    """
    target_repo_name = os.environ.get("TARGET_REPO", "repository_after")
    
    # Clean up first
    db_cursor.execute("DROP TABLE IF EXISTS payment_audit_log CASCADE;")
    db_cursor.execute("DROP TABLE IF EXISTS payments CASCADE;")
    db_cursor.execute("DROP TABLE IF EXISTS orders CASCADE;")
    db_cursor.execute("DROP FUNCTION IF EXISTS process_payment CASCADE;")
    db_cursor.execute("DROP TYPE IF EXISTS payment_result CASCADE;")

    # Construct paths
    # We assume tests are running from the project root or tests dir, 
    # but simplest is to find the project root relative to this file.
    project_root = Path(__file__).parent.parent
    repo_dir = project_root / target_repo_name
    
    schema_path = repo_dir / "schema.sql"
    func_path = repo_dir / "process_payment.sql"

    # Load Schema
    if schema_path.exists():
        with open(schema_path, "r") as f:
            db_cursor.execute(f.read())
    else:
        # If schema doesn't exist (e.g. repository_before), we can't really test much.
        # But maybe we should create the tables anyway to test the function specifically?
        # The prompt says "repository_before ... expected to fail because there is no implementation".
        # So if schema is missing, tests might fail with "relation does not exist". This is acceptable.
        pass

    # Load Function
    if func_path.exists():
        with open(func_path, "r") as f:
            db_cursor.execute(f.read())
