import pytest
import uuid
from datetime import datetime

def generate_request_id():
    return str(uuid.uuid4())

class TestPaymentProcessing:
    
    def test_payment_success(self, db_cursor):
        """Test successful payment processing."""
        # Setup order
        db_cursor.execute("INSERT INTO orders (total_amount, status) VALUES (100.00, 'pending') RETURNING id")
        order_id = db_cursor.fetchone()[0]
        
        request_id = generate_request_id()
        timestamp = datetime.now()
        
        # Call function
        db_cursor.execute(
            "SELECT * FROM process_payment(%s, %s, %s, %s, %s)",
            (order_id, 100.00, 'credit_card', timestamp, request_id)
        )
        result = db_cursor.fetchone()
        
        assert result is not None
        assert result[0] == 'OK'
        
        # Verify DB state
        db_cursor.execute("SELECT status FROM orders WHERE id = %s", (order_id,))
        assert db_cursor.fetchone()[0] == 'paid'
        
        db_cursor.execute("SELECT count(*) FROM payments WHERE order_id = %s", (order_id,))
        assert db_cursor.fetchone()[0] == 1
        
        db_cursor.execute("SELECT count(*) FROM payment_audit_log WHERE order_id = %s", (order_id,))
        assert db_cursor.fetchone()[0] == 1

    def test_order_not_found(self, db_cursor):
        """Test payment for non-existent order."""
        request_id = generate_request_id()
        timestamp = datetime.now()
        
        db_cursor.execute(
            "SELECT * FROM process_payment(%s, %s, %s, %s, %s)",
            (99999, 100.00, 'credit_card', timestamp, request_id)
        )
        result = db_cursor.fetchone()
        
        assert result[0] == 'ORDER_NOT_FOUND'
        assert 'Order not found' in result[1]

    def test_order_already_paid(self, db_cursor):
        """Test payment for already paid order."""
        db_cursor.execute("INSERT INTO orders (total_amount, status) VALUES (100.00, 'paid') RETURNING id")
        order_id = db_cursor.fetchone()[0]
        
        request_id = generate_request_id()
        timestamp = datetime.now()
        
        db_cursor.execute(
            "SELECT * FROM process_payment(%s, %s, %s, %s, %s)",
            (order_id, 100.00, 'credit_card', timestamp, request_id)
        )
        result = db_cursor.fetchone()
        
        assert result[0] == 'ORDER_NOT_PENDING'
        assert 'Order is not pending' in result[1]

    def test_payment_amount_mismatch(self, db_cursor):
        """Test payment amount mismatch."""
        db_cursor.execute("INSERT INTO orders (total_amount, status) VALUES (100.00, 'pending') RETURNING id")
        order_id = db_cursor.fetchone()[0]
        
        request_id = generate_request_id()
        timestamp = datetime.now()
        
        db_cursor.execute(
            "SELECT * FROM process_payment(%s, %s, %s, %s, %s)",
            (order_id, 50.00, 'credit_card', timestamp, request_id)
        )
        result = db_cursor.fetchone()
        
        assert result[0] == 'PAYMENT_AMOUNT_MISMATCH'
        assert 'Payment amount mismatch' in result[1]

    def test_idempotency_duplicate_request(self, db_cursor):
        """Test idempotency with duplicate request ID."""
        db_cursor.execute("INSERT INTO orders (total_amount, status) VALUES (100.00, 'pending') RETURNING id")
        order_id = db_cursor.fetchone()[0]
        
        request_id = generate_request_id()
        timestamp = datetime.now()
        
        # First call
        db_cursor.execute(
            "SELECT * FROM process_payment(%s, %s, %s, %s, %s)",
            (order_id, 100.00, 'credit_card', timestamp, request_id)
        )
        result1 = db_cursor.fetchone()
        assert result1[0] == 'OK'
        
        # Second call (same request_id)
        db_cursor.execute(
            "SELECT * FROM process_payment(%s, %s, %s, %s, %s)",
            (order_id, 100.00, 'credit_card', timestamp, request_id)
        )
        result2 = db_cursor.fetchone()
        
        # Should be success but message indicates existing
        assert result2[0] == 'OK'
        assert 'Payment already processed' in result2[1]
        
        # Ensure only one payment record
        db_cursor.execute("SELECT count(*) FROM payments WHERE request_id = %s", (request_id,))
        assert db_cursor.fetchone()[0] == 1

    def test_order_cancelled(self, db_cursor):
        """Test payment for cancelled order."""
        db_cursor.execute("INSERT INTO orders (total_amount, status) VALUES (100.00, 'cancelled') RETURNING id")
        order_id = db_cursor.fetchone()[0]
        
        request_id = generate_request_id()
        timestamp = datetime.now()
        
        db_cursor.execute(
            "SELECT * FROM process_payment(%s, %s, %s, %s, %s)",
            (order_id, 100.00, 'credit_card', timestamp, request_id)
        )
        result = db_cursor.fetchone()
        
        assert result[0] == 'ORDER_NOT_PENDING'
        # assert 'Order not pending' or similar. 

    def test_negative_amount(self, db_cursor):
        """Test payment with negative amount."""
        db_cursor.execute("INSERT INTO orders (total_amount, status) VALUES (100.00, 'pending') RETURNING id")
        order_id = db_cursor.fetchone()[0]
        
        request_id = generate_request_id()
        timestamp = datetime.now()
        
        db_cursor.execute(
            "SELECT * FROM process_payment(%s, %s, %s, %s, %s)",
            (order_id, -50.00, 'credit_card', timestamp, request_id)
        )
        result = db_cursor.fetchone()
        
        assert result[0] == 'PAYMENT_AMOUNT_MISMATCH'

    def test_payment_success(self, db_cursor):
        """Test successful payment processing."""
        db_cursor.execute("INSERT INTO orders (total_amount, status) VALUES (100.00, 'pending') RETURNING id")
        order_id = db_cursor.fetchone()[0]
        
        request_id = generate_request_id()
        timestamp = datetime.now()
        
        db_cursor.execute(
            "SELECT * FROM process_payment(%s, %s, %s, %s, %s)",
            (order_id, 100.00, 'credit_card', timestamp, request_id)
        )
        result = db_cursor.fetchone()
        
        assert result[0] == 'OK'
        assert result[1] == 'Payment processed successfully'
        
        # Ensure payment record was created
        db_cursor.execute("SELECT * FROM payments WHERE order_id = %s", (order_id,))
        payment = db_cursor.fetchone()
        assert payment is not None
        
        # Ensure order status was updated
        db_cursor.execute("SELECT status FROM orders WHERE id = %s", (order_id,))
        order = db_cursor.fetchone()
        assert order[0] == 'paid'
        
        # Ensure payment audit log was created
        db_cursor.execute("SELECT * FROM payment_audit_log WHERE order_id = %s", (order_id,))
        audit_log = db_cursor.fetchone()
        assert audit_log is not None
        
