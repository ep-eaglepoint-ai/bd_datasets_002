import pytest
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_READ_COMMITTED
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed


@pytest.fixture(scope="session")
def db_connection():
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "testdb"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres")
    )
    conn.set_isolation_level(ISOLATION_LEVEL_READ_COMMITTED)
    yield conn
    conn.close()


@pytest.fixture(scope="function")
def setup_schema(db_connection):
    cursor = db_connection.cursor()
    
    cursor.execute("DROP TABLE IF EXISTS order_items CASCADE")
    cursor.execute("DROP TABLE IF EXISTS inventory CASCADE")
    cursor.execute("DROP FUNCTION IF EXISTS allocate_inventory(BIGINT, BIGINT)")
    
    cursor.execute("""
        CREATE TABLE inventory (
            product_id BIGINT NOT NULL,
            warehouse_id BIGINT NOT NULL,
            stock_quantity INT NOT NULL,
            PRIMARY KEY (product_id, warehouse_id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE order_items (
            order_id BIGINT NOT NULL,
            product_id BIGINT NOT NULL,
            quantity INT NOT NULL,
            PRIMARY KEY (order_id, product_id)
        )
    """)
    
    db_connection.commit()
    
    yield cursor
    
    db_connection.rollback()


def get_implementation():
    """Determine which implementation to test based on PYTHONPATH"""
    pythonpath = os.getenv('PYTHONPATH', '')
    if 'repository_before' in pythonpath:
        return 'repository_before/allocate_inventory.sql'
    else:
        return 'repository_after/allocate_inventory.sql'


def is_before_implementation():
    """Check if testing repository_before"""
    pythonpath = os.getenv('PYTHONPATH', '')
    return 'repository_before' in pythonpath


@pytest.fixture
def load_function(setup_schema, db_connection):
    cursor = setup_schema
    sql_file = get_implementation()
    
    with open(sql_file, 'r') as f:
        sql = f.read()
    
    cursor.execute(sql)
    db_connection.commit()
    
    return cursor


def test_requirement_1_reduce_queries(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 50), (2, 100, 30), (3, 100, 20)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 10), (1, 2, 5), (1, 3, 8)")
    db_connection.commit()
    
    cursor.execute("SELECT pg_stat_reset()")
    db_connection.commit()
    
    cursor.execute("SELECT allocate_inventory(1, 100)")
    result = cursor.fetchone()[0]
    db_connection.commit()
    
    cursor.execute("""
        SELECT calls 
        FROM pg_stat_user_functions 
        WHERE funcname = 'allocate_inventory'
    """)
    func_calls = cursor.fetchone()
    
    assert result == True


def test_requirement_2_avoid_per_item_select_update(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 100), (2, 100, 100), (3, 100, 100)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 10), (1, 2, 20), (1, 3, 30)")
    db_connection.commit()
    
    cursor.execute("SELECT allocate_inventory(1, 100)")
    result = cursor.fetchone()[0]
    db_connection.commit()
    
    assert result == True
    
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 1 AND warehouse_id = 100")
    assert cursor.fetchone()[0] == 90
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 2 AND warehouse_id = 100")
    assert cursor.fetchone()[0] == 80
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 3 AND warehouse_id = 100")
    assert cursor.fetchone()[0] == 70


def test_requirement_3_all_or_nothing_allocation(load_function, db_connection):
    """Requirement #3: Ensure inventory is updated only if all items are available
    
    BEFORE: FAILS - Updates first item before checking second item, causing partial update
    AFTER: PASSES - Validates all items first, then updates atomically
    """
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 50), (2, 100, 10), (3, 100, 20)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 10), (1, 2, 15), (1, 3, 5)")
    db_connection.commit()
    
    cursor.execute("SELECT allocate_inventory(1, 100)")
    result = cursor.fetchone()[0]
    db_connection.commit()
    
    assert result == False
    
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 1 AND warehouse_id = 100")
    stock_1 = cursor.fetchone()[0]
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 2 AND warehouse_id = 100")
    stock_2 = cursor.fetchone()[0]
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 3 AND warehouse_id = 100")
    stock_3 = cursor.fetchone()[0]
    
    if is_before_implementation():
        # BEFORE implementation does partial update (updates item 1 before failing on item 2)
        assert stock_1 == 40, "BEFORE should have partially updated product 1"
        assert stock_2 == 10
        assert stock_3 == 20
        pytest.fail("BEFORE implementation allows partial updates - REQUIREMENT #3 VIOLATED")
    else:
        # AFTER implementation prevents partial updates
        assert stock_1 == 50, "AFTER should not update any inventory when allocation fails"
        assert stock_2 == 10
        assert stock_3 == 20


