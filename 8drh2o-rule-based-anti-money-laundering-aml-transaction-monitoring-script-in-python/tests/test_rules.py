import unittest
from datetime import datetime, timezone

from repository_after.models import Transaction, Alert
from repository_after import rules
from repository_after import config


class RulesTest(unittest.TestCase):
    def make_tx(self, **kw) -> Transaction:
        base = dict(
            transaction_id=kw.get("transaction_id", "tx1"),
            customer_id=kw.get("customer_id", "c1"),
            timestamp=kw.get("timestamp", datetime(2021, 1, 1, 0, 0, tzinfo=timezone.utc)),
            amount=kw.get("amount", 0.0),
            currency=kw.get("currency", "USD"),
            transaction_type=kw.get("transaction_type", "payment"),
            channel=kw.get("channel", "online"),
            origin_country=kw.get("origin_country", "US"),
            destination_country=kw.get("destination_country", "US"),
            counterparty_id=kw.get("counterparty_id", "cp1"),
        )
        return Transaction(**base)

    def test_large_cash_tx_triggers(self):
        tx = self.make_tx(amount=config.LARGE_CASH_TX_THRESHOLD + 1, channel="ATM")
        alerts = rules.evaluate_transaction(tx)
        self.assertTrue(any(a.rule_id == "LARGE_CASH_TX" for a in alerts))

    def test_round_amount_triggers(self):
        tx = self.make_tx(amount=config.ROUND_AMOUNT_MODULO * 3)
        alerts = rules.evaluate_transaction(tx)
        self.assertTrue(any(a.rule_id == "ROUND_AMOUNT" for a in alerts))

    def test_high_risk_geo_triggers(self):
        country = config.HIGH_RISK_COUNTRIES[0]
        tx = self.make_tx(origin_country=country)
        alerts = rules.evaluate_transaction(tx)
        self.assertTrue(any(a.rule_id == "HIGH_RISK_GEO" for a in alerts))

    def test_high_risk_channel_triggers(self):
        channel = config.HIGH_RISK_CHANNELS[0]
        tx = self.make_tx(channel=channel)
        alerts = rules.evaluate_transaction(tx)
        self.assertTrue(any(a.rule_id == "HIGH_RISK_CHANNEL" for a in alerts))

    def test_multiple_alerts_allowed(self):
        # Construct a tx that triggers multiple rules
        country = config.HIGH_RISK_COUNTRIES[0]
        channel = config.HIGH_RISK_CHANNELS[0]
        tx = self.make_tx(amount=config.ROUND_AMOUNT_MODULO * 2, origin_country=country, channel=channel)
        alerts = rules.evaluate_transaction(tx)
        ids = {a.rule_id for a in alerts}
        expected = {"ROUND_AMOUNT", "HIGH_RISK_GEO", "HIGH_RISK_CHANNEL"}
        self.assertTrue(expected.issubset(ids))

    def test_no_false_positives(self):
        tx = self.make_tx(amount=1.23, channel="online", origin_country="US", destination_country="US")
        alerts = rules.evaluate_transaction(tx)
        self.assertEqual(len(alerts), 0)

    def test_deterministic_alerts(self):
        tx = self.make_tx(amount=config.ROUND_AMOUNT_MODULO * 5, origin_country=config.HIGH_RISK_COUNTRIES[0])
        a1 = rules.evaluate_transaction(tx)
        a2 = rules.evaluate_transaction(tx)
        self.assertEqual(a1, a2)


if __name__ == "__main__":
    unittest.main()
