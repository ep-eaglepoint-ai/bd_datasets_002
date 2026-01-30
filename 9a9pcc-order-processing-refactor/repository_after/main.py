from typing import Dict, Any, Optional, List
from datetime import datetime
from decimal import Decimal, ROUND_HALF_EVEN
from enum import Enum
from dataclasses import dataclass
from abc import ABC, abstractmethod

class OrderProcessingError(Exception):
    """Base exception for all order processing errors."""
    pass

class InvalidOrderError(OrderProcessingError):
    """Raised when the order data is invalid or missing required fields."""
    pass

class ProductNotFoundError(OrderProcessingError):
    """Raised when a requested product does not exist in inventory."""
    def __init__(self, product_id: str):
        super().__init__(f"Product {product_id} not found")
        self.product_id = product_id

class InsufficientInventoryError(OrderProcessingError):
    """Raised when there is not enough stock for a product."""
    def __init__(self, product_id: str):
        super().__init__(f"Insufficient stock for product {product_id}")
        self.product_id = product_id

class PaymentFailedError(OrderProcessingError):
    """Raised when payment processing fails."""
    pass

class ShippingNotAvailableError(OrderProcessingError):
    """Raised when shipping is not available for the given address."""
    pass

class OrderStatus(Enum):
    """Enum for representing various order statuses."""
    PENDING = 'pending'
    PAID = 'paid'
    SHIPPED = 'shipped'
    DELIVERED = 'delivered'
    CANCELLED = 'cancelled'

@dataclass(frozen=True)
class Money:
    """Value object to handle currency operations safely using Decimal."""
    amount: Decimal

    @classmethod
    def from_float(cls, value: float) -> 'Money':
        return cls(Decimal(str(value)))

    def __add__(self, other: 'Money') -> 'Money':
        if not isinstance(other, Money):
            return NotImplemented
        return Money(self.amount + other.amount)

    def __sub__(self, other: 'Money') -> 'Money':
        if not isinstance(other, Money):
            return NotImplemented
        return Money(self.amount - other.amount)

    def __mul__(self, other: Any) -> 'Money':
        if isinstance(other, (int, float)):
            return Money(self.amount * Decimal(str(other)))
        if isinstance(other, Decimal):
            return Money(self.amount * other)
        return NotImplemented

    def __ge__(self, other: 'Money') -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return self.amount >= other.amount

    def __lt__(self, other: 'Money') -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return self.amount < other.amount

    def round(self) -> 'Money':
        """Rounds the amount to 2 decimal places using Banker's rounding."""
        return Money(self.amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_EVEN))

    def to_float(self) -> float:
        """Returns the rounded amount as a float."""
        return float(self.amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_EVEN))

    def to_float_raw(self) -> float:
        """Returns the raw unrounded amount as a float."""
        return float(self.amount)

@dataclass(frozen=True)
class Address:
    """Value object for shipping address."""
    country: str = 'US'
    state: str = ''

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Address':
        """Creates an Address from a dictionary with validation."""
        if not isinstance(data, dict):
            raise InvalidOrderError("Shipping address must be a dictionary")
        if 'country' in data and not isinstance(data['country'], str):
            raise InvalidOrderError("Country must be a string")
        if 'state' in data and not isinstance(data['state'], str):
            raise InvalidOrderError("State must be a string")
        return cls(
            country=data.get('country', 'US'),
            state=data.get('state', '')
        )

class DiscountStrategy(ABC):
    """Interface for discount calculation strategies."""
    @abstractmethod
    def calculate(self, subtotal: Money, context: Dict[str, Any]) -> Money:
        pass

class TierBasedDiscount(DiscountStrategy):
    """Strategy for calculating discounts based on customer tier and subtotal."""
    def calculate(self, subtotal: Money, context: Dict[str, Any]) -> Money:
        customer = context.get('customer', {})
        tier = customer.get('tier', 'standard')
        amount = subtotal.amount

        if tier == 'gold':
            if amount >= 500: return subtotal * 0.20
            if amount >= 200: return subtotal * 0.15
            if amount >= 100: return subtotal * 0.10
            return subtotal * 0.05
        elif tier == 'silver':
            if amount >= 500: return subtotal * 0.15
            if amount >= 200: return subtotal * 0.10
            if amount >= 100: return subtotal * 0.05
            return Money(Decimal('0'))
        else:
            if amount >= 500: return subtotal * 0.10
            if amount >= 200: return subtotal * 0.05
            return Money(Decimal('0'))

class PromoCodeDiscount(DiscountStrategy):
    """Strategy for calculating discounts based on promotional codes."""
    def calculate(self, subtotal: Money, context: Dict[str, Any]) -> Money:
        promo_code = context.get('promo_code')
        if not promo_code:
            return Money(Decimal('0'))

        if promo_code == 'SAVE10':
            return subtotal * 0.10
        elif promo_code == 'SAVE20':
            return subtotal * 0.20
        elif promo_code == 'FLAT50':
            if subtotal >= Money(Decimal('100')):
                return Money(Decimal('50.0'))
        return Money(Decimal('0'))

class VolumeDiscount(DiscountStrategy):
    """Strategy for calculating discounts based on order volume."""
    def calculate(self, subtotal: Money, context: Dict[str, Any]) -> Money:
        # Original logic has no specific volume discount, implemented for extensibility.
        return Money(Decimal('0'))

