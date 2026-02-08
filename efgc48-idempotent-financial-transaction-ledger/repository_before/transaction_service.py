# ----------------------------
# Exceptions
# ----------------------------
class ProcessingException(Exception):
    pass

class InsufficientFundsException(Exception):
    pass

# ----------------------------
# Mock IdempotencyStore (minimal mock for test compatibility)
# ----------------------------
class MockIdempotencyStore:
    """Minimal mock for compatibility with tests that expect idempotency_store."""

    def __init__(self):
        self.store = {}

    def get(self, key):
        return self.store.get(key)

    def set(self, key, status, result=None):
        self.store[key] = (status, result)


# ----------------------------
# MockDatabase
# ----------------------------
class MockDatabase:
    """
    Mock DB for basic transaction testing without idempotency.
    """

    def __init__(self):
        self.balances = {}  # account_id -> balance
        self.records = []   # list of transaction records

    def add_account(self, account_id, balance):
        self.balances[account_id] = balance

    def get_balance(self, account_id):
        return self.balances.get(account_id, 0)

    def update_balance(self, account_id, amount):
        self.balances[account_id] = amount

    def record_transaction(self, from_acc, to_acc, amount, key_arg):
        self.records.append({
            'from': from_acc,
            'to': to_acc,
            'amount': amount,
            'key': key_arg
        })


# ----------------------------
# TransactionService
# ----------------------------
class TransactionService:
    def __init__(self, db_session):
        self.db = db_session
        # Mock idempotency_store for compatibility with tests
        self.idempotency_store = MockIdempotencyStore()

    def transfer_funds(self, from_account, to_account, amount, idempotency_key=None):
        balance = self.db.get_balance(from_account)
        if balance >= amount:
            self.db.update_balance(from_account, balance - amount)
            self.db.update_balance(to_account, self.db.get_balance(to_account) + amount)
            return True
        return False
