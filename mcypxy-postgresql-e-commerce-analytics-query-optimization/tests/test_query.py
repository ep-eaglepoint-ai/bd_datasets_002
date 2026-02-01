import os
import time
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
    time.sleep(0.5)
    
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname="ecommerce_db",
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres")
    )
    
    print(f"\nLoading schema and data from {repo_path}...")
    
    with conn.cursor() as cur:
        with open(f"{repo_path}/schema.sql") as f:
            cur.execute(f.read())
        with open("repository_before/seed_test.sql") as f:
            cur.execute(f.read())
        cur.execute("SELECT pg_stat_reset()")
        conn.commit()
    
    print("Dataset loaded. Running tests...\n")
    
    yield conn
    conn.close()


def execute_query(conn, query):
    """Execute query and return results with timing."""
    with conn.cursor() as cur:
        start = time.time()
        cur.execute(query)
        results = cur.fetchall()
        elapsed = time.time() - start
        return results, elapsed


def get_query_plan(conn, query):
    """Get EXPLAIN output for a query."""
    with conn.cursor() as cur:
        cur.execute(f"EXPLAIN {query}")
        return cur.fetchall()


def test_daily_revenue_trend(db_conn):
    """Query 1: Daily revenue trend - must complete in under 2 seconds."""
    query = """
    SELECT 
        DATE(order_date) as day,
        SUM(total_amount) as revenue,
        COUNT(*) as order_count
    FROM orders
    WHERE order_date >= NOW() - INTERVAL '90 days'
      AND status != 'cancelled'
    GROUP BY DATE(order_date)
    ORDER BY day;
    """
    results, elapsed = execute_query(db_conn, query)
    print(f"Query took {elapsed:.3f}s")
    assert len(results) >= 0
    assert elapsed < 2.0, f"Query took {elapsed:.2f}s, expected <2s"


def test_top_products_by_category(db_conn):
    """Query 2: Top products by category - must complete in under 2 seconds."""
    query = """
    SELECT 
        c.name as category,
        p.name as product,
        sub.revenue
    FROM categories c
    CROSS JOIN LATERAL (
        SELECT 
            oi.product_id,
            SUM(oi.quantity * oi.unit_price) as revenue
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        JOIN products p ON p.product_id = oi.product_id
        WHERE p.category_id = c.category_id
          AND o.order_date >= NOW() - INTERVAL '30 days'
          AND o.status != 'cancelled'
        GROUP BY oi.product_id
        ORDER BY revenue DESC
        LIMIT 10
    ) sub
    JOIN products p ON p.product_id = sub.product_id
    ORDER BY c.name, sub.revenue DESC;
    """
    results, elapsed = execute_query(db_conn, query)
    print(f"Query took {elapsed:.3f}s")
    assert len(results) >= 0
    assert elapsed < 2.0, f"Query took {elapsed:.2f}s, expected <2s"


def test_customer_cohort_analysis(db_conn):
    """Query 3: Customer cohort analysis - must complete in under 2 seconds."""
    query = """
    SELECT 
        TO_CHAR(c.first_purchase_date, 'YYYY-MM') as cohort,
        EXTRACT(MONTH FROM AGE(o.order_date, c.first_purchase_date)) as months_since_first,
        COUNT(DISTINCT c.customer_id) as customers
    FROM customers c
    JOIN orders o ON o.customer_id = c.customer_id
    WHERE c.first_purchase_date >= NOW() - INTERVAL '13 months'
      AND o.status != 'cancelled'
    GROUP BY 
        TO_CHAR(c.first_purchase_date, 'YYYY-MM'),
        EXTRACT(MONTH FROM AGE(o.order_date, c.first_purchase_date))
    ORDER BY cohort, months_since_first;
    """
    results, elapsed = execute_query(db_conn, query)
    print(f"Query took {elapsed:.3f}s")
    assert len(results) >= 0
    assert elapsed < 2.0, f"Query took {elapsed:.2f}s, expected <2s"


def test_inventory_turnover(db_conn):
    """Query 4: Inventory turnover - must complete in under 2 seconds."""
    query = """
    SELECT 
        p.product_id,
        p.name,
        COALESCE(SUM(oi.quantity), 0) as units_sold,
        i.quantity as current_stock,
        CASE 
            WHEN i.quantity > 0 THEN ROUND(COALESCE(SUM(oi.quantity), 0)::numeric / i.quantity, 2)
            ELSE 0 
        END as turnover_rate
    FROM products p
    LEFT JOIN order_items oi ON oi.product_id = p.product_id
    LEFT JOIN orders o ON o.order_id = oi.order_id 
        AND o.order_date >= NOW() - INTERVAL '90 days'
        AND o.status != 'cancelled'
    LEFT JOIN inventory i ON i.product_id = p.product_id
    GROUP BY p.product_id, p.name, i.quantity
    ORDER BY turnover_rate DESC
    LIMIT 100;
    """
    results, elapsed = execute_query(db_conn, query)
    print(f"Query took {elapsed:.3f}s")
    assert len(results) >= 0
    assert elapsed < 2.0, f"Query took {elapsed:.2f}s, expected <2s"


