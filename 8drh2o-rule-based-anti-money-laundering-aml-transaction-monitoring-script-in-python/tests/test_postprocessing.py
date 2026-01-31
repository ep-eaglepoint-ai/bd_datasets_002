import os
import tempfile
import unittest
from datetime import datetime, timezone

from repository_after.aml.models import Alert
from repository_after.aml import postprocess


class PostprocessingTest(unittest.TestCase):
    def make_alert(self, rule_id, severity, ts_str, txid, details="d"):
        ts = datetime.fromisoformat(ts_str).astimezone(timezone.utc)
        return Alert(rule_id=rule_id, severity=severity, timestamp=ts, transaction_id=txid, details=details)

    def test_deduplicate_and_sort(self):
        # Create duplicates and mixed severities/timestamps
        a1 = self.make_alert("R1", "HIGH", "2021-01-01T00:00:00+00:00", "t1", "d1")
        a2 = self.make_alert("R1", "HIGH", "2021-01-01T00:00:00+00:00", "t1", "d1-duplicate")
        a3 = self.make_alert("R2", "MEDIUM", "2021-01-01T00:00:01+00:00", "t2", "d2")
        a4 = self.make_alert("R3", "LOW", "2021-01-01T00:00:00+00:00", "t3", "d3")
        alerts = [a4, a2, a3, a1]

        deduped = postprocess.deduplicate_alerts(alerts)
        # a1 and a2 are duplicates; only first occurrence in input order retained
        self.assertEqual(len([a for a in deduped if a.rule_id == "R1" and a.transaction_id == "t1"]), 1)

        sorted_alerts = postprocess.sort_alerts(deduped)
        # Expect severity order: HIGH, MEDIUM, LOW
        self.assertEqual([a.rule_id for a in sorted_alerts], ["R1", "R2", "R3"])

    def test_export_csv_exact(self):
        a1 = self.make_alert("R1", "HIGH", "2021-01-01T00:00:00+00:00", "t1", "detail1")
        a2 = self.make_alert("R2", "MEDIUM", "2021-01-01T00:00:01+00:00", "t2", "detail2")
        alerts = [a1, a2]

        tf = tempfile.NamedTemporaryFile(mode="r", delete=False, encoding="utf-8")
        tf.close()
        try:
            postprocess.export_alerts_csv(alerts, tf.name)
            with open(tf.name, "r", encoding="utf-8") as fh:
                content = fh.read()
        finally:
            os.remove(tf.name)

        expected = (
            "rule_id,severity,timestamp,transaction_id,details\n"
            "R1,HIGH,2021-01-01T00:00:00Z,t1,detail1\n"
            "R2,MEDIUM,2021-01-01T00:00:01Z,t2,detail2\n"
        )
        self.assertEqual(content, expected)


if __name__ == "__main__":
    unittest.main()