def test_requirement_4_minimize_lock_duration(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 100), (2, 100, 100)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 10), (1, 2, 10)")
    db_connection.commit()
    
    start_time = time.time()
    cursor.execute("SELECT allocate_inventory(1, 100)")
    result = cursor.fetchone()[0]
    end_time = time.time()
    db_connection.commit()
    
    assert result == True
    assert (end_time - start_time) < 1.0


def test_requirement_5_prevent_partial_updates(load_function, db_connection):
    """Requirement #5: Prevent partial inventory updates
    
    BEFORE: FAILS - Updates product 1 before discovering product 2 is insufficient
    AFTER: PASSES - Checks all products first, prevents any updates on failure
    """
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 50), (2, 100, 5)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 10), (1, 2, 10)")
    db_connection.commit()
    
    cursor.execute("SELECT allocate_inventory(1, 100)")
    result = cursor.fetchone()[0]
    db_connection.commit()
    
    assert result == False
    
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 1 AND warehouse_id = 100")
    stock_1 = cursor.fetchone()[0]
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 2 AND warehouse_id = 100")
    stock_2 = cursor.fetchone()[0]
    
    if is_before_implementation():
        # BEFORE allows partial update
        assert stock_1 == 40, "BEFORE partially updated product 1"
        assert stock_2 == 5
        pytest.fail("BEFORE implementation allows partial updates - REQUIREMENT #5 VIOLATED")
    else:
        # AFTER prevents partial updates
        assert stock_1 == 50
        assert stock_2 == 5


def test_requirement_6_preserve_exact_behavior(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 100)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 50)")
    db_connection.commit()
    
    cursor.execute("SELECT allocate_inventory(1, 100)")
    result = cursor.fetchone()[0]
    db_connection.commit()
    
    assert result == True
    
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 1 AND warehouse_id = 100")
    assert cursor.fetchone()[0] == 50


def test_requirement_7_large_order_performance(load_function, db_connection):
    cursor = load_function
    
    for i in range(1, 101):
        cursor.execute(f"INSERT INTO inventory VALUES ({i}, 100, 1000)")
        cursor.execute(f"INSERT INTO order_items VALUES (1, {i}, 10)")
    db_connection.commit()
    
    start_time = time.time()
    cursor.execute("SELECT allocate_inventory(1, 100)")
    result = cursor.fetchone()[0]
    end_time = time.time()
    db_connection.commit()
    
    assert result == True
    assert (end_time - start_time) < 2.0


def test_requirement_8_clear_business_logic(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 10)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 5)")
    db_connection.commit()
    
    cursor.execute("SELECT allocate_inventory(1, 100)")
    result = cursor.fetchone()[0]
    db_connection.commit()
    
    assert result == True
    
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 1 AND warehouse_id = 100")
    assert cursor.fetchone()[0] == 5


def test_requirement_9_no_unnecessary_notices(load_function, db_connection):
    """Requirement #9: Remove unnecessary notices
    
    BEFORE: FAILS - Contains RAISE NOTICE statement
    AFTER: PASSES - No RAISE NOTICE statement
    """
    cursor = load_function
    
    # Check the function source code for RAISE NOTICE
    cursor.execute("""
        SELECT pg_get_functiondef(oid)
        FROM pg_proc
        WHERE proname = 'allocate_inventory'
    """)
    function_def = cursor.fetchone()[0]
    
    if is_before_implementation():
        # BEFORE has RAISE NOTICE
        assert 'RAISE NOTICE' in function_def, "BEFORE should contain RAISE NOTICE"
        pytest.fail("BEFORE implementation contains RAISE NOTICE - REQUIREMENT #9 VIOLATED")
    else:
        # AFTER should not have RAISE NOTICE
        assert 'RAISE NOTICE' not in function_def, "AFTER should not contain RAISE NOTICE"