def test_customer_lifetime_value(db_conn):
    """Query 5: Customer lifetime value - must complete in under 2 seconds."""
    query = """
    SELECT 
        customer_id,
        total_spent,
        order_count,
        NTILE(100) OVER (ORDER BY total_spent) as percentile
    FROM (
        SELECT 
            c.customer_id,
            SUM(o.total_amount) as total_spent,
            COUNT(o.order_id) as order_count
        FROM customers c
        JOIN orders o ON o.customer_id = c.customer_id
        WHERE o.status != 'cancelled'
        GROUP BY c.customer_id
    ) customer_totals
    ORDER BY percentile DESC, total_spent DESC;
    """
    results, elapsed = execute_query(db_conn, query)
    print(f"Query took {elapsed:.3f}s")
    assert len(results) >= 0
    assert elapsed < 2.0, f"Query took {elapsed:.2f}s, expected <2s"


def test_category_performance_comparison(db_conn):
    """Query 6: Category performance comparison - must complete in under 2 seconds."""
    query = """
    WITH monthly_revenue AS (
        SELECT 
            p.category_id,
            DATE_TRUNC('month', o.order_date) as month,
            SUM(oi.quantity * oi.unit_price) as revenue
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.order_id
        JOIN products p ON p.product_id = oi.product_id
        WHERE o.status != 'cancelled'
        GROUP BY p.category_id, DATE_TRUNC('month', o.order_date)
    )
    SELECT 
        c.name as category,
        curr.month,
        curr.revenue as current_revenue,
        prev.revenue as previous_revenue,
        ROUND(((curr.revenue - prev.revenue) / NULLIF(prev.revenue, 0)) * 100, 2) as growth_pct
    FROM monthly_revenue curr
    JOIN monthly_revenue prev ON prev.category_id = curr.category_id 
        AND prev.month = curr.month - INTERVAL '1 month'
    JOIN categories c ON c.category_id = curr.category_id
    WHERE curr.month >= NOW() - INTERVAL '12 months'
    ORDER BY c.name, curr.month;
    """
    results, elapsed = execute_query(db_conn, query)
    print(f"Query took {elapsed:.3f}s")
    assert len(results) >= 0
    assert elapsed < 2.0, f"Query took {elapsed:.2f}s, expected <2s"


def test_index_storage_budget(db_conn):
    """Validate total index size is under 2GB budget."""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT pg_size_pretty(SUM(pg_relation_size(indexrelid))::bigint) as total_size,
                   SUM(pg_relation_size(indexrelid))::bigint as total_bytes
            FROM pg_stat_user_indexes
        """)
        result = cur.fetchone()
        total_bytes = result[1]
        print(f"Total index size: {result[0]}")
        assert total_bytes <= 2 * 1024 * 1024 * 1024, f"Index storage {result[0]} exceeds 2GB budget"


def test_no_sequential_scans_on_large_tables(db_conn):
    """Ensure no sequential scans on tables with >1M rows."""
    queries = [
        ("Query 1", """SELECT DATE(order_date) as day, SUM(total_amount) as revenue, COUNT(*) as order_count
            FROM orders WHERE order_date >= NOW() - INTERVAL '90 days' AND status != 'cancelled'
            GROUP BY DATE(order_date) ORDER BY day"""),
        ("Query 5", """SELECT customer_id, total_spent, order_count, NTILE(100) OVER (ORDER BY total_spent) as percentile
            FROM (SELECT c.customer_id, SUM(o.total_amount) as total_spent, COUNT(o.order_id) as order_count
                  FROM customers c JOIN orders o ON o.customer_id = c.customer_id
                  WHERE o.status != 'cancelled' GROUP BY c.customer_id) customer_totals
            ORDER BY percentile DESC, total_spent DESC""")
    ]
    
    with db_conn.cursor() as cur:
        cur.execute("SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE n_live_tup > 1000000")
        large_tables = {row[0] for row in cur.fetchall()}
    
    for name, query in queries:
        plan = get_query_plan(db_conn, query)
        plan_text = ' '.join([str(row[0]) for row in plan]).lower()
        for table in large_tables:
            assert f"seq scan on {table}" not in plan_text, f"{name}: Sequential scan detected on large table '{table}'"


def test_work_mem_limit(db_conn):
    """Verify all queries respect 500MB work_mem limit using EXPLAIN ANALYZE."""
    with db_conn.cursor() as cur:
        cur.execute("SET work_mem = '500MB'")
        db_conn.commit()
    
    queries = [
        ("Query 1", """SELECT DATE(order_date) as day, SUM(total_amount) as revenue, COUNT(*) as order_count
            FROM orders WHERE order_date >= NOW() - INTERVAL '90 days' AND status != 'cancelled'
            GROUP BY DATE(order_date) ORDER BY day"""),
        ("Query 5", """SELECT customer_id, total_spent, order_count, NTILE(100) OVER (ORDER BY total_spent) as percentile
            FROM (SELECT c.customer_id, SUM(o.total_amount) as total_spent, COUNT(o.order_id) as order_count
                  FROM customers c JOIN orders o ON o.customer_id = c.customer_id
                  WHERE o.status != 'cancelled' GROUP BY c.customer_id) customer_totals
            ORDER BY percentile DESC, total_spent DESC"""),
        ("Query 6", """WITH monthly_revenue AS (
            SELECT p.category_id, DATE_TRUNC('month', o.order_date) as month, SUM(oi.quantity * oi.unit_price) as revenue
            FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id
            WHERE o.status != 'cancelled' GROUP BY p.category_id, DATE_TRUNC('month', o.order_date))
            SELECT c.name as category, curr.month, curr.revenue as current_revenue, prev.revenue as previous_revenue,
            ROUND(((curr.revenue - prev.revenue) / NULLIF(prev.revenue, 0)) * 100, 2) as growth_pct
            FROM monthly_revenue curr JOIN monthly_revenue prev ON prev.category_id = curr.category_id 
            AND prev.month = curr.month - INTERVAL '1 month' JOIN categories c ON c.category_id = curr.category_id
            WHERE curr.month >= NOW() - INTERVAL '12 months' ORDER BY c.name, curr.month""")
    ]
    
    for name, query in queries:
        with db_conn.cursor() as cur:
            cur.execute(f"EXPLAIN (ANALYZE, BUFFERS) {query}")
            plan = '\n'.join([row[0] for row in cur.fetchall()])
            assert 'temp written' not in plan.lower(), f"{name} exceeded work_mem and wrote to disk"


def test_no_extensions_or_advanced_features(db_conn):
    """Verify only standard PostgreSQL 15 features are used - no extensions, materialized views, or partitioning."""
    with db_conn.cursor() as cur:
        # Check no extensions are installed (beyond defaults)
        cur.execute("SELECT extname FROM pg_extension WHERE extname NOT IN ('plpgsql')")
        extensions = cur.fetchall()
        assert len(extensions) == 0, f"Unexpected extensions found: {extensions}"
        
        # Check no materialized views
        cur.execute("SELECT matviewname FROM pg_matviews")
        matviews = cur.fetchall()
        assert len(matviews) == 0, f"Materialized views found: {matviews}"
        
        # Check no partitioned tables
        cur.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN (
                SELECT tablename FROM pg_partitioned_table pt 
                JOIN pg_class c ON pt.partrelid = c.oid
            )
        """)
        partitioned = cur.fetchall()
        assert len(partitioned) == 0, f"Partitioned tables found: {partitioned}"


