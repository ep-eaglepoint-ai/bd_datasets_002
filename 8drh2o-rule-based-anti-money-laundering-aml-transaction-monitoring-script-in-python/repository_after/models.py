"""Data models for AML package.

Defines the `Transaction` dataclass used by ingestion utilities.
"""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class Transaction:
    """Transaction record.

    Fields correspond to CSV columns from ingestion. `timestamp`
    is a timezone-aware UTC `datetime`.
    """
    transaction_id: str
    customer_id: str
    timestamp: datetime
    amount: float
    currency: str
    transaction_type: str
    channel: str
    origin_country: str
    destination_country: str
    counterparty_id: str


@dataclass
class Alert:
    """Represents an alert emitted by a stateless rule.

    Fields:
    - rule_id: identifier of the rule that fired
    - severity: configured severity label
    - timestamp: the transaction timestamp (timezone-aware UTC)
    - transaction_id: id of the triggering transaction
    - details: human-readable details for the alert
    """
    rule_id: str
    severity: str
    timestamp: datetime
    transaction_id: str
    details: str
