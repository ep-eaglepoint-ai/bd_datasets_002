import pytest
import psycopg2
import os
import time
import threading

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
    
    with open('repository_after/customer_billing.sql', 'r') as f:
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

#Correct billing results
def test_correct_billing_calculation(db_conn, clean_db):
    """REQ 1: Function produces correct billing results"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.50), (2, 25.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00')")
    cursor.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES (1, 1, 1, 2), (2, 1, 2, 3)")
    
    cursor.execute("SELECT invoice_id, billed_amount FROM generate_customer_billing_summary(100)")
    result = cursor.fetchone()
    
    expected = (2 * 10.50) + (3 * 25.00)
    assert result[1] == expected, f"Expected {expected}, got {result[1]}"
    cursor.close()

def test_multiple_invoices_correct_totals(db_conn, clean_db):
    """REQ 1: Correct billing for multiple invoices"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00'), (2, 100, '2024-01-02 10:00:00')")
    cursor.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES (1, 1, 1, 2), (2, 2, 1, 3)")
    
    cursor.execute("SELECT invoice_id, billed_amount FROM generate_customer_billing_summary(100) ORDER BY invoice_id")
    results = cursor.fetchall()
    
    assert len(results) == 2
    assert results[0] == (1, 20.00)
    assert results[1] == (2, 30.00)
    cursor.close()

#Efficient performance on large datasets
def test_performance_large_dataset(db_conn, clean_db):
    """REQ 2: Performs efficiently on large datasets"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    for i in range(1, 101):
        cursor.execute(f"INSERT INTO invoices (id, customer_id, created_at) VALUES ({i}, 100, '2024-01-01 10:00:00')")
        cursor.execute(f"INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES ({i}, {i}, 1, 1)")
    
    start = time.time()
    cursor.execute("SELECT * FROM generate_customer_billing_summary(100)")
    results = cursor.fetchall()
    duration = time.time() - start
    
    assert len(results) == 100
    assert duration < 1.0, f"Too slow: {duration}s for 100 invoices"
    cursor.close()

def test_scales_with_data_volume(db_conn, clean_db):
    """REQ 2: Performance scales predictably"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    # Add many invoices for other customers (should not slow down query)
    for i in range(1, 201):
        customer_id = 999 if i <= 100 else 100
        cursor.execute(f"INSERT INTO invoices (id, customer_id, created_at) VALUES ({i}, {customer_id}, '2024-01-01 10:00:00')")
        cursor.execute(f"INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES ({i}, {i}, 1, 1)")
    
    start = time.time()
    cursor.execute("SELECT * FROM generate_customer_billing_summary(100)")
    results = cursor.fetchall()
    duration = time.time() - start
    
    assert len(results) == 100
    assert duration < 1.0, f"Should filter efficiently: {duration}s"
    cursor.close()

#Safe concurrent execution
def test_concurrent_execution_safe(db_conn, clean_db):
    """REQ 3: Scales safely under concurrent execution"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00'), (2, 200, '2024-01-01 10:00:00')")
    cursor.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES (1, 1, 1, 5), (2, 2, 1, 3)")
    cursor.close()
    
    results = []
    errors = []
    
    def run_query(customer_id):
        try:
            conn = psycopg2.connect(
                host=os.getenv("DB_HOST", "postgres"),
                database=os.getenv("DB_NAME", "billing_db"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres")
            )
            cur = conn.cursor()
            cur.execute(f"SELECT * FROM generate_customer_billing_summary({customer_id})")
            results.append((customer_id, cur.fetchall()))
            cur.close()
            conn.close()
        except Exception as e:
            errors.append(e)
    
    threads = [threading.Thread(target=run_query, args=(100,)) for _ in range(5)]
    threads += [threading.Thread(target=run_query, args=(200,)) for _ in range(5)]
    
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    
    assert len(errors) == 0, f"Concurrent execution errors: {errors}"
    assert len(results) == 10
    # Verify results are correct
    for customer_id, res in results:
        if customer_id == 100:
            assert len(res) == 1 and res[0][1] == 50.00
        else:
            assert len(res) == 1 and res[0][1] == 30.00

#Appropriate SQLSTATE error codes
def test_null_parameter_correct_error_code(db_conn, clean_db):
    """REQ 4: Uses correct SQLSTATE 22004 for NULL parameter"""
    cursor = db_conn.cursor()
    try:
        cursor.execute("SELECT * FROM generate_customer_billing_summary(NULL)")
        pytest.fail("Expected exception for NULL customer_id")
    except psycopg2.Error as e:
        assert e.pgcode == '22004', f"Expected SQLSTATE 22004, got {e.pgcode}"
    finally:
        cursor.close()

#Handle invalid input and no-data cases
def test_no_data_returns_empty(db_conn, clean_db):
    """REQ 5: No-data case returns empty result (not error)"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00')")
    
    cursor.execute("SELECT * FROM generate_customer_billing_summary(999)")
    results = cursor.fetchall()
    assert len(results) == 0
    cursor.close()

