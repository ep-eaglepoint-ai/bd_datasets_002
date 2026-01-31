from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from decimal import Decimal


@dataclass
class Product:
    sku: str
    name: str
    price: Decimal  # Changed from float to Decimal for monetary accuracy
    reorder_threshold: int = 10
    
    
@dataclass
class StockEntry:
    product: Product
    quantity: int
    last_updated: datetime = None
    
    def __post_init__(self):
        if self.last_updated is None:
            self.last_updated = datetime.now()


@dataclass 
class Transaction:
    transaction_id: str
    sku: str
    quantity_change: int
    operation: str
    timestamp: datetime = field(default_factory=datetime.now)  # Set at creation time
    notes: Optional[str] = None

