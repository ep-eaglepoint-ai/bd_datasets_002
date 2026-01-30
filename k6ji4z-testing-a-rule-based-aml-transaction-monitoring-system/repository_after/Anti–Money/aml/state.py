from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
from typing import Dict, List, Tuple

from aml.models import Transaction, CustomerProfile


@dataclass
class WindowStats:
    # (ts, amount, direction, txn_id, counterparty_id)
    amounts: deque = field(default_factory=deque)
    total_in: float = 0.0
    total_out: float = 0.0
    count_in: int = 0
    count_out: int = 0
    unique_counterparties_out: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    unique_counterparties_in: Dict[str, int] = field(default_factory=lambda: defaultdict(int))

    def prune(self, cutoff: datetime):
        while self.amounts and self.amounts[0][0] < cutoff:
            ts, amt, direction, txn_id, cpty = self.amounts.popleft()
            if direction == "in":
                self.total_in -= amt
                self.count_in -= 1
                if cpty:
                    self.unique_counterparties_in[cpty] -= 1
                    if self.unique_counterparties_in[cpty] <= 0:
                        del self.unique_counterparties_in[cpty]
            else:
                self.total_out -= amt
                self.count_out -= 1
                if cpty:
                    self.unique_counterparties_out[cpty] -= 1
                    if self.unique_counterparties_out[cpty] <= 0:
                        del self.unique_counterparties_out[cpty]

    def add(self, txn: Transaction):
        self.amounts.append((txn.ts, txn.amount, txn.direction, txn.txn_id, txn.counterparty_id))
        if txn.direction == "in":
            self.total_in += txn.amount
            self.count_in += 1
            if txn.counterparty_id:
                self.unique_counterparties_in[txn.counterparty_id] += 1
        else:
            self.total_out += txn.amount
            self.count_out += 1
            if txn.counterparty_id:
                self.unique_counterparties_out[txn.counterparty_id] += 1


class StateStore:
    """
    Rolling windows per (customer_id, account_id) + simple segment peer outflow distribution.
    """
    def __init__(self, windows: List[timedelta]):
        self.windows = windows
        self._stats: Dict[Tuple[str, str, timedelta], WindowStats] = {}
        self._segment_outflows: Dict[Tuple[str, timedelta], deque] = defaultdict(deque)  # (segment, window)->(ts, out_amt)

    def _key(self, customer_id: str, account_id: str, window: timedelta):
        return (customer_id, account_id, window)

    def ingest(self, txn: Transaction, customer: CustomerProfile):
        for w in self.windows:
            k = self._key(txn.customer_id, txn.account_id, w)
            stats = self._stats.get(k)
            if stats is None:
                stats = WindowStats()
                self._stats[k] = stats

            cutoff = txn.ts - w
            stats.prune(cutoff)
            stats.add(txn)

            # Peer baseline uses OUT amounts only
            seg_key = (customer.segment, w)
            dq = self._segment_outflows[seg_key]
            dq.append((txn.ts, txn.amount if txn.direction == "out" else 0.0))
            while dq and dq[0][0] < cutoff:
                dq.popleft()

    def get(self, customer_id: str, account_id: str, window: timedelta) -> WindowStats:
        return self._stats.get(self._key(customer_id, account_id, window), WindowStats())

    def segment_outflow_distribution(self, segment: str, window: timedelta) -> List[float]:
        dq = self._segment_outflows.get((segment, window))
        if not dq:
            return []
        return [amt for _, amt in dq if amt > 0]