def test_invoice_without_lines(db_conn, clean_db):
    """REQ 5: Invoice with no lines returns 0 amount"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00')")
    
    cursor.execute("SELECT invoice_id, billed_amount FROM generate_customer_billing_summary(100)")
    result = cursor.fetchone()
    
    assert result == (1, 0)
    cursor.close()

#Safe, deterministic, side-effect free
def test_deterministic_results(db_conn, clean_db):
    """REQ 6: Function is deterministic - same input = same output"""
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

def test_no_side_effects(db_conn, clean_db):
    """REQ 6: Function has no side effects - doesn't modify data"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00')")
    cursor.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES (1, 1, 1, 5)")
    
    # Get counts before
    cursor.execute("SELECT COUNT(*) FROM products")
    products_before = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM invoices")
    invoices_before = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM invoice_lines")
    lines_before = cursor.fetchone()[0]
    
    # Run function
    cursor.execute("SELECT * FROM generate_customer_billing_summary(100)")
    cursor.fetchall()
    
    # Get counts after
    cursor.execute("SELECT COUNT(*) FROM products")
    products_after = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM invoices")
    invoices_after = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM invoice_lines")
    lines_after = cursor.fetchone()[0]
    
    assert products_before == products_after
    assert invoices_before == invoices_after
    assert lines_before == lines_after
    cursor.close()

#PostgreSQL best practices
def test_uses_sql_joins_not_loops(db_conn, clean_db):
    """REQ 7: Follows PostgreSQL best practices - uses JOINs"""
    with open('repository_after/customer_billing.sql', 'r') as f:
        sql_content = f.read()
        assert 'JOIN' in sql_content.upper(), "Should use JOINs"
        assert 'FOR' not in sql_content or 'FOR r_' not in sql_content, "Should not use procedural loops"

def test_ordered_results(db_conn, clean_db):
    """REQ 7: Results are ordered consistently"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-03 10:00:00'), (2, 100, '2024-01-01 10:00:00'), (3, 100, '2024-01-02 10:00:00')")
    cursor.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES (1, 1, 1, 1), (2, 2, 1, 1), (3, 3, 1, 1)")
    
    cursor.execute("SELECT invoice_id FROM generate_customer_billing_summary(100)")
    results = cursor.fetchall()
    
    # Should be ordered by date
    assert results[0][0] == 2
    assert results[1][0] == 3
    assert results[2][0] == 1
    cursor.close()

#Function signature unchanged
def test_function_signature_unchanged(db_conn, clean_db):
    """REQ 8: Function signature matches original specification"""
    cursor = db_conn.cursor()
    
    # Check function exists with correct signature
    cursor.execute("""
        SELECT 
            p.proname,
            pg_catalog.pg_get_function_arguments(p.oid) as args,
            pg_catalog.pg_get_function_result(p.oid) as result
        FROM pg_catalog.pg_proc p
        WHERE p.proname = 'generate_customer_billing_summary'
    """)
    
    result = cursor.fetchone()
    assert result is not None, "Function should exist"
    assert 'p_customer_id integer' in result[1].lower(), "Should accept INTEGER parameter"
    assert 'invoice_id integer' in result[2].lower(), "Should return invoice_id"
    assert 'billed_amount numeric' in result[2].lower(), "Should return billed_amount"
    assert 'invoice_date timestamp' in result[2].lower(), "Should return invoice_date"
    cursor.close()

def test_returns_correct_columns(db_conn, clean_db):
    """REQ 8: Returns correct column structure"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 10.00)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00')")
    cursor.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES (1, 1, 1, 1)")
    
    cursor.execute("SELECT * FROM generate_customer_billing_summary(100)")
    result = cursor.fetchone()
    
    # Should have 3 columns: invoice_id, billed_amount, invoice_date
    assert len(result) == 3
    assert isinstance(result[0], int), "invoice_id should be INTEGER"
    assert isinstance(result[1], (int, float)) or str(type(result[1])) == "<class 'decimal.Decimal'>", "billed_amount should be NUMERIC"
    assert hasattr(result[2], 'strftime'), "invoice_date should be TIMESTAMP"
    cursor.close()

def test_large_amounts(db_conn, clean_db):
    """REQ 1: Handles large billing amounts correctly"""
    cursor = db_conn.cursor()
    
    cursor.execute("INSERT INTO products (id, price) VALUES (1, 999999.99)")
    cursor.execute("INSERT INTO invoices (id, customer_id, created_at) VALUES (1, 100, '2024-01-01 10:00:00')")
    cursor.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, quantity) VALUES (1, 1, 1, 1000)")
    
    cursor.execute("SELECT billed_amount FROM generate_customer_billing_summary(100)")
    result = cursor.fetchone()
    
    assert result[0] == 999999990.00
    cursor.close()
