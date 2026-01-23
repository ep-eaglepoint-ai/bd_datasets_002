import os
import psycopg2
import pytest


@pytest.fixture(scope="module")
def db_conn():
    """Database connection fixture."""
    repo_path = os.getenv("REPO_PATH", "repository_after")
    
    admin_conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname="postgres",
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres")
    )
    admin_conn.autocommit = True
    
    with admin_conn.cursor() as cur:
        cur.execute("DROP DATABASE IF EXISTS ecommerce_db")
        cur.execute("CREATE DATABASE ecommerce_db")
    
    admin_conn.close()
    
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname="ecommerce_db",
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres")
    )
    
    with conn.cursor() as cur:
        with open(f"{repo_path}/schema.sql") as f:
            cur.execute(f.read())
        conn.commit()
    
    yield conn
    conn.close()


def test_required_indexes_exist(db_conn):
    """All required optimization indexes must exist."""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname LIKE 'idx_%'
            ORDER BY indexname
        """)
        indexes = [row[0] for row in cur.fetchall()]
        
    required_indexes = [
        'idx_orders_date_status_amount',
        'idx_orders_date_status_id',
        'idx_order_items_product_order',
        'idx_orders_customer_status_date',
        'idx_inventory_product'
    ]
    
    for idx in required_indexes:
        assert idx in indexes, f"Required index {idx} not found. Found: {indexes}"


def test_index_on_orders_date(db_conn):
    """Index on orders(order_date, status) must exist for daily revenue queries."""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'orders'
            AND indexname = 'idx_orders_date_status_amount'
        """)
        assert cur.fetchone() is not None, "Index idx_orders_date_status_amount not found"


def test_index_on_order_items_product(db_conn):
    """Index on order_items(product_id, order_id) must exist for product queries."""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'order_items'
            AND indexname = 'idx_order_items_product_order'
        """)
        assert cur.fetchone() is not None, "Index idx_order_items_product_order not found"


def test_index_on_orders_customer(db_conn):
    """Index on orders(customer_id, status, order_date) must exist for customer queries."""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'orders'
            AND indexname = 'idx_orders_customer_status_date'
        """)
        assert cur.fetchone() is not None, "Index idx_orders_customer_status_date not found"


def test_index_on_inventory(db_conn):
    """Index on inventory(product_id) must exist for inventory queries."""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'inventory'
            AND indexname = 'idx_inventory_product'
        """)
        assert cur.fetchone() is not None, "Index idx_inventory_product not found"


def test_total_custom_indexes(db_conn):
    """Exactly 5 custom indexes should exist (within 2GB limit)."""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname LIKE 'idx_%'
        """)
        count = cur.fetchone()[0]
        assert count == 5, f"Expected 5 custom indexes, found {count}"
