
import unittest
import sys
import os
from datetime import datetime, timedelta, timezone

# Add the source directory to the path so we can import 'aml'
# Assuming structure: repository_after/tests/test_aml_monitoring.py
#                     repository_after/Anti–Money/aml/
current_dir = os.path.dirname(os.path.abspath(__file__))
# We might be running from /app/repository_X (CWD) or /app/tests
# The 'aml' package is inside "Anti–Money" folder in the repository root.
# We check CWD first.
cwd = os.getcwd()
potential_paths = [
    os.path.join(cwd, "Anti–Money"),
    os.path.join(current_dir, "..", "Anti–Money"), # Fallback if in repo_after/tests
    os.path.join(current_dir, "..", "repository_after", "Anti–Money"), # Fallback if in root tests and repo_after exists
    os.path.join(current_dir, "..", "repository_before", "Anti–Money"), # Fallback
]

added = False
for p in potential_paths:
    if os.path.exists(p):
        if p not in sys.path:
            sys.path.append(p)
            added = True
            break


try:
    from aml.config import MonitoringConfig
    from aml.engine import TransactionMonitor
    from aml.models import CustomerProfile, Transaction, TxnType
    from aml.rules import (
        StructuringSmurfingRule,
        RapidInOutTurnoverRule,
        CounterpartyDispersionRule,
        HighRiskGeoRule,
        PeerOutflowAnomalyRule,
    )
except ImportError:
    # Fallback if the directory name assumes standard ascii or different structure
    # Try finding 'aml' package by walking if needed, but strict path is preferred for speed
    raise

