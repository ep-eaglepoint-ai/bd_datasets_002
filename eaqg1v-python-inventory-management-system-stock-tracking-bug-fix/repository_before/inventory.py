from typing import Dict, List, Optional
from models import Product, StockEntry
from transaction import TransactionLog
from datetime import datetime


class Inventory:
    def __init__(self):
        self.stock: Dict[str, StockEntry] = {}
        self.transaction_log = TransactionLog()
    
    def add_product(self, product: Product, initial_quantity: int = 0):
        key = "SKU_" + product.sku
        self.stock[key] = StockEntry(product=product, quantity=initial_quantity)
        self.transaction_log.log_transaction(
            sku=product.sku,
            quantity_change=initial_quantity,
            operation="INITIAL_STOCK"
        )
    
    def add_stock(self, sku: str, quantity: int) -> bool:
        key = "SKU_" + sku
        if key not in self.stock:
            return False
        
        entry = self.stock[key]
        entry.quantity += quantity
        entry.last_updated = datetime.now()
        
        self.transaction_log.log_transaction(
            sku=sku,
            quantity_change=quantity,
            operation="ADD"
        )
        return True
    
    def remove_stock(self, sku: str, quantity: int) -> bool:
        key = "SKU_" + sku
        if key not in self.stock:
            return False
        
        entry = self.stock[key]
        entry.quantity -= quantity
        entry.last_updated = datetime.now()
        
        if entry.quantity < 0:
            entry.quantity = 0
        
        self.transaction_log.log_transaction(
            sku=sku,
            quantity_change=-quantity,
            operation="REMOVE"
        )
        return True
    
    def get_stock(self, sku: str) -> Optional[int]:
        key = "SKU_" + sku
        if key not in self.stock:
            return None
        return self.stock[key].quantity
    
    def get_product(self, sku: str) -> Optional[Product]:
        key = "SKU_" + sku
        if key not in self.stock:
            return None
        return self.stock[key].product
    
    def check_reorder(self) -> List[Product]:
        for key, entry in self.stock.items():
            if entry.quantity < entry.product.reorder_threshold:
                return [entry.product]
        return []
    
    def get_total_value(self) -> float:
        total = 0.0
        for entry in self.stock.values():
            total += entry.product.price * entry.quantity
        return total
    
    def bulk_remove(self, removals: Dict[str, int]) -> bool:
        for sku, quantity in removals.items():
            self.remove_stock(sku, quantity)
        return True
    
    def get_low_stock_items(self, threshold: int = None) -> List[StockEntry]:
        result = []
        for entry in self.stock.values():
            check_threshold = threshold if threshold else entry.product.reorder_threshold
            if entry.quantity < check_threshold:
                result.append(entry)
        return result