class ShippingCalculator:
    """Handles logic for calculating shipping costs."""
    def calculate(self, items: List[Dict[str, Any]], address: Address, 
                  subtotal: Money, discount: Money, inventory: Dict[str, Any]) -> Money:
        total_weight = sum(
            inventory[item['product_id']].get('weight', 1) * item['quantity']
            for item in items
        )
        
        country = address.country
        cost = 0.0
        
        if country == 'US':
            if total_weight <= 1: cost = 5.99
            elif total_weight <= 5: cost = 9.99
            elif total_weight <= 20: cost = 14.99
            else: cost = 24.99
        elif country in ['CA', 'MX']:
            if total_weight <= 1: cost = 9.99
            elif total_weight <= 5: cost = 19.99
            elif total_weight <= 20: cost = 34.99
            else: cost = 49.99
        else:
            if total_weight <= 1: cost = 19.99
            elif total_weight <= 5: cost = 39.99
            elif total_weight <= 20: cost = 69.99
            else: cost = 99.99
            
        if country == 'US' and (subtotal - discount) >= Money(Decimal('100')):
            cost = 0.0
            
        return Money.from_float(cost)

class TaxCalculator:
    """Handles logic for calculating taxes."""
    def calculate(self, taxable_amount: Money, address: Address) -> Money:
        if address.country != 'US':
            return Money(Decimal('0'))
            
        rate = 0.05
        state = address.state
        if state in ['CA', 'NY', 'TX']:
            rate = 0.08
        elif state in ['WA', 'FL']:
            rate = 0.065
            
        return taxable_amount * rate

class OrderProcessor:
    """Refactored system for processing e-commerce orders."""
    
    def __init__(self, 
                 discount_strategies: Optional[List[DiscountStrategy]] = None,
                 shipping_calculator: Optional[ShippingCalculator] = None,
                 tax_calculator: Optional[TaxCalculator] = None):
        """
        Initializes the OrderProcessor with optional custom strategies and calculators.
        Implements Dependency Injection (DI) as per requirement 2.
        """
        self.orders: Dict[str, Any] = {}
        self.inventory: Dict[str, Any] = {}
        
        self.discount_strategies = discount_strategies or [
            TierBasedDiscount(),
            PromoCodeDiscount(),
            VolumeDiscount()
        ]
        self.shipping_calculator = shipping_calculator or ShippingCalculator()
        self.tax_calculator = tax_calculator or TaxCalculator()

    def add_product(self, product_id: str, name: str, price: float, 
                    stock: int, weight: float = 1.0) -> None:
        """Adds or updates a product in the inventory."""
        self.inventory[product_id] = {
            'name': name,
            'price': price,
            'stock': stock,
            'weight': weight
        }

    def process_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Processes an order, calculates costs, and updates inventory."""
        self._validate_input(order_data)
        
        customer = order_data['customer']
        items_data = order_data['items']
        address = Address.from_dict(order_data['shipping_address'])
        promo_code = order_data.get('promo_code')

        # Check stock and quantity before any operations
        for item in items_data:
            product_id = item.get('product_id')
            quantity = item.get('quantity')
            
            if not product_id or quantity is None:
                raise InvalidOrderError("Each item must have a product_id and quantity")
            
            if quantity <= 0:
                raise InvalidOrderError(f"Invalid quantity {quantity} for product {product_id}")
                
            if product_id not in self.inventory:
                raise ProductNotFoundError(product_id)
                
            if self.inventory[product_id]['stock'] < quantity:
                raise InsufficientInventoryError(product_id)

        # Calculate subtotal
        subtotal_val = Decimal('0')
        for item in items_data:
            product = self.inventory[item['product_id']]
            subtotal_val += Decimal(str(product['price'])) * Decimal(str(item['quantity']))
        subtotal = Money(subtotal_val)

        # Apply best discount strategy
        context = {'customer': customer, 'promo_code': promo_code}
        discount = self._get_best_discount(subtotal, context)
        
        # Calculate shipping and taxes
        shipping_cost = self.shipping_calculator.calculate(items_data, address, subtotal, discount, self.inventory)
        taxable_amount = subtotal - discount
        tax = self.tax_calculator.calculate(taxable_amount, address)
        
        total = subtotal - discount + shipping_cost + tax

        # Create order record
        order_id = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        order = {
            'order_id': order_id,
            'customer_id': customer.get('id'),
            'items': items_data,
            'subtotal': subtotal.to_float_raw(),
            'discount': discount.to_float(),
            'shipping_cost': shipping_cost.to_float(),
            'tax': tax.to_float(),
            'total': total.to_float(),
            'status': OrderStatus.PENDING.value,
            'created_at': datetime.now().isoformat()
        }

        self.orders[order_id] = order

        # Deduct inventory
        for item in items_data:
            self.inventory[item['product_id']]['stock'] -= item['quantity']

        return order

    def _validate_input(self, order_data: Dict[str, Any]) -> None:
        """Guard clauses for initial input validation."""
        if not order_data:
            raise InvalidOrderError("Order data is required")
        if 'items' not in order_data or not order_data['items']:
            raise InvalidOrderError("Order must have items")
        if 'customer' not in order_data:
            raise InvalidOrderError("Order must have customer")
        if 'shipping_address' not in order_data:
            raise InvalidOrderError("Order must have shipping address")

    def _get_best_discount(self, subtotal: Money, context: Dict[str, Any]) -> Money:
        """Finds and returns the maximum discount from all available strategies."""
        best_discount = Money(Decimal('0'))
        for strategy in self.discount_strategies:
            current_discount = strategy.calculate(subtotal, context)
            if current_discount >= best_discount:
                best_discount = current_discount
        return best_discount

    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves an order by its ID."""
        return self.orders.get(order_id)

    def update_order_status(self, order_id: str, status: str) -> None:
        """Updates the status of an existing order."""
        if order_id not in self.orders:
            raise InvalidOrderError(f"Order {order_id} not found")

        try:
            valid_status = OrderStatus(status)
        except ValueError:
            raise InvalidOrderError(f"Invalid status: {status}")

        self.orders[order_id]['status'] = valid_status.value
