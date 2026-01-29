from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Protocol

from aml.models import Alert, CustomerProfile, Transaction
from aml.state import StateStore
from aml.config import MonitoringConfig


@dataclass(frozen=True)
class RuleContext:
    txn: Transaction
    customer: CustomerProfile
    state: StateStore
    now: datetime


@dataclass(frozen=True)
class RuleHit:
    rule_id: str
    severity: str
    title: str
    rationale: str
    evidence: Dict
    txn_ids: List[str]


class Rule(Protocol):
    rule_id: str
    def evaluate(self, ctx: RuleContext) -> Optional[RuleHit]: ...


class TransactionMonitor:
    def __init__(self, config: MonitoringConfig, rules: List[Rule]):
        self.config = config
        self.rules = rules
        self.state = StateStore(config.windows)

    def process(self, txn: Transaction, customer: CustomerProfile) -> List[Alert]:
        self.state.ingest(txn, customer)

        ctx = RuleContext(txn=txn, customer=customer, state=self.state, now=txn.ts)
        hits: List[RuleHit] = []
        for r in self.rules:
            h = r.evaluate(ctx)
            if h:
                hits.append(h)

        alerts: List[Alert] = []
        for h in hits:
            alerts.append(
                Alert(
                    alert_id=str(uuid.uuid4()),
                    ts=txn.ts,
                    customer_id=txn.customer_id,
                    account_id=txn.account_id,
                    rule_id=h.rule_id,
                    severity=h.severity,
                    title=h.title,
                    rationale=h.rationale,
                    evidence=h.evidence,
                    transactions=h.txn_ids,
                )
            )
        return alerts
