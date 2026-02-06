import unittest
try:
    from main import (
        OrderProcessor, InvalidOrderError, ProductNotFoundError, 
        InsufficientInventoryError, OrderStatus
    )
    HAS_REFACTORED_FEATURES = True
except ImportError:
    # Fallback for repository_before
    from main import OrderProcessor
    HAS_REFACTORED_FEATURES = False
    InvalidOrderError = Exception
    ProductNotFoundError = Exception
    InsufficientInventoryError = Exception

class TestOrderRefactoring(unittest.TestCase):
    def setUp(self):
        self.processor = OrderProcessor()
        self.processor.add_product("p1", "Product 1", 100.0, 10, 1.0)

    def test_invalid_status(self):
        order_data = {
            'customer': {'id': 'c1'},
            'items': [{'product_id': 'p1', 'quantity': 1}],
            'shipping_address': {'country': 'US'}
        }
        order = self.processor.process_order(order_data)
        order_id = order['order_id']
        
        with self.assertRaises(InvalidOrderError) as cm:
            self.processor.update_order_status(order_id, "SUPER_PAID")
        self.assertIn("Invalid status: SUPER_PAID", str(cm.exception))
        # Extra check: ensure it's NOT just a generic Exception if we are expecting refactored features
        if type(cm.exception) is Exception and InvalidOrderError is not Exception:
            self.fail("Raised generic Exception instead of InvalidOrderError")

    def test_negative_quantity(self):
        order_data = {
            'customer': {'id': 'c1'},
            'items': [{'product_id': 'p1', 'quantity': -1}],
            'shipping_address': {'country': 'US'}
        }
        with self.assertRaises(InvalidOrderError) as cm:
            self.processor.process_order(order_data)
        self.assertIn("Invalid quantity -1", str(cm.exception))

    def test_missing_data(self):
        with self.assertRaises(Exception):
            self.processor.process_order({})
        with self.assertRaises(Exception):
            self.processor.process_order({'customer': {'id': 'c1'}}) # missing items

    def test_insufficient_stock_context(self):
        order_data = {
            'customer': {'id': 'c1'},
            'items': [{'product_id': 'p1', 'quantity': 100}],
            'shipping_address': {'country': 'US'}
        }
        with self.assertRaises(InsufficientInventoryError) as cm:
            self.processor.process_order(order_data)
        
        # This will fail on repository_before because it doesn't have .product_id attribute
        self.assertEqual(cm.exception.product_id, "p1")
        self.assertIn("Insufficient stock for product p1", str(cm.exception))

if __name__ == '__main__':
    unittest.main()
