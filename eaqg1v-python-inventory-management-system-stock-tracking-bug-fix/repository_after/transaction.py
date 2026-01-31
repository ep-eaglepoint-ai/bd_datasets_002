from datetime import datetime
from typing import List
from models import Transaction
import uuid


class TransactionLog:
    def __init__(self):
        self.transactions: List[Transaction] = []
    
    def log_transaction(self, sku: str, quantity_change: int, operation: str, notes: str = None):
        # Create a NEW Transaction instance for each log entry
        # Timestamp is set at Transaction creation via default_factory
        transaction = Transaction(
            transaction_id=str(uuid.uuid4()),
            sku=sku,
            quantity_change=quantity_change,
            operation=operation,
            notes=notes
        )
        
        self.transactions.append(transaction)
    
    def get_history(self, sku: str = None) -> List[Transaction]:
        if sku is None:
            # Return a copy to prevent external mutation
            return list(self.transactions)
        # Normalize SKU for consistent matching (all stored SKUs are normalized)
        normalized_sku = sku.strip().upper()
        return [t for t in self.transactions if t.sku == normalized_sku]
    
    def get_transaction_count(self) -> int:
        return len(self.transactions)
    
    def clear_history(self):
        self.transactions = []

