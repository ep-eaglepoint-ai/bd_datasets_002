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
    def __init__(self, customer_id: str, tax_rate: Decimal = Decimal("0.08"), discount_manager: Optional['DiscountCodeManager'] = None):
        self.customer_id = customer_id
        self.tax_rate = tax_rate
        self.items: dict[str, CartItem] = {}
        self.applied_discounts: list[DiscountCode] = []
        self._used_codes: set[str] = set()
        self._subtotal: Decimal = Decimal("0")
        self.discount_manager = discount_manager
    
    def add_item(self, product: Product, quantity: int = 1) -> None:
        # Requirement 9: Add validation to add_item: reject quantity <= 0
        if quantity <= 0:
            return
            
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
            # Requirement 2: Fix remove_item method: when quantity becomes zero or negative, delete item
            if self.items[product_id].quantity <= 0:
                del self.items[product_id]
        
        # Requirement 3: Fix subtotal not updating after remove_item
        self._calculate_subtotal()
        return True
    
    def apply_discount(self, discount: DiscountCode) -> bool:
        # Requirement 4: Fix discount code reuse - check DiscountCodeManager
        if self.discount_manager and not self.discount_manager.is_code_available(self.customer_id, discount.code):
            return False
        
        if discount.code in self._used_codes:
            return False
        
        if not discount.is_valid(self._subtotal):
            return False
        
        self.applied_discounts.append(discount)
        # Requirement 8: Fix discount codes not marked as used
        if self.discount_manager:
            self.discount_manager.mark_code_used(self.customer_id, discount.code)
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
                # Requirement 6: Fix BOGO calculation - add explicit check for quantity >= 2
                if item.quantity >= 2:
                    free_items = item.quantity // 2
                    bogo_savings += item.product.price * free_items
        
        # Requirement 11: Verify BOGO savings calculation doesn't produce negative savings
        result = subtotal - bogo_savings
        return max(result, Decimal("0"))
    
    def _apply_discounts(self, amount: Decimal) -> Decimal:
        discounted = amount
        total_reduction = Decimal("0")
        
        # Requirement 1: Fix discount application order - fixed amount discounts BEFORE percentage
        # Apply fixed discounts first
        for discount in self.applied_discounts:
            if discount.discount_type == "fixed":
                total_reduction += discount.value
        
        # Then apply percentage discounts
        remaining_amount = discounted - total_reduction
        for discount in self.applied_discounts:
            if discount.discount_type == "percentage":
                # Requirement 7: Fix intermediate rounding - don't round after each discount
                reduction = remaining_amount * (discount.value / 100)
                total_reduction += reduction
        
        # Apply all reductions at once and round only once
        discounted = amount - total_reduction
        discounted = discounted.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        
        # Requirement 5: Fix negative total - return Decimal("0") instead of negative
        return max(discounted, Decimal("0"))
    
    def calculate_total(self) -> dict:
        self._calculate_subtotal()
        subtotal = self._subtotal
        
        after_bogo = self._apply_bogo_deals(subtotal)
        after_discounts = self._apply_discounts(after_bogo)
        
        tax = after_discounts * self.tax_rate
        tax = tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        
        total = after_discounts + tax
        
        # Requirement 10: Fix return type precision - ensure proper rounding before float conversion
        return {
            "subtotal": float(subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            "bogo_savings": float((subtotal - after_bogo).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            "discount_savings": float((after_bogo - after_discounts).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            "tax": float(tax),
            "total": float(total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        }
    
    def get_item_count(self) -> int:
        return sum(item.quantity for item in self.items.values())
    
    def clear(self) -> None:
        self.items.clear()
        self.applied_discounts.clear()
        self._subtotal = Decimal("0")
        # Requirement 12: Ensure clear() method also clears _used_codes
        self._used_codes.clear()


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