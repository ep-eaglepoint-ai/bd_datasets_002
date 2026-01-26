from datetime import datetime
from decimal import Decimal
import uuid

class PaymentGateway:
    def charge(self, token: str, amount: Decimal) -> bool:
        if not token or amount <= 0:
            raise ValueError("Invalid payment request")
        # Simulate external dependency
        return amount < Decimal("10000.00")


class TransactionRepository:
    def __init__(self):
        self._storage = []

    def save(self, transaction: dict) -> None:
        if "id" not in transaction:
            raise ValueError("Transaction must have an id")
        self._storage.append(transaction)

    def all(self):
        return list(self._storage)


class PaymentService:
    def __init__(self, gateway: PaymentGateway, repository: TransactionRepository):
        self.gateway = gateway
        self.repository = repository

    def process_payment(
        self,
        user_id: str,
        payment_token: str,
        amount: Decimal,
        discount: Decimal = Decimal("0.00")
    ) -> dict:
        if not user_id:
            raise ValueError("user_id is required")

        if amount <= 0:
            raise ValueError("amount must be positive")

        if discount < 0:
            raise ValueError("discount cannot be negative")

        final_amount = amount - discount
        if final_amount <= 0:
            raise ValueError("final amount must be greater than zero")

        success = self.gateway.charge(payment_token, final_amount)

        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": final_amount,
            "success": success,
            "timestamp": datetime.utcnow()
        }

        self.repository.save(transaction)
        return transaction
