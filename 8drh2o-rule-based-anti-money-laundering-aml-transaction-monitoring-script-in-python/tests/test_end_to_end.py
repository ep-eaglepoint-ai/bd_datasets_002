import os
import tempfile
import unittest
from datetime import datetime, timezone

from repository_after.aml import main as aml_main


CSV_HEADER = (
    "transaction_id,customer_id,timestamp,amount,currency,transaction_type,channel,origin_country,destination_country,counterparty_id\n"
)


class EndToEndTest(unittest.TestCase):
    def _write_csv(self, rows: str) -> str:
        tf = tempfile.NamedTemporaryFile(mode="w", delete=False, encoding="utf-8", newline="")
        try:
            tf.write(CSV_HEADER)
            tf.write(rows)
            tf.flush()
            return tf.name
        finally:
            tf.close()

    def test_pipeline_creates_outputs(self):
        # Create simple CSV with transactions that will trigger some alerts
        rows = (
            "C1-1,C1,2021-01-01T10:00:00Z,15000.0,USD,deposit,branch,US,US,cp1\n"
            "C1-2,C1,2021-01-01T10:30:00Z,5000.0,USD,deposit,branch,US,US,cp2\n"
            "C2-1,C2,2021-01-01T11:00:00Z,200.0,USD,payment,online,US,US,cp3\n"
        )
        input_path = self._write_csv(rows)
        alerts_tf = tempfile.NamedTemporaryFile(mode="r", delete=False, encoding="utf-8")
        alerts_tf.close()
        summary_tf = tempfile.NamedTemporaryFile(mode="r", delete=False, encoding="utf-8")
        summary_tf.close()

        try:
            aml_main.main(input_path, alerts_tf.name, summary_tf.name)

            # Verify files exist and are non-empty
            with open(alerts_tf.name, "r", encoding="utf-8") as fh:
                alerts_content = fh.read()
            with open(summary_tf.name, "r", encoding="utf-8") as fh:
                summary_content = fh.read()

            self.assertIn("rule_id,severity,timestamp,transaction_id,details", alerts_content)
            self.assertIn("customer_id,total_alerts,risk_score,highest_severity", summary_content)

        finally:
            os.remove(input_path)
            os.remove(alerts_tf.name)
            os.remove(summary_tf.name)


if __name__ == "__main__":
    unittest.main()
