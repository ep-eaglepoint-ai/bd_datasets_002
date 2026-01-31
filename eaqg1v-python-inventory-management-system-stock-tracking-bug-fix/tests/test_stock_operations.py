import pytest
from inventory import Inventory
from models import Product


def test_remove_stock_validates_before_decrementing():
    """remove_stock(10) when stock is 5 must return False and stock must remain 5."""
    inv = Inventory()
    product = Product(sku="TEST-001", name="Test Product", price=10.0)
    inv.add_product(product, initial_quantity=5)
    
    result = inv.remove_stock("TEST-001", 10)
    assert result is False
    assert inv.get_stock("TEST-001") == 5


def test_remove_stock_returns_false_when_insufficient():
    """remove_stock(10) when stock is 5 must return False."""
    inv = Inventory()
    product = Product(sku="TEST-002", name="Test Product", price=10.0)
    inv.add_product(product, initial_quantity=5)
    
    result = inv.remove_stock("TEST-002", 10)
    assert result is False


def test_sku_normalization():
    """get_stock("test-001") must return same result as get_stock("TEST-001") and get_stock(" test-001 ")."""
    inv = Inventory()
    product = Product(sku="TEST-001", name="Test Product", price=10.0)
    inv.add_product(product, initial_quantity=10)
    
    assert inv.get_stock("test-001") == inv.get_stock("TEST-001")
    assert inv.get_stock("test-001") == inv.get_stock(" test-001 ")
    assert inv.get_stock("TEST-001") == 10


def test_quantity_validation():
    """add_stock(sku, -5) and add_stock(sku, 2.5) must raise ValueError."""
    inv = Inventory()
    product = Product(sku="TEST-010", name="Test Product", price=10.0)
    inv.add_product(product, initial_quantity=10)
    
    with pytest.raises(ValueError):
        inv.add_stock("TEST-010", -5)
    
    with pytest.raises(ValueError):
        inv.add_stock("TEST-010", 2.5)

