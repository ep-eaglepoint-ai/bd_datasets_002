from typing import Dict, List, Optional
from models import Product, StockEntry
from transaction import TransactionLog
from datetime import datetime
from decimal import Decimal
import threading


class Inventory:
    def __init__(self):
        self.stock: Dict[str, StockEntry] = {}
        self.transaction_log = TransactionLog()
        self._lock = threading.RLock()  # Reentrant lock for thread safety
    
    def _normalize_sku(self, sku: str) -> str:
        """Normalize SKU by stripping whitespace and converting to uppercase."""
        return sku.strip().upper()
    
    def _get_stock_key(self, sku: str) -> str:
        """Get the internal key for a normalized SKU."""
        normalized = self._normalize_sku(sku)
        return "SKU_" + normalized
    
    def _validate_quantity(self, quantity: int, allow_zero: bool = False) -> None:
        """Validate that quantity is a positive integer. Raises ValueError if invalid."""
        if not isinstance(quantity, int):
            raise ValueError(f"Quantity must be an integer, got {type(quantity).__name__}")
        if quantity < 0:
            raise ValueError(f"Quantity must be non-negative, got {quantity}")
        if not allow_zero and quantity == 0:
            raise ValueError("Quantity must be positive")
    
    def add_product(self, product: Product, initial_quantity: int = 0):
        """Add a product to inventory. initial_quantity can be zero."""
        self._validate_quantity(initial_quantity, allow_zero=True)
        
        with self._lock:
            normalized_sku = self._normalize_sku(product.sku)
            # Update product SKU to normalized version for consistency
            product.sku = normalized_sku
            key = self._get_stock_key(normalized_sku)
            self.stock[key] = StockEntry(product=product, quantity=initial_quantity)
            self.transaction_log.log_transaction(
                sku=normalized_sku,
                quantity_change=initial_quantity,
                operation="INITIAL_STOCK"
            )
    
    def add_stock(self, sku: str, quantity: int) -> bool:
        """Add stock to an existing product. Returns False if product doesn't exist."""
        self._validate_quantity(quantity)
        
        normalized_sku = self._normalize_sku(sku)
        key = self._get_stock_key(normalized_sku)
        
        with self._lock:
            if key not in self.stock:
                return False
            
            entry = self.stock[key]
            entry.quantity += quantity
            entry.last_updated = datetime.now()
            
            self.transaction_log.log_transaction(
                sku=normalized_sku,
                quantity_change=quantity,
                operation="ADD"
            )
        return True
    
    def remove_stock(self, sku: str, quantity: int) -> bool:
        """Remove stock from an existing product. Returns False if product doesn't exist or insufficient stock."""
        self._validate_quantity(quantity)
        
        normalized_sku = self._normalize_sku(sku)
        key = self._get_stock_key(normalized_sku)
        
        with self._lock:
            if key not in self.stock:
                return False
            
            entry = self.stock[key]
            
            # Validate available quantity BEFORE decrementing
            if entry.quantity < quantity:
                return False  # Insufficient stock - do not modify anything
            
            entry.quantity -= quantity
            entry.last_updated = datetime.now()
            
            self.transaction_log.log_transaction(
                sku=normalized_sku,
                quantity_change=-quantity,
                operation="REMOVE"
            )
        return True
    
    def get_stock(self, sku: str) -> Optional[int]:
        """Get current stock level for a product. Returns None if product doesn't exist."""
        normalized_sku = self._normalize_sku(sku)
        key = self._get_stock_key(normalized_sku)
        
        with self._lock:
            if key not in self.stock:
                return None
            return self.stock[key].quantity
    
    def get_product(self, sku: str) -> Optional[Product]:
        """Get product information. Returns None if product doesn't exist."""
        normalized_sku = self._normalize_sku(sku)
        key = self._get_stock_key(normalized_sku)
        
        with self._lock:
            if key not in self.stock:
                return None
            return self.stock[key].product
    
    def check_reorder(self) -> List[Product]:
        """Return ALL products at or below reorder threshold (uses <= not <)."""
        result = []
        with self._lock:
            for key, entry in self.stock.items():
                # Use <= (less than or equal) instead of <
                if entry.quantity <= entry.product.reorder_threshold:
                    result.append(entry.product)
        return result
    
    def get_total_value(self) -> Decimal:
        """Calculate total inventory value using Decimal for accuracy. Returns Decimal('0.00') for empty inventory."""
        total = Decimal("0.00")
        with self._lock:
            for entry in self.stock.values():
                # Ensure price is Decimal and quantity is int
                price = entry.product.price if isinstance(entry.product.price, Decimal) else Decimal(str(entry.product.price))
                total += price * entry.quantity
        return total.quantize(Decimal("0.01"))  # Round to cents
    
    def bulk_remove(self, removals: Dict[str, int]) -> bool:
        """Atomically remove stock from multiple products. Validates all first, then applies all or none."""
        # Validate all quantities first
        for sku, quantity in removals.items():
            self._validate_quantity(quantity)
        
        # Normalize all SKUs and validate all exist and have sufficient stock
        normalized_removals = {}
        with self._lock:
            for sku, quantity in removals.items():
                normalized_sku = self._normalize_sku(sku)
                key = self._get_stock_key(normalized_sku)
                
                if key not in self.stock:
                    return False  # One SKU doesn't exist - abort
                
                entry = self.stock[key]
                if entry.quantity < quantity:
                    return False  # Insufficient stock - abort
                
                normalized_removals[normalized_sku] = quantity
            
            # All validations passed - apply all removals
            for normalized_sku, quantity in normalized_removals.items():
                key = self._get_stock_key(normalized_sku)
                entry = self.stock[key]
                entry.quantity -= quantity
                entry.last_updated = datetime.now()
                
                self.transaction_log.log_transaction(
                    sku=normalized_sku,
                    quantity_change=-quantity,
                    operation="REMOVE"
                )
        
        return True
    
    def get_low_stock_items(self, threshold: int = None) -> List[StockEntry]:
        """Get all stock entries below a threshold. Uses product's reorder_threshold if threshold not provided."""
        result = []
        with self._lock:
            for entry in self.stock.values():
                check_threshold = threshold if threshold is not None else entry.product.reorder_threshold
                if entry.quantity < check_threshold:
                    result.append(entry)
        return result

