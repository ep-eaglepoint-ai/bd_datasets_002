from typing import Dict, Any, Optional
from datetime import datetime

class OrderProcessor:
    def __init__(self):
        self.orders = {}
        self.inventory = {}

    def process_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        if not order_data:
            raise Exception("Order data is required")
        if 'items' not in order_data or not order_data['items']:
            raise Exception("Order must have items")
        if 'customer' not in order_data:
            raise Exception("Order must have customer")
        if 'shipping_address' not in order_data:
            raise Exception("Order must have shipping address")

        customer = order_data['customer']
        items = order_data['items']
        shipping_address = order_data['shipping_address']
        promo_code = order_data.get('promo_code')

        for item in items:
            product_id = item['product_id']
            quantity = item['quantity']
            if product_id not in self.inventory:
                raise Exception(f"Product {product_id} not found")
            if self.inventory[product_id]['stock'] < quantity:
                raise Exception(f"Insufficient stock for product {product_id}")

        subtotal = 0.0
        for item in items:
            product = self.inventory[item['product_id']]
            subtotal = subtotal + (product['price'] * item['quantity'])

        discount = 0.0
        customer_tier = customer.get('tier', 'standard')
        if customer_tier == 'gold':
            if subtotal >= 500:
                discount = subtotal * 0.20
            elif subtotal >= 200:
                discount = subtotal * 0.15
            elif subtotal >= 100:
                discount = subtotal * 0.10
            else:
                discount = subtotal * 0.05
        elif customer_tier == 'silver':
            if subtotal >= 500:
                discount = subtotal * 0.15
            elif subtotal >= 200:
                discount = subtotal * 0.10
            elif subtotal >= 100:
                discount = subtotal * 0.05
            else:
                discount = 0
        else:
            if subtotal >= 500:
                discount = subtotal * 0.10
            elif subtotal >= 200:
                discount = subtotal * 0.05
            else:
                discount = 0

        if promo_code:
            if promo_code == 'SAVE10':
                promo_discount = subtotal * 0.10
                if promo_discount > discount:
                    discount = promo_discount
            elif promo_code == 'SAVE20':
                promo_discount = subtotal * 0.20
                if promo_discount > discount:
                    discount = promo_discount
            elif promo_code == 'FLAT50':
                if subtotal >= 100:
                    promo_discount = 50.0
                    if promo_discount > discount:
                        discount = promo_discount

        shipping_cost = 0.0
        country = shipping_address.get('country', 'US')
        total_weight = sum(
            self.inventory[item['product_id']].get('weight', 1) * item['quantity']
            for item in items
        )

        if country == 'US':
            if total_weight <= 1:
                shipping_cost = 5.99
            elif total_weight <= 5:
                shipping_cost = 9.99
            elif total_weight <= 20:
                shipping_cost = 14.99
            else:
                shipping_cost = 24.99
        elif country in ['CA', 'MX']:
            if total_weight <= 1:
                shipping_cost = 9.99
            elif total_weight <= 5:
                shipping_cost = 19.99
            elif total_weight <= 20:
                shipping_cost = 34.99
            else:
                shipping_cost = 49.99
        else:
            if total_weight <= 1:
                shipping_cost = 19.99
            elif total_weight <= 5:
                shipping_cost = 39.99
            elif total_weight <= 20:
                shipping_cost = 69.99
            else:
                shipping_cost = 99.99

        if country == 'US' and (subtotal - discount) >= 100:
            shipping_cost = 0.0

        tax_rate = 0.0
        state = shipping_address.get('state', '')
        if country == 'US':
            if state in ['CA', 'NY', 'TX']:
                tax_rate = 0.08
            elif state in ['WA', 'FL']:
                tax_rate = 0.065
            else:
                tax_rate = 0.05

        taxable_amount = subtotal - discount
        tax = taxable_amount * tax_rate

        total = subtotal - discount + shipping_cost + tax

        total = round(total, 2)
        discount = round(discount, 2)
        tax = round(tax, 2)
        shipping_cost = round(shipping_cost, 2)

        order_id = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        order = {
            'order_id': order_id,
            'customer_id': customer.get('id'),
            'items': items,
            'subtotal': subtotal,
            'discount': discount,
            'shipping_cost': shipping_cost,
            'tax': tax,
            'total': total,
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }

        self.orders[order_id] = order

        for item in items:
            self.inventory[item['product_id']]['stock'] -= item['quantity']

        return order

    def add_product(self, product_id: str, name: str, price: float, 
                    stock: int, weight: float = 1.0) -> None:
        self.inventory[product_id] = {
            'name': name,
            'price': price,
            'stock': stock,
            'weight': weight
        }

    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        return self.orders.get(order_id)

    def update_order_status(self, order_id: str, status: str) -> None:
        if order_id not in self.orders:
            raise Exception(f"Order {order_id} not found")

        valid_statuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']
        if status not in valid_statuses:
            raise Exception(f"Invalid status: {status}")

        self.orders[order_id]['status'] = status
