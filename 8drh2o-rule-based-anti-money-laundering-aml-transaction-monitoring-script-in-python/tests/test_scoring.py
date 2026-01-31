import os
import tempfile
import unittest

from repository_after.aml.models import Alert
from repository_after.aml import scoring
from repository_after.aml import config


class ScoringTest(unittest.TestCase):
    def make_alert(self, customer, severity, tx_suffix="1"):
        # Create Alert with transaction_id prefixed by customer for extraction
        from datetime import datetime, timezone

        ts = datetime(2021, 1, 1, 0, 0, tzinfo=timezone.utc)
        return Alert(rule_id=f"R-{severity}", severity=severity, timestamp=ts, transaction_id=f"{customer}-{tx_suffix}", details="d")

    def test_aggregation_and_weights(self):
        alerts = []
        # customer A: 2 HIGH
        alerts.append(self.make_alert("A", "HIGH", "1"))
        alerts.append(self.make_alert("A", "HIGH", "2"))
        # customer B: 1 MEDIUM, 2 LOW
        alerts.append(self.make_alert("B", "MEDIUM", "1"))
        alerts.append(self.make_alert("B", "LOW", "2"))
        alerts.append(self.make_alert("B", "LOW", "3"))

        rows = scoring.aggregate_scores(alerts)
        # A should have score 2 * weight(HIGH)
        expected_A_score = 2 * config.SEVERITY_WEIGHTS[config.SEVERITY_HIGH]
        expected_B_score = config.SEVERITY_WEIGHTS[config.SEVERITY_MEDIUM] + 2 * config.SEVERITY_WEIGHTS[config.SEVERITY_LOW]

        # Verify aggregation values and highest severity
        self.assertIn(("A", 2, expected_A_score, config.SEVERITY_HIGH), rows)
        self.assertIn(("B", 3, expected_B_score, config.SEVERITY_MEDIUM), rows)

    def test_deterministic_ordering(self):
        # Create tie in risk_score between A and B but different counts
        # Configure weights to make scores equal
        old_weights = dict(config.SEVERITY_WEIGHTS)
        try:
            config.SEVERITY_WEIGHTS[config.SEVERITY_HIGH] = 10.0
            config.SEVERITY_WEIGHTS[config.SEVERITY_LOW] = 5.0
            alerts = []
            # A: one HIGH -> score 10.0, count 1
            alerts.append(self.make_alert("A", "HIGH", "1"))
            # B: two LOW -> score 10.0, count 2
            alerts.append(self.make_alert("B", "LOW", "1"))
            alerts.append(self.make_alert("B", "LOW", "2"))

            rows = scoring.aggregate_scores(alerts)
            # rows sorted by score DESC, then total_alerts DESC, then customer_id ASC
            # Both have equal score; B has higher count so should appear before A
            self.assertEqual(rows[0][0], "B")
            self.assertEqual(rows[1][0], "A")
        finally:
            config.SEVERITY_WEIGHTS.update(old_weights)

    def test_export_summary_csv(self):
        alerts = [self.make_alert("C", "HIGH", "1"), self.make_alert("C", "LOW", "2")]
        tf = tempfile.NamedTemporaryFile(mode="r", delete=False, encoding="utf-8")
        tf.close()
        try:
            scoring.export_summary_csv(alerts, tf.name)
            with open(tf.name, "r", encoding="utf-8") as fh:
                content = fh.read()
        finally:
            os.remove(tf.name)

        # Expect header and one line for customer C
        expected_score = config.SEVERITY_WEIGHTS[config.SEVERITY_HIGH] + config.SEVERITY_WEIGHTS[config.SEVERITY_LOW]
        expected = (
            "customer_id,total_alerts,risk_score,highest_severity\n"
            f"C,2,{expected_score},{config.SEVERITY_HIGH}\n"
        )
        self.assertEqual(content, expected)


if __name__ == "__main__":
    unittest.main()
