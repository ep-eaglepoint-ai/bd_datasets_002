import os
import tempfile
import unittest
from datetime import datetime, timezone

from repository_after.io import read_transactions
from repository_after.models import Transaction


CSV_HEADER = (
    "transaction_id,customer_id,timestamp,amount,currency,transaction_type,channel,origin_country,destination_country,counterparty_id\n"
)


class TransactionIngestionTest(unittest.TestCase):
    def _write_csv(self, content: str) -> str:
        tf = tempfile.NamedTemporaryFile(mode="w", delete=False, encoding="utf-8", newline="")
        try:
            tf.write(CSV_HEADER)
            tf.write(content)
            tf.flush()
            return tf.name
        finally:
            tf.close()

    def test_parsing_and_sorting(self):
        # Three rows out of order and with mixed timezone formats
        rows = (
            "t3,c3,2021-01-01T12:00:00Z,300.0,USD,transfer,online,US,GB,cp3\n"
            "t1,c1,2021-01-01T10:00:00+02:00,100.0,EUR,payment,branch,DE,FR,cp1\n"
            "t2,c2,2021-01-01T08:00:00,200.0,USD,withdrawal,atm,US,US,cp2\n"
        )
        path = self._write_csv(rows)
        try:
            txs = read_transactions(path)
        finally:
            os.remove(path)

        # Sorted by UTC timestamp
        self.assertEqual([t.transaction_id for t in txs], ["t1", "t2", "t3"])

        # All timestamps are timezone-aware UTC
        for t in txs:
            self.assertIsInstance(t.timestamp, datetime)
            self.assertIsNotNone(t.timestamp.tzinfo)
            self.assertEqual(t.timestamp.tzinfo, timezone.utc)

    def test_missing_field_raises(self):
        # Row missing 'amount' value
        rows = (
            "t1,c1,2021-01-01T10:00:00Z,,EUR,payment,branch,DE,FR,cp1\n"
        )
        path = self._write_csv(rows)
        try:
            with self.assertRaises(ValueError):
                read_transactions(path)
        finally:
            os.remove(path)

    def test_invalid_amount_or_timestamp(self):
        # invalid amount
        rows = (
            "t1,c1,2021-01-01T10:00:00Z,notanumber,EUR,payment,branch,DE,FR,cp1\n"
        )
        path = self._write_csv(rows)
        try:
            with self.assertRaises(ValueError):
                read_transactions(path)
        finally:
            os.remove(path)

        # invalid timestamp
        rows = (
            "t1,c1,not-a-date,100.0,EUR,payment,branch,DE,FR,cp1\n"
        )
        path = self._write_csv(rows)
        try:
            with self.assertRaises(ValueError):
                read_transactions(path)
        finally:
            os.remove(path)


if __name__ == "__main__":
    unittest.main()
