"""
Test suite for Inventory Reservation PL/pgSQL function
"""
import os
import pytest
import psycopg2
from datetime import datetime, timedelta
import uuid

class TestInventoryReservation:
    
    @pytest.fixture
    def db_connection(self):
        """Connect to test database and create it if it doesn't exist."""
        admin_conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "postgres"),
            database="postgres",
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", "postgres"),
            port=int(os.getenv("POSTGRES_PORT", "5432"))
        )
        admin_conn.autocommit = True
        cursor = admin_conn.cursor()
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'test_inventory'")
        if not cursor.fetchone():
            cursor.execute("CREATE DATABASE test_inventory")
        cursor.close()
        admin_conn.close()
        
        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "postgres"),
            database="test_inventory",
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", "postgres"),
            port=int(os.getenv("POSTGRES_PORT", "5432"))
        )
        conn.autocommit = False
        yield conn
        conn.rollback()
        conn.close()
    
    @pytest.fixture
    def cursor(self, db_connection):
        cursor = db_connection.cursor()
        yield cursor
        cursor.close()
    
    @pytest.fixture(autouse=True)
    def setup_database(self, cursor):
        """Setup and reset test database."""
        cursor.execute("DROP TABLE IF EXISTS reservation_logs CASCADE")
        cursor.execute("DROP TABLE IF EXISTS inventory_reservations CASCADE")
        cursor.execute("DROP TABLE IF EXISTS products CASCADE")
   
        cursor.execute("""
            CREATE TABLE products (
                product_id UUID PRIMARY KEY,
                active BOOLEAN DEFAULT TRUE,
                available_quantity INTEGER DEFAULT 0
            )
        """)
        cursor.execute("""
            CREATE TABLE inventory_reservations (
                reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES products(product_id),
                reservation_quantity INTEGER NOT NULL,
                expiration_timestamp TIMESTAMP NOT NULL,
                request_identifier VARCHAR(255) UNIQUE NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE reservation_logs (
                log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                reservation_id UUID REFERENCES inventory_reservations(reservation_id),
                product_id UUID NOT NULL,
                action VARCHAR(100) NOT NULL
            )
        """)
        sql_file = "/app/repository_after/inventory_reservation.sql"
        if os.path.exists(sql_file):
            with open(sql_file, 'r') as f:
                cursor.execute(f.read())

        test_products = [
            ('11111111-1111-1111-1111-111111111111', True, 100),
            ('22222222-2222-2222-2222-222222222222', True, 50),
            ('33333333-3333-3333-3333-333333333333', False, 200),
            ('44444444-4444-4444-4444-444444444444', True, 0),
        ]
        for product_id, active, qty in test_products:
            cursor.execute(
                "INSERT INTO products (product_id, active, available_quantity) VALUES (%s, %s, %s)",
                (product_id, active, qty)
            )
        cursor.connection.commit()

    # ================= TEST CASES =================

    def test_successful_reservation(self, cursor):
        """Test successful reservation and inventory update."""
        product_id = '11111111-1111-1111-1111-111111111111'
        request_id = str(uuid.uuid4())
        expiration = datetime.now() + timedelta(hours=1)

        cursor.execute("SELECT * FROM reserve_inventory(%s, 10, %s, %s)",
                       (product_id, expiration, request_id))
        result = cursor.fetchone()
        assert result[3] == 'SUCCESS'
        
        # Check inventory updated
        cursor.execute("SELECT available_quantity FROM products WHERE product_id = %s", (product_id,))
        assert cursor.fetchone()[0] == 90

    def test_insufficient_stock(self, cursor):
        """Test reservation fails with insufficient stock."""
        product_id = '11111111-1111-1111-1111-111111111111'
        request_id = str(uuid.uuid4())
        expiration = datetime.now() + timedelta(hours=1)
        cursor.execute("SELECT * FROM reserve_inventory(%s, 1000, %s, %s)",
                       (product_id, expiration, request_id))
        assert cursor.fetchone()[3] == 'INSUFFICIENT_STOCK'

    def test_duplicate_request(self, cursor):
        """Test prevention of duplicate reservations."""
        product_id = '11111111-1111-1111-1111-111111111111'
        request_id = 'dup_test_001'
        expiration = datetime.now() + timedelta(hours=1)

        cursor.execute("SELECT * FROM reserve_inventory(%s, 10, %s, %s)",
                       (product_id, expiration, request_id))
        assert cursor.fetchone()[3] == 'SUCCESS'

        cursor.execute("SELECT * FROM reserve_inventory(%s, 5, %s, %s)",
                       (product_id, expiration, request_id))
        assert cursor.fetchone()[3] == 'DUPLICATE_REQUEST'

    def test_invalid_product(self, cursor):
        """Test invalid or inactive products."""
        # Non-existent
        cursor.execute("SELECT * FROM reserve_inventory(%s, 10, %s, %s)",
                       (str(uuid.uuid4()), datetime.now() + timedelta(hours=1), 'test_invalid_001'))
        assert cursor.fetchone()[3] == 'PRODUCT_NOT_FOUND'

        # Inactive
        cursor.execute("SELECT * FROM reserve_inventory(%s, 10, %s, %s)",
                       ('33333333-3333-3333-3333-333333333333', datetime.now() + timedelta(hours=1), 'test_invalid_002'))
        assert cursor.fetchone()[3] == 'PRODUCT_INACTIVE'

    def test_invalid_quantity_and_expiration(self, cursor):
        """Test invalid quantity and past expiration."""
        pid = '11111111-1111-1111-1111-111111111111'

        # Invalid quantity
        cursor.execute("SELECT * FROM reserve_inventory(%s, 0, %s, %s)",
                       (pid, datetime.now() + timedelta(hours=1), 'test_invalid_qty'))
        assert cursor.fetchone()[3] == 'INVALID_QUANTITY'

        # Past expiration
        cursor.execute("SELECT * FROM reserve_inventory(%s, 10, %s, %s)",
                       (pid, datetime.now() - timedelta(hours=1), 'test_invalid_exp'))
        assert cursor.fetchone()[3] == 'INVALID_EXPIRATION'

    def test_logging(self, cursor):
        """Test reservation logs are created."""
        pid = '11111111-1111-1111-1111-111111111111'
        req_id = str(uuid.uuid4())
        exp = datetime.now() + timedelta(hours=1)

        cursor.execute("SELECT * FROM reserve_inventory(%s, 10, %s, %s)", (pid, exp, req_id))
        res_id = cursor.fetchone()[1]

        cursor.execute("SELECT COUNT(*) FROM reservation_logs WHERE reservation_id = %s", (res_id,))
        assert cursor.fetchone()[0] > 0

    def test_zero_quantity_product(self, cursor):
        """Test reservation for product with zero stock."""
        pid = '44444444-4444-4444-4444-444444444444'
        req_id = str(uuid.uuid4())
        exp = datetime.now() + timedelta(hours=1)
        cursor.execute("SELECT * FROM reserve_inventory(%s, 1, %s, %s)", (pid, exp, req_id))
        assert cursor.fetchone()[3] == 'INSUFFICIENT_STOCK'
