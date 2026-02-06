import unittest
from datetime import datetime
from main import OrderProcessor

class TestOrderProcessor(unittest.TestCase):
    def setUp(self):
        self.processor = OrderProcessor()
        self.processor.add_product("p1", "Product 1", 100.0, 10, 2.0)
        self.processor.add_product("p2", "Product 2", 50.0, 20, 0.5)

    def test_basic_order(self):
        order_data = {
            'customer': {'id': 'c1', 'tier': 'standard'},
            'items': [{'product_id': 'p1', 'quantity': 1}],
            'shipping_address': {'country': 'US', 'state': 'NY'}
        }
        order = self.processor.process_order(order_data)
        
        # Weight: 2.0 -> Shipping (US, 1 < w <= 5): 9.99 -> BUT free shipping if (subtotal-discount) >= 100
        # Tax (US, NY): 0.08 * (100 - 0) = 8.0
        # Total: 100 + 0.0 + 8.0 = 108.0
        self.assertEqual(order['subtotal'], 100.0)
        self.assertEqual(order['discount'], 0.0)
        self.assertEqual(order['shipping_cost'], 0.0)
        self.assertEqual(order['tax'], 8.0)
        self.assertEqual(order['total'], 108.0)
        self.assertEqual(self.processor.inventory['p1']['stock'], 9)

    def test_gold_tier_discounts(self):
        # Gold tier thresholds: >=500 (20%), >=200 (15%), >=100 (10%), else 5%
        scenarios = [
            (6, 600.0, 120.0), # 600 * 0.20 = 120
            (3, 300.0, 45.0),  # 300 * 0.15 = 45
            (1.5, 150.0, 15.0), # 150 * 0.10 = 15
            (0.5, 50.0, 2.5)    # 50 * 0.05 = 2.5
        ]
        
        for qty, expected_subtotal, expected_discount in scenarios:
            processor = OrderProcessor()
            processor.add_product("p1", "P1", 100.0, 10, 1.0)
            order_data = {
                'customer': {'id': 'c1', 'tier': 'gold'},
                'items': [{'product_id': 'p1', 'quantity': qty}],
                'shipping_address': {'country': 'US', 'state': 'OR'} # 5% tax
            }
            order = processor.process_order(order_data)
            self.assertEqual(order['subtotal'], expected_subtotal)
            self.assertEqual(order['discount'], expected_discount)

    def test_silver_tier_discounts(self):
        # Silver tier thresholds: >=500 (15%), >=200 (10%), >=100 (5%), else 0
        scenarios = [
            (6, 600.0, 90.0),  # 600 * 0.15 = 90
            (3, 300.0, 30.0),  # 300 * 0.10 = 30
            (1.5, 150.0, 7.5),  # 150 * 0.05 = 7.5
            (0.5, 50.0, 0.0)    # 0
        ]
        
        for qty, expected_subtotal, expected_discount in scenarios:
            processor = OrderProcessor()
            processor.add_product("p1", "P1", 100.0, 10, 1.0)
            order_data = {
                'customer': {'id': 'c1', 'tier': 'silver'},
                'items': [{'product_id': 'p1', 'quantity': qty}],
                'shipping_address': {'country': 'US', 'state': 'OR'}
            }
            order = processor.process_order(order_data)
            self.assertEqual(order['subtotal'], expected_subtotal)
            self.assertEqual(order['discount'], expected_discount)

    def test_standard_tier_discounts(self):
        # Standard tier thresholds: >=500 (10%), >=200 (5%), else 0
        scenarios = [
            (6, 600.0, 60.0),  # 600 * 0.10 = 60
            (3, 300.0, 15.0),  # 300 * 0.05 = 15
            (1.5, 150.0, 0.0)   # 0
        ]
        
        for qty, expected_subtotal, expected_discount in scenarios:
            processor = OrderProcessor()
            processor.add_product("p1", "P1", 100.0, 10, 1.0)
            order_data = {
                'customer': {'id': 'c1', 'tier': 'standard'},
                'items': [{'product_id': 'p1', 'quantity': qty}],
                'shipping_address': {'country': 'US', 'state': 'OR'}
            }
            order = processor.process_order(order_data)
            self.assertEqual(order['subtotal'], expected_subtotal)
            self.assertEqual(order['discount'], expected_discount)

    def test_promo_codes(self):
        # SAVE10: 10%, SAVE20: 20%, FLAT50: 50.0 if subtotal >= 100
        # Promo discount vs Tier discount: max wins
        
        # Scenario: Gold tier (100 -> 10.0 discount) + SAVE20 (100 -> 20.0 discount)
        order_data = {
            'customer': {'id': 'c1', 'tier': 'gold'},
            'items': [{'product_id': 'p1', 'quantity': 1}],
            'shipping_address': {'country': 'US', 'state': 'OR'},
            'promo_code': 'SAVE20'
        }
        order = self.processor.process_order(order_data)
        self.assertEqual(order['discount'], 20.0) # 20% wins over 10%

        # Scenario: Gold tier (100 -> 10.0 discount) + FLAT50 (50.0 discount)
        order_data['promo_code'] = 'FLAT50'
        order = self.processor.process_order(order_data)
        self.assertEqual(order['discount'], 50.0) # 50.0 wins over 10.0

    def test_shipping_costs(self):
        # US: <=1: 5.99, <=5: 9.99, <=20: 14.99, else: 24.99
        # CA/MX: <=1: 9.99, <=5: 19.99, <=20: 34.99, else: 49.99
        # Other: <=1: 19.99, <=5: 39.99, <=20: 69.99, else: 99.99
        
        ship_scenarios = [
            ('US', 0.5, 5.99),
            ('US', 3.0, 9.99),
            ('US', 15.0, 14.99),
            ('US', 25.0, 24.99),
            ('CA', 0.5, 9.99),
            ('MX', 3.0, 19.99),
            ('UK', 0.5, 19.99),
            ('UK', 25.0, 99.99)
        ]
        
        for country, weight, expected_cost in ship_scenarios:
            processor = OrderProcessor()
            processor.add_product("p1", "P1", 10.0, 100, weight)
            order_data = {
                'customer': {'id': 'c1'},
                'items': [{'product_id': 'p1', 'quantity': 1}],
                'shipping_address': {'country': country, 'state': 'XX'}
            }
            order = processor.process_order(order_data)
            self.assertEqual(order['shipping_cost'], expected_cost, f"Failed for {country} with weight {weight}")

    def test_free_shipping_us(self):
        # country == 'US' and (subtotal - discount) >= 100: FREE
        processor = OrderProcessor()
        processor.add_product("p1", "P1", 150.0, 10, 10.0)
        order_data = {
            'customer': {'id': 'c1', 'tier': 'standard'}, # 0 discount for 150
            'items': [{'product_id': 'p1', 'quantity': 1}],
            'shipping_address': {'country': 'US', 'state': 'NY'}
        }
        order = processor.process_order(order_data)
        self.assertEqual(order['shipping_cost'], 0.0)

    def test_taxes_us(self):
        # CA, NY, TX: 8%
        # WA, FL: 6.5%
        # Others: 5%
        tax_scenarios = [
            ('CA', 0.08),
            ('NY', 0.08),
            ('TX', 0.08),
            ('WA', 0.065),
            ('FL', 0.065),
            ('OR', 0.05)
        ]
        for state, rate in tax_scenarios:
            processor = OrderProcessor()
            processor.add_product("p1", "P1", 100.0, 10, 1.0)
            order_data = {
                'customer': {'id': 'c1', 'tier': 'standard'},
                'items': [{'product_id': 'p1', 'quantity': 1}],
                'shipping_address': {'country': 'US', 'state': state}
            }
            order = processor.process_order(order_data)
            self.assertEqual(order['tax'], round(100.0 * rate, 2))

    def test_inventory_validation(self):
        with self.assertRaises(Exception) as cm:
            self.processor.process_order({
                'customer': {'id': 'c1'},
                'items': [{'product_id': 'nonexistent', 'quantity': 1}],
                'shipping_address': {'country': 'US'}
            })
        self.assertIn("Product nonexistent not found", str(cm.exception))

        with self.assertRaises(Exception) as cm:
            self.processor.process_order({
                'customer': {'id': 'c1'},
                'items': [{'product_id': 'p1', 'quantity': 100}],
                'shipping_address': {'country': 'US'}
            })
        self.assertIn("Insufficient stock for product p1", str(cm.exception))

if __name__ == '__main__':
    unittest.main()
