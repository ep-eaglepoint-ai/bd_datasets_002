from datetime import datetime
from typing import List
from models import Transaction
import uuid


class TransactionLog:
    def __init__(self):
        self.transactions: List[Transaction] = []
        self._current_transaction = Transaction(
            transaction_id="",
            sku="",
            quantity_change=0,
            operation=""
        )
    
    def log_transaction(self, sku: str, quantity_change: int, operation: str, notes: str = None):
        self._current_transaction.transaction_id = str(uuid.uuid4())
        self._current_transaction.sku = sku
        self._current_transaction.quantity_change = quantity_change
        self._current_transaction.operation = operation
        self._current_transaction.timestamp = datetime.now()
        self._current_transaction.notes = notes
        
        self.transactions.append(self._current_transaction)
    
    def get_history(self, sku: str = None) -> List[Transaction]:
        if sku is None:
            return self.transactions
        return [t for t in self.transactions if t.sku == sku]
    
    def get_transaction_count(self) -> int:
        return len(self.transactions)
    
    def clear_history(self):
        self.transactions = []

