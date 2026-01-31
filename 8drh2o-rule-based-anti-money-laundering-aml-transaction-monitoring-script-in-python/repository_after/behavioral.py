"""Sliding time-window behavioral AML rules.

Implements STRUCTURING, RAPID_FUNDS_MOVEMENT, and FREQUENT_CASH_ACTIVITY
using per-customer deques for O(n) processing per customer.
"""

from collections import defaultdict, deque
from datetime import timedelta
from typing import Dict, Deque, Iterable, List

from .models import Alert, Transaction
from . import config


class _CustomerWindow:
    def __init__(self, window_seconds: int):
        self.window_seconds = window_seconds
        self.deque: Deque[Transaction] = deque()

    def push(self, tx: Transaction):
        self.deque.append(tx)

    def evict_older_than(self, current_ts):
        cutoff = current_ts - timedelta(seconds=self.window_seconds)
        # include transactions with timestamp >= cutoff (inclusive)
        while self.deque and self.deque[0].timestamp < cutoff:
            self.deque.popleft()

    def recent(self) -> Iterable[Transaction]:
        return list(self.deque)


def evaluate_behavioral(transactions: Iterable[Transaction]) -> List[Alert]:
    """Process a chronological iterable of `Transaction` and emit alerts.

    Assumes `transactions` are sorted by timestamp. Returns list of Alerts
    in the order they were emitted (chronological by triggering tx).
    """
    alerts: List[Alert] = []
    per_customer: Dict[str, _CustomerWindow] = defaultdict(lambda: _CustomerWindow(config.BEHAVIOR_WINDOW_SECONDS))

    for tx in transactions:
        cust_id = tx.customer_id
        window = per_customer[cust_id]
        # Evict old transactions (based on current tx timestamp)
        window.evict_older_than(tx.timestamp)

        # Add current tx to the window for evaluation
        window.push(tx)

        recent = window.recent()

        # STRUCTURING: multiple cash channel txs whose sum >= threshold
        try:
            cash_sum = sum(r.amount for r in recent if r.channel.lower() in [c.lower() for c in config.CASH_CHANNELS])
            cash_count = sum(1 for r in recent if r.channel.lower() in [c.lower() for c in config.CASH_CHANNELS])
            # All individual txs must be below max_single to qualify as structuring
            all_below_max = all(r.amount < config.STRUCTURING_MAX_SINGLE_TX for r in recent if r.channel.lower() in [c.lower() for c in config.CASH_CHANNELS])
            if cash_count >= config.STRUCTURING_MIN_TX_COUNT and cash_sum >= config.STRUCTURING_SUM_THRESHOLD and all_below_max:
                alerts.append(
                    Alert(
                        rule_id="STRUCTURING",
                        severity=config.SEVERITY_HIGH,
                        timestamp=tx.timestamp,
                        transaction_id=tx.transaction_id,
                        details=f"{cash_count} cash txs sum={cash_sum} within {config.BEHAVIOR_WINDOW_SECONDS}s",
                    )
                )
        except Exception:
            pass

        # RAPID_FUNDS_MOVEMENT: many distinct counterparties in window
        try:
            distinct_counterparties = {r.counterparty_id for r in recent if r.counterparty_id}
            if len(distinct_counterparties) >= config.RAPID_FUNDS_MOVEMENT_COUNT:
                alerts.append(
                    Alert(
                        rule_id="RAPID_FUNDS_MOVEMENT",
                        severity=config.SEVERITY_MEDIUM,
                        timestamp=tx.timestamp,
                        transaction_id=tx.transaction_id,
                        details=f"{len(distinct_counterparties)} counterparties within window",
                    )
                )
        except Exception:
            pass

        # FREQUENT_CASH_ACTIVITY: many cash txs in window
        try:
            if cash_count >= config.FREQUENT_CASH_ACTIVITY_COUNT:
                alerts.append(
                    Alert(
                        rule_id="FREQUENT_CASH_ACTIVITY",
                        severity=config.SEVERITY_MEDIUM,
                        timestamp=tx.timestamp,
                        transaction_id=tx.transaction_id,
                        details=f"{cash_count} cash txs within window",
                    )
                )
        except Exception:
            pass

    return alerts