class TestAMLSystem(unittest.TestCase):
    def setUp(self):
        self.config = MonitoringConfig()
        # Initialize with all rules
        self.rules = [
            StructuringSmurfingRule(),
            RapidInOutTurnoverRule(),
            CounterpartyDispersionRule(),
            HighRiskGeoRule(),
            PeerOutflowAnomalyRule(),
        ]
        self.monitor = TransactionMonitor(self.config, self.rules)
        self.base_time = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

    def tearDown(self):
        """Ensure test isolation by cleaning up monitor state after each test."""
        self.monitor = None

    def make_customer(self, id="C001", risk=0.5, segment="retail", country="US"):
        return CustomerProfile(
            customer_id=id,
            risk_score=risk,
            segment=segment,
            residence_country=country,
            pep=False,
            expected_monthly_volume=10000.0
        )

    def make_txn(self, txn_id, time_offset_hours, amount, type=TxnType.TRANSFER, 
                 direction="out", counterparty="CP1", country="US", customer_id="C001"):
        ts = self.base_time + timedelta(hours=time_offset_hours)
        return Transaction(
            txn_id=txn_id,
            ts=ts,
            customer_id=customer_id,
            account_id=f"ACC_{customer_id}",
            counterparty_id=counterparty,
            amount=float(amount),
            currency="USD",
            txn_type=type,
            channel="online",
            direction=direction,
            country=country
        )

    def test_01_runtime_and_empty_state(self):
        """Req 1: Process transactions without runtime errors."""
        c = self.make_customer()
        t = self.make_txn("T1", 0, 100.0)
        alerts = self.monitor.process(t, c)
        self.assertIsInstance(alerts, list)
        self.assertEqual(len(alerts), 0)

    def test_structuring_smurfing_rule(self):
        """Req 2, 3: Structuring rule (positive and negative)."""
        c = self.make_customer()
        
        # Negative: Single large transaction (above threshold? No, acts on sequence)
        # Assuming rule logic: Multiple small txns just below reporting threshold (e.g. 10k)
        
        # Positive Case: 
        # Create a sequence of cash-out transactions somewhat below typical 10k threshold
        # occurring within a short window (e.g. 24h)
        alerts = []
        for i in range(5):
            t = self.make_txn(f"S_POS_{i}", i, 9500.0, type=TxnType.CASH_OUT, direction="out")
            alerts.extend(self.monitor.process(t, c))
        
        # Should trigger eventually (min_count=5)
        
        # Verify Alert Content (Req 5)
        structuring_alerts = [a for a in alerts if isinstance(a.rule_id, str) and ("structuring" in a.rule_id.lower() or "smurf" in a.rule_id.lower())]
        self.assertTrue(len(structuring_alerts) > 0, "Structuring rule failed to trigger")
        
        a = structuring_alerts[0]
        self.assertTrue(hasattr(a, 'rule_id'))
        self.assertTrue(hasattr(a, 'severity'))
        self.assertTrue(hasattr(a, 'transactions'))
        self.assertIn("S_POS_0", a.transactions) # Should contain early txns in evidence

        # Negative Case: Transactions spaced out by days
        c2 = self.make_customer("C002")
        self.monitor_neg = TransactionMonitor(self.config, [StructuringSmurfingRule()]) # Isolated
        alerts_neg = []
        for i in range(5):
            # 25 hours apart
            t = self.make_txn(f"S_NEG_{i}", i*25, 9500.0, type=TxnType.CASH_OUT, direction="out", customer_id="C002")
            alerts_neg.extend(self.monitor_neg.process(t, c2))
        
        self.assertEqual(len(alerts_neg), 0, "Structuring triggered widely spaced transactions")

    def test_rapid_in_out_turnover(self):
        """Req 2: Rapid In/Out Turnover."""
        c = self.make_customer("C_RAPID")
        # Big Inflow
        t_in = self.make_txn("T_IN", 0, 50000.0, direction="in")
        self.monitor.process(t_in, c)
        
        # Rapid Outflow (e.g. within 2 hours)
        t_out = self.make_txn("T_OUT", 1, 45000.0, direction="out")
        alerts = self.monitor.process(t_out, c)
        
        found = False
        for a in alerts:
            if "rapid" in a.rule_id.lower() or "turnover" in a.rule_id.lower():
                found = True
        self.assertTrue(found, "Rapid turnover failed to trigger")

    def test_high_risk_geo(self):
        """Req 2, 3: High Risk Geo."""
        # Positive
        c = self.make_customer()
        # Min amount is 5000
        # Note: Test assumes 'IR' is in the system's configured high-risk country list
        t = self.make_txn("T_HighRisk", 0, 6000.0, country="IR")
        alerts = self.monitor.process(t, c)
        self.assertTrue(any("geo" in a.rule_id.lower() for a in alerts))

        # Negative
        t_safe = self.make_txn("T_Safe", 1, 6000.0, country="US")
        alerts = self.monitor.process(t_safe, c)
        self.assertFalse(any("geo" in a.rule_id.lower() for a in alerts))

    def test_multiple_rules_single_scenario(self):
        """Req 4: Multiple rules trigger from same scenario."""
        # Scenario: Structuring (series of cashouts) AND High Risk Geo on the final one
        c = self.make_customer("C_MULTI")
        
        # Load up the structuring buffer
        for i in range(5):
            self.monitor.process(self.make_txn(f"M_{i}", i, 9500.0, type=TxnType.CASH_OUT, country="US", customer_id="C_MULTI"), c)
            
        # Trigger event: Cash out, High Risk Country, Structuring threshold hit
        # Amount > 5000 for Geo
        t_trigger = self.make_txn("M_TRIGGER", 6, 9500.0, type=TxnType.CASH_OUT, country="IR", customer_id="C_MULTI")
        alerts = self.monitor.process(t_trigger, c)
        
        rule_ids = {a.rule_id for a in alerts}
        # Expecting at least Structuring and HighRiskGeo
        # Matching approximate IDs based on typical conventions or rule names
        has_structuring = any("structuring" in r.lower() for r in rule_ids)
        has_geo = any("geo" in r.lower() for r in rule_ids)
        
        self.assertTrue(has_structuring, "Structuring not triggered in multi-scenario")
        self.assertTrue(has_geo, "Geo not triggered in multi-scenario")

    def test_sliding_window_pruning(self):
        """Req 6, 7: Validation of sliding window and exclusion of old txns."""
        c = self.make_customer("C_WINDOW")
        
        # T1: Very old transaction (e.g. 5 days ago)
        t_old = self.make_txn("T_OLD", -120, 9500.0, type=TxnType.CASH_OUT, customer_id="C_WINDOW")
        self.monitor.process(t_old, c)
        
        # Process a sequence that WOULD trigger structuring if T_OLD was included
        # Rule needs 5 txns.
        # We provide 4 new ones.
        # If T_OLD is kept, total 5 -> Alert.
        # If T_OLD is pruned, total 4 -> No Alert.
        
        alerts = []
        for i in range(4):
            t = self.make_txn(f"T_NEW_{i}", i, 9500.0, type=TxnType.CASH_OUT, customer_id="C_WINDOW")
            alerts.extend(self.monitor.process(t, c))
            
        # Should NOT trigger structuring if T_OLD is pruned/ignored
        has_structuring = any("structuring" in a.rule_id.lower() for a in alerts)
        self.assertFalse(has_structuring, "Old transaction was incorrectly included in window")

    def test_counterparty_dispersion(self):
        """Req 2: Counterparty Dispersion (many unique counterparties)."""
        c = self.make_customer("C_DISP")
        alerts = []
        # Send to many unique counterparties
        # Min total outflow 20000. So 15 * 2000 = 30000.
        for i in range(15): # Assuming threshold is around 10
            t = self.make_txn(f"T_DISP_{i}", i, 2000.0, counterparty=f"CP_{i}", customer_id="C_DISP")
            alerts.extend(self.monitor.process(t, c))
            
        self.assertTrue(any("dispersion" in a.rule_id.lower() for a in alerts))

    def test_repeated_counterparty_counting(self):
        """Req 8: Repeated transactions to same counterparty not counted as unique."""
        c = self.make_customer("C_REPEAT")
        alerts = []
        # Send 20 txns to SAME counterparty
        for i in range(20):
            t = self.make_txn(f"T_REP_{i}", i, 2000.0, counterparty="SAME_CP", customer_id="C_REPEAT")
            alerts.extend(self.monitor.process(t, c))
            
        self.assertFalse(any("dispersion" in a.rule_id.lower() for a in alerts), 
                         "Dispersion triggered on repeated same-counterparty txns")

    def test_peer_outflow_anomaly_with_seeding(self):
        """Req 3 (Peer Seeding): Seed >200 txns, then test anomaly."""
        # Phase 1: Seeding
        # Create a cohort of peers
        peers = []
        for i in range(205):
            p = self.make_customer(f"P{i}", segment="retail")
            peers.append(p)
            # Create standard behavior for peers (e.g., $100-$500 outflow)
            amt = 100.0 + (i % 50) # Deterministic variation
            t = self.make_txn(f"T_PEER_{i}", 0, amt, direction="out", customer_id=f"P{i}")
            self.monitor.process(t, p)
            
        # Phase 2: Test Target Customer (Anomaly)
        c_target = self.make_customer("C_TARGET", segment="retail")
        
        # Normal transaction
        t_norm = self.make_txn("T_TGT_NORM", 1, 300.0, direction="out", customer_id="C_TARGET")
        alerts = self.monitor.process(t_norm, c_target)
        self.assertFalse(any("peer" in a.rule_id.lower() for a in alerts))
        
        # Anomalous transaction (Major outlier vs peers)
        # Peers max is ~150. Min outflow 20000. We send 25000.
        t_anom = self.make_txn("T_TGT_ANOM", 2, 25000.0, direction="out", customer_id="C_TARGET")
        alerts = self.monitor.process(t_anom, c_target)
        self.assertTrue(any("peer" in a.rule_id.lower() for a in alerts), "Peer anomaly failed to trigger on outlier")

if __name__ == "__main__":
    unittest.main()