def test_required_indexes_exist(db_conn):
    """Verify all required indexes exist for optimal query performance."""
    required_indexes = [
        'idx_orders_date_status',
        'idx_order_items_order',
        'idx_order_items_product',
        'idx_products_category',
        'idx_orders_customer',
        'idx_inventory_product',
        'idx_customers_first_purchase'
    ]
    
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename IN ('orders', 'order_items', 'products', 'inventory', 'customers')
        """)
        existing_indexes = {row[0] for row in cur.fetchall()}
    
    missing_indexes = [idx for idx in required_indexes if idx not in existing_indexes]
    
    assert len(missing_indexes) == 0, (
        f"Missing required indexes: {missing_indexes}. "
        f"These indexes are necessary for queries to complete in <2s. "
        f"Found indexes: {sorted(existing_indexes)}"
    )


def test_orders_date_index_exists(db_conn):
    """Verify idx_orders_date_status index exists for daily revenue queries."""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE schemaname = 'public' AND indexname = 'idx_orders_date_status'
        """)
        result = cur.fetchone()
    
    assert result is not None, (
        "Missing idx_orders_date_status index. "
        "This index is required for Query 1 (Daily Revenue) to avoid sequential scans on 50M orders."
    )


def test_order_items_indexes_exist(db_conn):
    """Verify order_items indexes exist for product and order lookups."""
    required = ['idx_order_items_order', 'idx_order_items_product']
    
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename = 'order_items'
        """)
        existing = {row[0] for row in cur.fetchall()}
    
    missing = [idx for idx in required if idx not in existing]
    
    assert len(missing) == 0, (
        f"Missing order_items indexes: {missing}. "
        f"These indexes are required for Queries 2, 4, and 6 to perform efficient joins."
    )


def test_customer_indexes_exist(db_conn):
    """Verify customer-related indexes exist for cohort and LTV queries."""
    required = ['idx_orders_customer', 'idx_customers_first_purchase']
    
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND (tablename = 'orders' AND indexname = 'idx_orders_customer'
                 OR tablename = 'customers' AND indexname = 'idx_customers_first_purchase')
        """)
        existing = {row[0] for row in cur.fetchall()}
    
    missing = [idx for idx in required if idx not in existing]
    
    assert len(missing) == 0, (
        f"Missing customer indexes: {missing}. "
        f"These indexes are required for Queries 3 (Cohort) and 5 (LTV) to avoid full table scans."
    )
