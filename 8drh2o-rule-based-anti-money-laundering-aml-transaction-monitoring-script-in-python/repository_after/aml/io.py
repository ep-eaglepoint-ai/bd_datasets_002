"""I/O helpers for AML package.

Provides CSV ingestion utilities for transactions using only the
Python standard library.
"""

import csv
from datetime import datetime, timezone
from typing import List

from .models import Transaction


REQUIRED_FIELDS = [
    "transaction_id",
    "customer_id",
    "timestamp",
    "amount",
    "currency",
    "transaction_type",
    "channel",
    "origin_country",
    "destination_country",
    "counterparty_id",
]


def _parse_timestamp(value: str) -> datetime:
    """Parse ISO-like timestamp string and return timezone-aware UTC datetime.

    Accepts timestamps with offsets (e.g. +01:00) or terminated by 'Z'.
    If input is naive, it is interpreted as UTC.
    Raises ValueError on parse failure.
    """
    if not value or not value.strip():
        raise ValueError("empty timestamp")
    s = value.strip()
    # Handle trailing Z (Zulu) -> +00:00 for fromisoformat
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except Exception as exc:
        raise ValueError(f"invalid timestamp: {value}") from exc

    if dt.tzinfo is None:
        # assume UTC for naive datetimes
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def read_transactions(path: str) -> List[Transaction]:
    """Read transactions from CSV at `path` and return a chronologically sorted list.

    - Validates presence of required fields per row.
    - Parses `amount` as float and `timestamp` to timezone-aware UTC.
    - Raises `ValueError` on malformed rows.
    """
    transactions: List[Transaction] = []
    with open(path, "r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        # Ensure header contains required fields
        header = reader.fieldnames or []
        for f in REQUIRED_FIELDS:
            if f not in header:
                raise ValueError(f"missing required CSV column: {f}")

        for idx, row in enumerate(reader, start=1):
            try:
                # Validate each required field exists and is non-empty
                for f in REQUIRED_FIELDS:
                    if f not in row or row[f] is None or str(row[f]).strip() == "":
                        raise ValueError(f"missing or empty field '{f}' in row {idx}")

                ts = _parse_timestamp(row["timestamp"])
                amount = float(row["amount"])

                tx = Transaction(
                    transaction_id=str(row["transaction_id"]),
                    customer_id=str(row["customer_id"]),
                    timestamp=ts,
                    amount=amount,
                    currency=str(row["currency"]),
                    transaction_type=str(row["transaction_type"]),
                    channel=str(row["channel"]),
                    origin_country=str(row["origin_country"]),
                    destination_country=str(row["destination_country"]),
                    counterparty_id=str(row["counterparty_id"]),
                )
                transactions.append(tx)
            except ValueError:
                raise
            except Exception as exc:
                raise ValueError(f"malformed row {idx}: {exc}") from exc

    # Stable chronological sort
    transactions.sort(key=lambda t: t.timestamp)
    return transactions