def test_requirement_10_concurrent_consistency(load_function, db_connection):
    """Requirement #10: Ensure consistent results under concurrency
    
    Tests that concurrent allocations are properly serialized and only one succeeds
    when there's insufficient inventory for both.
    """
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 100)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 60), (2, 1, 60)")
    db_connection.commit()
    
    def allocate_order(order_id):
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "testdb"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "postgres")
        )
        conn.set_isolation_level(ISOLATION_LEVEL_READ_COMMITTED)
        cur = conn.cursor()
        cur.execute(f"SELECT allocate_inventory({order_id}, 100)")
        result = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return result
    
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(allocate_order, 1), executor.submit(allocate_order, 2)]
        results = [f.result() for f in as_completed(futures)]
    
    success_count = sum(1 for r in results if r)
    
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 1 AND warehouse_id = 100")
    final_stock = cursor.fetchone()[0]
    
    # Either one allocation succeeded (stock=40) or both failed (stock=100)
    # Both implementations should prevent double allocation
    assert success_count <= 1, "At most one allocation should succeed"
    if success_count == 1:
        assert final_stock == 40, "If one succeeded, stock should be 40"
    else:
        assert final_stock == 100, "If both failed, stock should remain 100"


def test_requirement_11_function_signature_unchanged(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("""
        SELECT p.proname, p.prorettype::regtype, 
               array_agg(p.proargtypes[i]::regtype::text ORDER BY i) as arg_types
        FROM pg_proc p, generate_series(0, array_length(p.proargtypes, 1) - 1) i
        WHERE p.proname = 'allocate_inventory'
        GROUP BY p.proname, p.prorettype
    """)
    result = cursor.fetchone()
    
    assert result[0] == 'allocate_inventory'
    assert result[1] == 'boolean'
    assert result[2] == ['bigint', 'bigint']


def test_requirement_12_no_schema_changes(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)
    tables = [row[0] for row in cursor.fetchall()]
    
    assert set(tables) == {'inventory', 'order_items'}


def test_requirement_13_no_temporary_tables(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 50)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 10)")
    db_connection.commit()
    
    cursor.execute("SELECT allocate_inventory(1, 100)")
    db_connection.commit()
    
    cursor.execute("""
        SELECT COUNT(*) 
        FROM pg_tables 
        WHERE schemaname = 'pg_temp'
    """)
    temp_table_count = cursor.fetchone()[0]
    
    assert temp_table_count == 0


def test_requirement_14_plpgsql_language(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("""
        SELECT l.lanname
        FROM pg_proc p
        JOIN pg_language l ON p.prolang = l.oid
        WHERE p.proname = 'allocate_inventory'
    """)
    language = cursor.fetchone()[0]
    
    assert language == 'plpgsql'


def test_requirement_15_high_concurrency_safety(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 500)")
    for i in range(1, 11):
        cursor.execute(f"INSERT INTO order_items VALUES ({i}, 1, 50)")
    db_connection.commit()
    
    def allocate_order(order_id):
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "testdb"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "postgres")
        )
        conn.set_isolation_level(ISOLATION_LEVEL_READ_COMMITTED)
        cur = conn.cursor()
        cur.execute(f"SELECT allocate_inventory({order_id}, 100)")
        result = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return result
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(allocate_order, i) for i in range(1, 11)]
        results = [f.result() for f in as_completed(futures)]
    
    success_count = sum(1 for r in results if r)
    assert success_count == 10
    
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 1 AND warehouse_id = 100")
    final_stock = cursor.fetchone()[0]
    assert final_stock == 0


def test_requirement_16_production_safe(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 100), (2, 100, 100)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 50), (1, 2, 50)")
    db_connection.commit()
    
    cursor.execute("SELECT allocate_inventory(1, 100)")
    result = cursor.fetchone()[0]
    db_connection.commit()
    
    assert result == True
    
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 1 AND warehouse_id = 100")
    assert cursor.fetchone()[0] == 50
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 2 AND warehouse_id = 100")
    assert cursor.fetchone()[0] == 50


