import os
import time
import psycopg2
import pytest

REPO_PATH = os.getenv('REPO_PATH', 'repository_after')

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv('POSTGRES_HOST', 'localhost'),
        port=os.getenv('POSTGRES_PORT', '5432'),
        user=os.getenv('POSTGRES_USER', 'postgres'),
        password=os.getenv('POSTGRES_PASSWORD', 'password'),
        dbname=os.getenv('POSTGRES_DB', 'testdb')
    )

@pytest.fixture(scope='session', autouse=True)
def setup_database():
    conn = get_db_connection()
    cur = conn.cursor()
    # Drop existing function
    cur.execute("DROP FUNCTION IF EXISTS get_avg_order_amount(INT);")
    # Drop and create tables
    cur.execute("DROP TABLE IF EXISTS customers;")
    cur.execute("""
        CREATE TABLE customers (
            id INT PRIMARY KEY,
            name TEXT
        );
    """)
    cur.execute("DROP TABLE IF EXISTS orders;")
    cur.execute("""
        CREATE TABLE orders (
            id SERIAL PRIMARY KEY,
            customer_id INT,
            total_amount NUMERIC
        );
    """)
    # Load the function
    with open(f'{REPO_PATH}/avg_order.sql', 'r') as f:
        sql = f.read()
    cur.execute(sql)
    conn.commit()
    # Insert test data
    cur.execute("INSERT INTO customers (id, name) VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie');")
    cur.execute("INSERT INTO orders (customer_id, total_amount) VALUES (1, 100), (1, 200), (2, 150);")
    conn.commit()
    cur.close()
    conn.close()

def test_avg_order_with_orders():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT get_avg_order_amount(1);")
    result = cur.fetchone()[0]
    assert result == 150.0
    cur.close()
    conn.close()

def test_avg_order_customer_exists_no_orders():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT get_avg_order_amount(3);")
    result = cur.fetchone()[0]
    assert result is None
    cur.close()
    conn.close()

def test_avg_order_customer_not_exists():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT get_avg_order_amount(999);")
    result = cur.fetchone()[0]
    assert result is None
    cur.close()
    conn.close()

def test_avg_order_null_input():
    conn = get_db_connection()
    cur = conn.cursor()
    with pytest.raises(psycopg2.errors.NullValueNotAllowed) as exc_info:
        cur.execute("SELECT get_avg_order_amount(NULL);")
    assert exc_info.value.pgcode == '22004'
    cur.close()
    conn.close()

def test_avg_order_invalid_input():
    conn = get_db_connection()
    cur = conn.cursor()
    with pytest.raises(psycopg2.errors.InvalidParameterValue) as exc_info:
        cur.execute("SELECT get_avg_order_amount(0);")
    assert exc_info.value.pgcode == '22023'
    cur.close()
    conn.close()

def test_performance():
    conn = get_db_connection()
    cur = conn.cursor()
    start = time.time()
    cur.execute("SELECT get_avg_order_amount(1);")
    end = time.time()
    duration = end - start
    assert duration < 1.0, f"Function took {duration}s, expected <1s"
    cur.close()
    conn.close()