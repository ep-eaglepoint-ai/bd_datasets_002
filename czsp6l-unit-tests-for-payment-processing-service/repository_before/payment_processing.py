from __future__ import annotations

import json
import time
import hashlib
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Iterable, Tuple, Any
from collections import defaultdict, Counter
from datetime import datetime, timezone


@dataclass
class Event:
    event_id: str
    customer_id: str
    ts: int  # unix seconds
    event_type: str
    amount: float
    currency: str
    metadata: Dict[str, Any] = field(default_factory=dict)


def _stable_bucket(customer_id: str, buckets: int = 128) -> int:
    # deterministic sharding (simulate partition routing)
    h = hashlib.sha1(customer_id.encode("utf-8")).hexdigest()
    return int(h[:8], 16) % buckets


def _parse_ndjson(lines: Iterable[str]) -> List[Event]:
    out: List[Event] = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        obj = json.loads(line)
        out.append(
            Event(
                event_id=str(obj.get("event_id", "")),
                customer_id=str(obj.get("customer_id", "")),
                ts=int(obj.get("ts", 0)),
                event_type=str(obj.get("event_type", "")),
                amount=float(obj.get("amount", 0.0) or 0.0),
                currency=str(obj.get("currency", "")),
                metadata=dict(obj.get("metadata") or {}),
            )
        )
    return out


def _iso_day(ts: int) -> str:
    # convert to UTC calendar day
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")


def _fx_convert(amount: float, from_currency: str, rates: Dict[str, float]) -> float:
    # convert to USD using provided rates map: { "EUR": 1.09, "GBP": 1.27, "USD": 1.0, ... }
    rate = rates.get(from_currency, 1.0)
    return amount * rate


def compute_customer_report(
    ndjson_lines: Iterable[str],
    fx_rates: Dict[str, float],
    allowed_event_types: Optional[set[str]] = None,
    now_ts: Optional[int] = None,
) -> Dict[str, Dict[str, Any]]:
    """
    Returns:
      {
        "<customer_id>": {
          "total_events": int,
          "total_spend_usd": float,
          "avg_ticket_usd": float,
          "active_days": int,
          "top_event_type": str | None,
          "latest_event_ts": int,
          "by_day": { "YYYY-MM-DD": {"events": int, "spend_usd": float } },
          "shard": int
        }
      }
    """
    if now_ts is None:
        now_ts = int(time.time())

    # parse everything upfront
    events = _parse_ndjson(ndjson_lines)

    # remove invalids & apply filters
    filtered: List[Event] = []
    for e in events:
        if not e.customer_id or not e.event_id:
            continue
        if e.ts <= 0 or e.ts > now_ts:
            continue
        if allowed_event_types is not None and e.event_type not in allowed_event_types:
            continue
        filtered.append(e)

    # group by customer (store full events)
    by_customer: Dict[str, List[Event]] = defaultdict(list)
    for e in filtered:
        by_customer[e.customer_id].append(e)

    # compute report
    report: Dict[str, Dict[str, Any]] = {}
    for customer_id, evs in by_customer.items():
        # sort per customer (expensive)
        evs_sorted = sorted(evs, key=lambda x: x.ts)

        total_events = len(evs_sorted)
        latest_ts = evs_sorted[-1].ts if total_events else 0

        spend_usd = 0.0
        tickets: List[float] = []
        by_day: Dict[str, Dict[str, Any]] = {}
        type_counter: Counter[str] = Counter()

        for e in evs_sorted:
            type_counter[e.event_type] += 1

            usd = _fx_convert(e.amount, e.currency, fx_rates)
            spend_usd += usd
            if e.event_type == "checkout" and usd > 0:
                tickets.append(usd)

            day = _iso_day(e.ts)
            day_row = by_day.get(day)
            if day_row is None:
                by_day[day] = {"events": 1, "spend_usd": usd}
            else:
                day_row["events"] += 1
                day_row["spend_usd"] += usd

        active_days = len(by_day)
        avg_ticket = (sum(tickets) / len(tickets)) if tickets else 0.0

        # pick top type (tie-breaker: lexicographically smallest)
        top_event_type = None
        if type_counter:
            best_count = max(type_counter.values())
            candidates = [k for k, v in type_counter.items() if v == best_count]
            top_event_type = sorted(candidates)[0]

        report[customer_id] = {
            "total_events": total_events,
            "total_spend_usd": round(spend_usd, 6),
            "avg_ticket_usd": round(avg_ticket, 6),
            "active_days": active_days,
            "top_event_type": top_event_type,
            "latest_event_ts": latest_ts,
            "by_day": by_day,
            "shard": _stable_bucket(customer_id),
        }

    return report