def test_missing_inventory_record(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 50)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 10), (1, 2, 5)")
    db_connection.commit()
    
    cursor.execute("SELECT allocate_inventory(1, 100)")
    result = cursor.fetchone()[0]
    db_connection.commit()
    
    assert result == False
    
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 1 AND warehouse_id = 100")
    assert cursor.fetchone()[0] == 50


def test_empty_order(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 50)")
    db_connection.commit()
    
    cursor.execute("SELECT allocate_inventory(999, 100)")
    result = cursor.fetchone()[0]
    db_connection.commit()
    
    assert result == True


def test_exact_stock_match(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 50)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 50)")
    db_connection.commit()
    
    cursor.execute("SELECT allocate_inventory(1, 100)")
    result = cursor.fetchone()[0]
    db_connection.commit()
    
    assert result == True
    
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 1 AND warehouse_id = 100")
    assert cursor.fetchone()[0] == 0


def test_zero_quantity_order(load_function, db_connection):
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 50)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 0)")
    db_connection.commit()
    
    cursor.execute("SELECT allocate_inventory(1, 100)")
    result = cursor.fetchone()[0]
    db_connection.commit()
    
    assert result == True
    
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 1 AND warehouse_id = 100")
    assert cursor.fetchone()[0] == 50


def test_multi_product_concurrent_partial_update_prevention(load_function, db_connection):
    """Test that concurrent transactions cannot cause partial updates on multi-product orders
    
    Scenario: Order 1 has products A+B. Concurrent transaction modifies product B's inventory
    between validation and update, causing product A to update but product B to fail.
    
    BEFORE: FAILS - Partial update occurs (product A updated, B not updated)
    AFTER: PASSES - Row-level locking prevents partial updates
    """
    cursor = load_function
    
    cursor.execute("INSERT INTO inventory VALUES (1, 100, 100), (2, 100, 100)")
    cursor.execute("INSERT INTO order_items VALUES (1, 1, 50), (1, 2, 50)")
    cursor.execute("INSERT INTO order_items VALUES (2, 2, 80)")
    db_connection.commit()
    
    import threading
    results = {'order1': None, 'order2': None, 'error': None}
    
    def allocate_order_1():
        try:
            conn = psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432"),
                database=os.getenv("DB_NAME", "testdb"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres")
            )
            conn.set_isolation_level(ISOLATION_LEVEL_READ_COMMITTED)
            cur = conn.cursor()
            
            cur.execute("SELECT allocate_inventory(1, 100)")
            results['order1'] = cur.fetchone()[0]
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            results['error'] = str(e)
    
    def allocate_order_2():
        try:
            conn = psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432"),
                database=os.getenv("DB_NAME", "testdb"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres")
            )
            conn.set_isolation_level(ISOLATION_LEVEL_READ_COMMITTED)
            cur = conn.cursor()
            
            time.sleep(0.05)
            
            cur.execute("SELECT allocate_inventory(2, 100)")
            results['order2'] = cur.fetchone()[0]
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            if not results['error']:
                results['error'] = str(e)
    
    t1 = threading.Thread(target=allocate_order_1)
    t2 = threading.Thread(target=allocate_order_2)
    
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 1 AND warehouse_id = 100")
    stock_a = cursor.fetchone()[0]
    cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = 2 AND warehouse_id = 100")
    stock_b = cursor.fetchone()[0]
    
    if is_before_implementation():
        if stock_a == 50 and stock_b != 50:
            pytest.fail("BEFORE implementation allowed partial update - product A updated but product B inconsistent")
    else:
        assert not (stock_a == 50 and stock_b == 100), "Partial update detected - product A updated but product B not updated"
        
        if stock_a == 50:
            assert stock_b == 50 or stock_b == 20, "If product A updated for order 1, product B must also be updated"
        if stock_b == 50:
            assert stock_a == 50, "If product B updated for order 1, product A must also be updated"
