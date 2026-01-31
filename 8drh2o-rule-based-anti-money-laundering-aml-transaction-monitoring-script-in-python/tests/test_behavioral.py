import unittest
from datetime import datetime, timezone, timedelta

from repository_after.behavioral import evaluate_behavioral
from repository_after.models import Transaction
from repository_after import config


class BehavioralRulesTest(unittest.TestCase):
    def make_tx(self, customer_id, seconds_offset, **kw) -> Transaction:
        base_ts = datetime(2021, 1, 1, 12, 0, tzinfo=timezone.utc)
        ts = base_ts + timedelta(seconds=seconds_offset)
        return Transaction(
            transaction_id=kw.get("transaction_id", f"tx-{customer_id}-{seconds_offset}"),
            customer_id=customer_id,
            timestamp=ts,
            amount=kw.get("amount", 100.0),
            currency=kw.get("currency", "USD"),
            transaction_type=kw.get("transaction_type", "payment"),
            channel=kw.get("channel", "branch"),
            origin_country=kw.get("origin_country", "US"),
            destination_country=kw.get("destination_country", "US"),
            counterparty_id=kw.get("counterparty_id", "cp1"),
        )

    def test_edge_of_window_inclusion(self):
        # Configure small window for test
        window = 60
        old = config.BEHAVIOR_WINDOW_SECONDS
        config.BEHAVIOR_WINDOW_SECONDS = window
        try:
            # Two cash txs exactly window seconds apart should be in same window (inclusive)
            t1 = self.make_tx("C1", 0, amount=5000.0, channel="branch")
            t2 = self.make_tx("C1", window, amount=6000.0, channel="branch")
            alerts = evaluate_behavioral([t1, t2])
            # STRUCTURING should trigger on second tx: sum 11000 >= STRUCTURING_SUM_THRESHOLD
            self.assertTrue(any(a.rule_id == "STRUCTURING" for a in alerts))
        finally:
            config.BEHAVIOR_WINDOW_SECONDS = old

    def test_multiple_alerts_same_window(self):
        # Reset to default window
        window = config.BEHAVIOR_WINDOW_SECONDS
        # Build transactions that will trigger STRUCTURING and FREQUENT_CASH_ACTIVITY
        txs = []
        # create 5 cash txs within window to trigger frequent cash activity
        for i in range(config.FREQUENT_CASH_ACTIVITY_COUNT):
            txs.append(self.make_tx("C2", i * 10, amount=200.0, channel="atm", counterparty_id=f"cp{i}"))
        # Execute
        alerts = evaluate_behavioral(txs)
        # Should have FREQUENT_CASH_ACTIVITY alerts (at least one)
        self.assertTrue(any(a.rule_id == "FREQUENT_CASH_ACTIVITY" for a in alerts))
        # And RAPID_FUNDS_MOVEMENT if distinct counterparties reach threshold
        if config.RAPID_FUNDS_MOVEMENT_COUNT <= config.FREQUENT_CASH_ACTIVITY_COUNT:
            self.assertTrue(any(a.rule_id == "RAPID_FUNDS_MOVEMENT" for a in alerts))

    def test_customer_isolation(self):
        # Two customers: C3 triggers, C4 does not
        txs = []
        # C3: many cash txs
        for i in range(config.FREQUENT_CASH_ACTIVITY_COUNT):
            txs.append(self.make_tx("C3", i * 5, amount=200.0, channel="atm", counterparty_id=f"cp{i}"))
        # C4: sparse
        for i in range(2):
            txs.append(self.make_tx("C4", i * 500, amount=200.0, channel="atm", counterparty_id=f"dp{i}"))

        # Sort global list chronologically to simulate realistic stream
        txs.sort(key=lambda t: t.timestamp)
        alerts = evaluate_behavioral(txs)
        ids_c3 = [a for a in alerts if a.transaction_id.startswith("tx-C3")]
        ids_c4 = [a for a in alerts if a.transaction_id.startswith("tx-C4")]
        self.assertTrue(len(ids_c3) > 0)
        self.assertEqual(len(ids_c4), 0)


if __name__ == "__main__":
    unittest.main()
