from decimal import Decimal
from inventory import Inventory
from models import Product


def test_decimal_calculation_precision():
    """1000 items priced at $0.10 each must be exactly $100.00."""
    inv = Inventory()
    product = Product(sku="TEST-001", name="Test Product", price=Decimal("0.10"))
    inv.add_product(product, initial_quantity=1000)
    
    total_value = inv.get_total_value()
    assert total_value == Decimal("100.00")
    assert isinstance(total_value, Decimal)


def test_get_total_value_empty_inventory():
    """get_total_value() on new empty Inventory must return Decimal('0.00')."""
    inv = Inventory()
    total_value = inv.get_total_value()
    assert total_value == Decimal("0.00")
    assert isinstance(total_value, Decimal)


def test_reorder_threshold_equals():
    """Alert must trigger when stock becomes 10 (threshold), not 9."""
    inv = Inventory()
    product = Product(sku="TEST-010", name="Test Product", price=Decimal("10.00"), reorder_threshold=10)
    inv.add_product(product, initial_quantity=10)
    
    reorder_items = inv.check_reorder()
    assert len(reorder_items) == 1
    assert reorder_items[0].sku == "TEST-010"


def test_check_reorder_returns_all_items():
    """With 3 items below threshold, check_reorder() must return list of 3 products."""
    inv = Inventory()
    product1 = Product(sku="TEST-020", name="Product 1", price=Decimal("10.00"), reorder_threshold=10)
    product2 = Product(sku="TEST-021", name="Product 2", price=Decimal("20.00"), reorder_threshold=10)
    product3 = Product(sku="TEST-022", name="Product 3", price=Decimal("30.00"), reorder_threshold=10)
    
    inv.add_product(product1, initial_quantity=5)
    inv.add_product(product2, initial_quantity=8)
    inv.add_product(product3, initial_quantity=10)
    
    reorder_items = inv.check_reorder()
    assert len(reorder_items) == 3
    
    skus = {item.sku for item in reorder_items}
    assert "TEST-020" in skus
    assert "TEST-021" in skus
    assert "TEST-022" in skus

