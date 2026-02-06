from dataclasses import dataclass, field
from typing import Optional
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime


@dataclass
class Product:
    id: str
    name: str
    price: Decimal
    category: str
    bogo_eligible: bool = False


@dataclass
class CartItem:
    product: Product
    quantity: int
    
    @property
    def line_total(self) -> Decimal:
        return self.product.price * self.quantity


@dataclass
class DiscountCode:
    code: str
    discount_type: str
    value: Decimal
    min_purchase: Decimal = Decimal("0")
    expires_at: Optional[datetime] = None
    
    def is_valid(self, subtotal: Decimal) -> bool:
        if self.expires_at and datetime.now() > self.expires_at:
            return False
        if subtotal < self.min_purchase:
            return False
        return True


class ShoppingCart:
    def __init__(self, customer_id: str, tax_rate: Decimal = Decimal("0.08")):
        self.customer_id = customer_id
        self.tax_rate = tax_rate
        self.items: dict[str, CartItem] = {}
        self.applied_discounts: list[DiscountCode] = []
        self._used_codes: set[str] = set()
        self._subtotal: Decimal = Decimal("0")
    
    def add_item(self, product: Product, quantity: int = 1) -> None:
        if product.id in self.items:
            self.items[product.id].quantity += quantity
        else:
            self.items[product.id] = CartItem(product=product, quantity=quantity)
        self._calculate_subtotal()
    
    def remove_item(self, product_id: str, quantity: Optional[int] = None) -> bool:
        if product_id not in self.items:
            return False
        
        if quantity is None:
            del self.items[product_id]
        else:
            self.items[product_id].quantity -= quantity
        
        return True
    
    def apply_discount(self, discount: DiscountCode) -> bool:
        if discount.code in self._used_codes:
            return False
        
        if not discount.is_valid(self._subtotal):
            return False
        
        self.applied_discounts.append(discount)
        return True
    
    def remove_discount(self, code: str) -> bool:
        for i, discount in enumerate(self.applied_discounts):
            if discount.code == code:
                self.applied_discounts.pop(i)
                return True
        return False
    
    def _calculate_subtotal(self) -> None:
        self._subtotal = sum(
            item.line_total for item in self.items.values()
        )
    
    def _apply_bogo_deals(self, subtotal: Decimal) -> Decimal:
        bogo_savings = Decimal("0")
        
        for item in self.items.values():
            if item.product.bogo_eligible:
                free_items = item.quantity // 2
                bogo_savings += item.product.price * free_items
        
        return subtotal - bogo_savings
    
    def _apply_discounts(self, amount: Decimal) -> Decimal:
        discounted = amount
        
        for discount in self.applied_discounts:
            if discount.discount_type == "percentage":
                reduction = discounted * (discount.value / 100)
                discounted = discounted - round(reduction, 2)
            elif discount.discount_type == "fixed":
                discounted = discounted - discount.value
        
        return discounted
    
    def calculate_total(self) -> dict:
        self._calculate_subtotal()
        subtotal = self._subtotal
        
        after_bogo = self._apply_bogo_deals(subtotal)
        after_discounts = self._apply_discounts(after_bogo)
        
        tax = after_discounts * self.tax_rate
        tax = tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        
        total = after_discounts + tax
        
        return {
            "subtotal": float(subtotal),
            "bogo_savings": float(subtotal - after_bogo),
            "discount_savings": float(after_bogo - after_discounts),
            "tax": float(tax),
            "total": float(total)
        }
    
    def get_item_count(self) -> int:
        return sum(item.quantity for item in self.items.values())
    
    def clear(self) -> None:
        self.items.clear()
        self.applied_discounts.clear()
        self._subtotal = Decimal("0")


class DiscountCodeManager:
    def __init__(self):
        self._used_codes: dict[str, set[str]] = {}
    
    def mark_code_used(self, customer_id: str, code: str) -> None:
        if customer_id not in self._used_codes:
            self._used_codes[customer_id] = set()
        self._used_codes[customer_id].add(code)
    
    def is_code_available(self, customer_id: str, code: str) -> bool:
        if customer_id not in self._used_codes:
            return True
        return code not in self._used_codes[customer_id]
    
    def get_customer_used_codes(self, customer_id: str) -> list[str]:
        return list(self._used_codes.get(customer_id, set()))

