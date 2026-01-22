import pytest
import psycopg2
import os
import time

@pytest.fixture(scope="module")
def db_conn():
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "postgres"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "billing_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres")
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    cursor.execute("DROP TABLE IF EXISTS invoice_lines CASCADE")
    cursor.execute("DROP TABLE IF EXISTS invoices CASCADE")
    cursor.execute("DROP TABLE IF EXISTS products CASCADE")
    
    cursor.execute("""
        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            price NUMERIC NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE invoices (
            id INTEGER PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            created_at TIMESTAMP NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE invoice_lines (
            id INTEGER PRIMARY KEY,
            invoice_id INTEGER NOT NULL REFERENCES invoices(id),
            product_id INTEGER NOT NULL REFERENCES products(id),
            quantity INTEGER NOT NULL
        )
    """)
    
    with open('repository_before/customer_billing.sql', 'r') as f:
        cursor.execute(f.read())
    
    yield conn
    
    cursor.close()
    conn.close()

@pytest.fixture(scope="function")
def clean_db(db_conn):
    cursor = db_conn.cursor()
    cursor.execute("DELETE FROM invoice_lines")
    cursor.execute("DELETE FROM invoices")
    cursor.execute("DELETE FROM products")
    cursor.close()
    yield

#Correct billing results; FAILS due to ambiguous column
def test_correct_billing_calculation(db_conn, clean_db):
    """FAILS: Cannot calculate billing due to ambiguous column error"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.50), (2, 25.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00')")
    cursor.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES (1, 1, 1, 2), (2, 1, 2, 3)")
    
    cursor.execute("SELECT invoice_id, billed_amount FROM generate_customer_billing_summary(100)")
    result = cursor.fetchone()
    
    expected = (2 * 10.50) + (3 * 25.00)
    assert result[1] == expected
    cursor.close()

#Performance. FAILS due to pg_sleep and inefficient loops
def test_performance_large_dataset(db_conn, clean_db):
    """FAILS: Too slow due to pg_sleep(0.02) per invoice"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    for i in range(1, 51):
        cursor.execute(f"INSERT INTO invoices (id, customer_id, created_at) VALUES ({i}, 100, '2024-01-01 10:00:00')")
        cursor.execute(f"INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES ({i}, {i}, 1, 1)")
    
    start = time.time()
    cursor.execute("SELECT * FROM generate_customer_billing_summary(100)")
    results = cursor.fetchall()
    duration = time.time() - start
    
    assert len(results) == 50
    # With pg_sleep(0.02), 50 invoices = 1+ second minimum
    assert duration < 0.5, f"Too slow: {duration}s (has pg_sleep)"
    cursor.close()

#Concurrent execution; FAILS due to ambiguous column
def test_concurrent_execution_safe(db_conn, clean_db):
    """FAILS: Cannot execute due to ambiguous column"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00')")
    cursor.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES (1, 1, 1, 1)")
    
    cursor.execute("SELECT * FROM generate_customer_billing_summary(100)")
    result = cursor.fetchall()
    
    assert len(result) == 1
    cursor.close()

#Correct SQLSTATE codes - FAILS wrong error code
def test_null_customer_id_error_code(db_conn, clean_db):
    """FAILS: Uses wrong SQLSTATE 23505 instead of 22004"""
    cursor = db_conn.cursor()
    try:
        cursor.execute("SELECT * FROM generate_customer_billing_summary(NULL)")
        pytest.fail("Expected exception for NULL customer_id")
    except psycopg2.Error as e:
        assert e.pgcode == '22004', f"Expected 22004, got {e.pgcode}"
    finally:
        cursor.close()

#Handle no-data cases - FAILS raises error instead of empty
def test_no_data_returns_empty(db_conn, clean_db):
    """FAILS: Raises error instead of returning empty result"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00')")
    
    cursor.execute("SELECT * FROM generate_customer_billing_summary(999)")
    results = cursor.fetchall()
    assert len(results) == 0, "Should return empty, not raise error"
    cursor.close()

#Deterministic - FAILS due to ambiguous column
def test_deterministic_results(db_conn, clean_db):
    """FAILS: Cannot execute due to ambiguous column"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00')")
    cursor.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES (1, 1, 1, 5)")
    
    cursor.execute("SELECT * FROM generate_customer_billing_summary(100)")
    result1 = cursor.fetchall()
    
    cursor.execute("SELECT * FROM generate_customer_billing_summary(100)")
    result2 = cursor.fetchall()
    
    assert result1 == result2
    cursor.close()

#PostgreSQL best practices - FAILS uses loops not JOINs
def test_uses_sql_joins_not_loops(db_conn, clean_db):
    """FAILS: Uses procedural loops instead of SQL JOINs"""
    with open('repository_before/customer_billing.sql', 'r') as f:
        sql_content = f.read()
        assert 'JOIN' in sql_content.upper(), "Should use JOINs, not loops"
        assert 'FOR r_' not in sql_content, "Should not use procedural loops"

#Function signature - PASSES (signature is correct)
def test_function_signature_unchanged(db_conn, clean_db):
    """PASSES: Function signature is correct"""
    cursor = db_conn.cursor()
    
    cursor.execute("""
        SELECT 
            p.proname,
            pg_catalog.pg_get_function_arguments(p.oid) as args,
            pg_catalog.pg_get_function_result(p.oid) as result
        FROM pg_catalog.pg_proc p
        WHERE p.proname = 'generate_customer_billing_summary'
    """)
    
    result = cursor.fetchone()
    assert result is not None
    assert 'p_customer_id integer' in result[1].lower()
    assert 'invoice_id integer' in result[2].lower()
    assert 'billed_amount numeric' in result[2].lower()
    assert 'invoice_date timestamp' in result[2].lower()
    cursor.close()

# Additional execution test - FAILS due to ambiguous column
def test_multiple_invoices(db_conn, clean_db):
    """FAILS: Cannot execute due to ambiguous column"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00'), (2, 100, '2024-01-02 10:00:00')")
    cursor.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES (1, 1, 1, 2), (2, 2, 1, 3)")
    
    cursor.execute("SELECT invoice_id, billed_amount FROM generate_customer_billing_summary(100)")
    results = cursor.fetchall()
    
    assert len(results) == 2
    cursor.close()
