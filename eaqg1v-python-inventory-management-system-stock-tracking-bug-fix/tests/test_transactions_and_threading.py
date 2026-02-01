import threading
import time
from datetime import datetime
from decimal import Decimal
from inventory import Inventory
from models import Product


def test_transaction_objects_new_instances():
    """Log two transactions, modify first returned transaction - second transaction in history must be unchanged."""
    inv = Inventory()
    product = Product(sku="TEST-001", name="Test Product", price=Decimal("10.00"))
    inv.add_product(product, initial_quantity=10)
    
    inv.add_stock("TEST-001", 5)
    inv.remove_stock("TEST-001", 3)
    
    history = inv.transaction_log.get_history()
    assert len(history) >= 2
    
    first_transaction = history[0]
    first_transaction.sku = "MODIFIED"
    first_transaction.quantity_change = 999
    
    history_after = inv.transaction_log.get_history()
    second_transaction = history_after[1]
    
    assert second_transaction.sku != "MODIFIED"
    assert second_transaction.quantity_change != 999


def test_transaction_timestamp_at_creation():
    """Create transaction, wait 1 second, add to log - timestamp must reflect creation time, not logging time."""
    inv = Inventory()
    product = Product(sku="TEST-010", name="Test Product", price=Decimal("10.00"))
    inv.add_product(product, initial_quantity=10)
    
    before_time = datetime.now()
    time.sleep(0.1)
    inv.add_stock("TEST-010", 5)
    after_time = datetime.now()
    
    history = inv.transaction_log.get_history()
    transaction = history[-1]
    
    assert transaction.timestamp is not None
    assert before_time <= transaction.timestamp <= after_time


def test_thread_locking_concurrent_add_stock():
    """Run 100 concurrent add_stock(1) operations - final stock must be exactly initial + 100."""
    inv = Inventory()
    product = Product(sku="TEST-020", name="Test Product", price=Decimal("10.00"))
    initial_quantity = 50
    inv.add_product(product, initial_quantity=initial_quantity)
    
    num_threads = 100
    threads = []
    
    def add_one():
        inv.add_stock("TEST-020", 1)
    
    for _ in range(num_threads):
        thread = threading.Thread(target=add_one)
        threads.append(thread)
        thread.start()
    
    for thread in threads:
        thread.join()
    
    final_stock = inv.get_stock("TEST-020")
    assert final_stock == initial_quantity + num_threads


def test_bulk_remove_atomic_all_or_none():
    """bulk_remove with one invalid SKU must leave all stock unchanged."""
    inv = Inventory()
    product1 = Product(sku="TEST-030", name="Product 1", price=Decimal("10.00"))
    product2 = Product(sku="TEST-031", name="Product 2", price=Decimal("20.00"))
    product3 = Product(sku="TEST-032", name="Product 3", price=Decimal("30.00"))
    
    inv.add_product(product1, initial_quantity=10)
    inv.add_product(product2, initial_quantity=20)
    inv.add_product(product3, initial_quantity=30)
    
    initial_stock1 = inv.get_stock("TEST-030")
    initial_stock2 = inv.get_stock("TEST-031")
    initial_stock3 = inv.get_stock("TEST-032")
    
    removals = {
        "TEST-030": 5,
        "TEST-031": 10,
        "NONEXISTENT": 5,
    }
    
    result = inv.bulk_remove(removals)
    assert result is False
    
    assert inv.get_stock("TEST-030") == initial_stock1
    assert inv.get_stock("TEST-031") == initial_stock2
    assert inv.get_stock("TEST-032") == initial_stock3

