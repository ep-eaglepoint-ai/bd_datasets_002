class TransactionService:
    def __init__(self, db_session):
        self.db = db_session

    def transfer_funds(self, from_account, to_account, amount):
        balance = self.db.get_balance(from_account)
        if balance >= amount:
            self.db.update_balance(from_account, balance - amount)
            self.db.update_balance(to_account, self.db.get_balance(to_account) + amount)
            return True
        return False