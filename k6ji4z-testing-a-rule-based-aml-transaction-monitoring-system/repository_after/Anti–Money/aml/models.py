from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional


class TxnType(str, Enum):
    TRANSFER = "transfer"
    CASH_IN = "cash_in"
    CASH_OUT = "cash_out"
    CARD = "card"
    FX = "fx"


@dataclass(frozen=True)
class Transaction:
    txn_id: str
    ts: datetime
    customer_id: str
    account_id: str
    counterparty_id: Optional[str]
    amount: float
    currency: str
    txn_type: TxnType
    channel: str
    direction: str  # "in" or "out"
    country: str
    merchant_category: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if self.ts.tzinfo is None:
            raise ValueError("Transaction.ts must be timezone-aware")
        if self.amount <= 0:
            raise ValueError("Transaction.amount must be positive")
        if self.direction not in {"in", "out"}:
            raise ValueError("Transaction.direction must be 'in' or 'out'")


@dataclass(frozen=True)
class CustomerProfile:
    customer_id: str
    risk_score: float  # 0..1
    segment: str
    residence_country: str
    pep: bool = False
    expected_monthly_volume: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Alert:
    alert_id: str
    ts: datetime
    customer_id: str
    account_id: str
    rule_id: str
    severity: str
    title: str
    rationale: str
    evidence: Dict[str, Any]
    transactions: list[str]
